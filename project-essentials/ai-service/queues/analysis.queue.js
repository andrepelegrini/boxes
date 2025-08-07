import Bull from 'bull';
import { analyzeTasksFromMessages } from '../chains/taskAnalysis.chain.js';
import { analyzeProjectUpdates } from '../chains/projectUpdate.chain.js';
import { summarizeText } from '../chains/smartSummary.chain.js';
import { logger } from '../utils/logger.js';

// Create queue
export const analysisQueue = new Bull('ai-analysis', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  }
});

// Process jobs
analysisQueue.process('task-analysis', async (job) => {
  logger.info('Processing task analysis job', { jobId: job.id });
  
  const { messages, context, model } = job.data;
  const result = await analyzeTasksFromMessages(messages, context, model);
  
  // Report progress
  job.progress(100);
  
  return result;
});

analysisQueue.process('project-updates', async (job) => {
  logger.info('Processing project update analysis job', { jobId: job.id });
  
  const { messages, project_context, model } = job.data;
  const result = await analyzeProjectUpdates(messages, project_context, model);
  
  job.progress(100);
  
  return result;
});

analysisQueue.process('summarization', async (job) => {
  logger.info('Processing summarization job', { jobId: job.id });
  
  const { text, options } = job.data;
  const result = await summarizeText(text, options);
  
  job.progress(100);
  
  return result;
});

// Event handlers
analysisQueue.on('completed', (job, result) => {
  logger.info('Job completed', { 
    jobId: job.id, 
    type: job.name,
    resultSize: JSON.stringify(result).length 
  });
});

analysisQueue.on('failed', (job, err) => {
  logger.error('Job failed', { 
    jobId: job.id, 
    type: job.name,
    error: err.message 
  });
});

analysisQueue.on('stalled', (job) => {
  logger.warn('Job stalled', { 
    jobId: job.id, 
    type: job.name 
  });
});