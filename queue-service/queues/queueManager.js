const Queue = require('bull');
const Redis = require('redis');
const logger = require('../utils/logger');

class QueueManager {
  constructor() {
    this.redis = null;
    this.queues = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Initialize Redis connection
      this.redis = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });

      this.redis.on('error', (err) => {
        logger.error('Redis connection error:', err);
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      await this.redis.connect();

      // Initialize queues
      this.createQueue('slack-sync', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      this.createQueue('ai-analysis', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 5,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      });

      this.createQueue('whatsapp-sync', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      // Set up queue processors
      this.setupProcessors();

      this.isInitialized = true;
      logger.info('Queue manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize queue manager:', error);
      throw error;
    }
  }

  createQueue(name, options = {}) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    const queue = new Queue(name, options);
    
    // Set up queue event listeners
    queue.on('completed', (job) => {
      logger.info(`Job ${job.id} in queue ${name} completed`);
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} in queue ${name} failed:`, err);
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} in queue ${name} stalled`);
    });

    this.queues.set(name, queue);
    return queue;
  }

  setupProcessors() {
    // Slack sync processor
    const slackQueue = this.getQueue('slack-sync');
    slackQueue.process('channel-sync', 5, require('./processors/slackProcessor').processChannelSync);
    slackQueue.process('message-analysis', 3, require('./processors/slackProcessor').processMessageAnalysis);

    // AI analysis processor
    const aiQueue = this.getQueue('ai-analysis');
    aiQueue.process('task-detection', 2, require('./processors/aiProcessor').processTaskDetection);
    aiQueue.process('project-update', 2, require('./processors/aiProcessor').processProjectUpdate);

    // WhatsApp sync processor
    const whatsappQueue = this.getQueue('whatsapp-sync');
    whatsappQueue.process('message-sync', 3, require('./processors/whatsappProcessor').processMessageSync);
    whatsappQueue.process('ai-analysis', 2, require('./processors/whatsappProcessor').processAIAnalysis);

    logger.info('Queue processors set up successfully');
  }

  getQueue(name) {
    if (!this.queues.has(name)) {
      throw new Error(`Queue ${name} not found`);
    }
    return this.queues.get(name);
  }

  async addJob(queueName, jobType, data, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.add(jobType, data, options);
      
      logger.info(`Job ${job.id} added to queue ${queueName} with type ${jobType}`);
      return {
        id: job.id,
        queue: queueName,
        type: jobType,
        status: 'queued',
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}:`, error);
      throw error;
    }
  }

  async getJobStatus(queueName, jobId) {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);
      
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      const progress = job.progress();
      
      return {
        id: job.id,
        queue: queueName,
        type: job.name,
        status: state,
        progress: progress,
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        createdAt: new Date(job.timestamp).toISOString(),
        processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
      };
    } catch (error) {
      logger.error(`Failed to get job status for ${jobId} in queue ${queueName}:`, error);
      throw error;
    }
  }

  async getActiveJobs(queueName) {
    try {
      const queue = this.getQueue(queueName);
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(0, 10),
        queue.getFailed(0, 10)
      ]);

      return {
        waiting: waiting.map(job => ({
          id: job.id,
          type: job.name,
          data: job.data,
          createdAt: new Date(job.timestamp).toISOString()
        })),
        active: active.map(job => ({
          id: job.id,
          type: job.name,
          data: job.data,
          progress: job.progress(),
          createdAt: new Date(job.timestamp).toISOString()
        })),
        completed: completed.map(job => ({
          id: job.id,
          type: job.name,
          result: job.returnvalue,
          finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
        })),
        failed: failed.map(job => ({
          id: job.id,
          type: job.name,
          failedReason: job.failedReason,
          failedAt: job.failedOn ? new Date(job.failedOn).toISOString() : null
        }))
      };
    } catch (error) {
      logger.error(`Failed to get active jobs for queue ${queueName}:`, error);
      throw error;
    }
  }

  async cancelJob(queueName, jobId) {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }

      await job.remove();
      logger.info(`Job ${jobId} cancelled in queue ${queueName}`);
      
      return { success: true, message: 'Job cancelled successfully' };
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId} in queue ${queueName}:`, error);
      throw error;
    }
  }

  async getQueueStats() {
    const stats = {};
    
    for (const [name, queue] of this.queues) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed()
        ]);

        stats[name] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length
        };
      } catch (error) {
        logger.error(`Failed to get stats for queue ${name}:`, error);
        stats[name] = { error: error.message };
      }
    }

    return stats;
  }

  isConnected() {
    return this.redis && this.redis.isReady && this.isInitialized;
  }

  async shutdown() {
    try {
      logger.info('Shutting down queue manager...');
      
      // Close all queues
      for (const [name, queue] of this.queues) {
        await queue.close();
        logger.info(`Queue ${name} closed`);
      }

      // Close Redis connection
      if (this.redis) {
        await this.redis.quit();
        logger.info('Redis connection closed');
      }

      this.isInitialized = false;
      logger.info('Queue manager shutdown complete');
    } catch (error) {
      logger.error('Error during queue manager shutdown:', error);
      throw error;
    }
  }
}

module.exports = new QueueManager();