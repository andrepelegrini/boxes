const express = require('express');
const router = express.Router();
const queueManager = require('../queues/queueManager');
const logger = require('../utils/logger');

// Add a new job to a queue
router.post('/jobs', async (req, res) => {
  try {
    const { queue, type, data, options } = req.body;
    
    if (!queue || !type || !data) {
      return res.status(400).json({
        error: 'Missing required fields: queue, type, data'
      });
    }
    
    const job = await queueManager.addJob(queue, type, data, options);
    
    res.status(201).json({
      success: true,
      job
    });
  } catch (error) {
    logger.error('Failed to add job:', error);
    res.status(500).json({
      error: 'Failed to add job',
      message: error.message
    });
  }
});

// Get job status
router.get('/jobs/:queue/:jobId', async (req, res) => {
  try {
    const { queue, jobId } = req.params;
    
    const status = await queueManager.getJobStatus(queue, jobId);
    
    res.json({
      success: true,
      job: status
    });
  } catch (error) {
    logger.error('Failed to get job status:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message
    });
  }
});

// Get all jobs for a queue
router.get('/jobs/:queue', async (req, res) => {
  try {
    const { queue } = req.params;
    
    const jobs = await queueManager.getActiveJobs(queue);
    
    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    logger.error('Failed to get queue jobs:', error);
    res.status(500).json({
      error: 'Failed to get queue jobs',
      message: error.message
    });
  }
});

// Cancel a job
router.delete('/jobs/:queue/:jobId', async (req, res) => {
  try {
    const { queue, jobId } = req.params;
    
    const result = await queueManager.cancelJob(queue, jobId);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error('Failed to cancel job:', error);
    res.status(500).json({
      error: 'Failed to cancel job',
      message: error.message
    });
  }
});

// Get queue statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await queueManager.getQueueStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    res.status(500).json({
      error: 'Failed to get queue stats',
      message: error.message
    });
  }
});

// Slack-specific endpoints
router.post('/slack/sync-channel', async (req, res) => {
  try {
    const { projectId, channelId, channelName, accessToken, lastTimestamp } = req.body;
    
    const job = await queueManager.addJob('slack-sync', 'channel-sync', {
      projectId,
      channelId,
      channelName,
      accessToken,
      lastTimestamp: lastTimestamp || 0
    }, {
      priority: 5,
      delay: 0
    });
    
    res.status(201).json({
      success: true,
      message: 'Slack channel sync job queued',
      job
    });
  } catch (error) {
    logger.error('Failed to queue Slack sync:', error);
    res.status(500).json({
      error: 'Failed to queue Slack sync',
      message: error.message
    });
  }
});

router.post('/slack/analyze-messages', async (req, res) => {
  try {
    const { messages, analysisType, projectContext } = req.body;
    
    const job = await queueManager.addJob('slack-sync', 'message-analysis', {
      messages,
      analysisType: analysisType || 'task-detection',
      projectContext
    }, {
      priority: 3,
      delay: 0
    });
    
    res.status(201).json({
      success: true,
      message: 'Slack message analysis job queued',
      job
    });
  } catch (error) {
    logger.error('Failed to queue Slack analysis:', error);
    res.status(500).json({
      error: 'Failed to queue Slack analysis',
      message: error.message
    });
  }
});

// AI analysis endpoints
router.post('/ai/detect-tasks', async (req, res) => {
  try {
    const { messages, projectContext, options } = req.body;
    
    const job = await queueManager.addJob('ai-analysis', 'task-detection', {
      messages,
      projectContext,
      options: options || {}
    }, {
      priority: 2,
      delay: 0
    });
    
    res.status(201).json({
      success: true,
      message: 'AI task detection job queued',
      job
    });
  } catch (error) {
    logger.error('Failed to queue AI task detection:', error);
    res.status(500).json({
      error: 'Failed to queue AI task detection',
      message: error.message
    });
  }
});

router.post('/ai/analyze-project-updates', async (req, res) => {
  try {
    const { messages, projectContext, updateType } = req.body;
    
    const job = await queueManager.addJob('ai-analysis', 'project-update', {
      messages,
      projectContext,
      updateType: updateType || 'general'
    }, {
      priority: 2,
      delay: 0
    });
    
    res.status(201).json({
      success: true,
      message: 'AI project update analysis job queued',
      job
    });
  } catch (error) {
    logger.error('Failed to queue AI project analysis:', error);
    res.status(500).json({
      error: 'Failed to queue AI project analysis',
      message: error.message
    });
  }
});

// WhatsApp endpoints
router.post('/whatsapp/sync-messages', async (req, res) => {
  try {
    const { chatId, lastTimestamp, syncType } = req.body;
    
    const job = await queueManager.addJob('whatsapp-sync', 'message-sync', {
      chatId,
      lastTimestamp: lastTimestamp || 0,
      syncType: syncType || 'incremental'
    }, {
      priority: 4,
      delay: 0
    });
    
    res.status(201).json({
      success: true,
      message: 'WhatsApp message sync job queued',
      job
    });
  } catch (error) {
    logger.error('Failed to queue WhatsApp sync:', error);
    res.status(500).json({
      error: 'Failed to queue WhatsApp sync',
      message: error.message
    });
  }
});

router.post('/whatsapp/analyze', async (req, res) => {
  try {
    const { messages, analysisType, context } = req.body;
    
    const job = await queueManager.addJob('whatsapp-sync', 'ai-analysis', {
      messages,
      analysisType: analysisType || 'task-detection',
      context
    }, {
      priority: 3,
      delay: 0
    });
    
    res.status(201).json({
      success: true,
      message: 'WhatsApp AI analysis job queued',
      job
    });
  } catch (error) {
    logger.error('Failed to queue WhatsApp analysis:', error);
    res.status(500).json({
      error: 'Failed to queue WhatsApp analysis',
      message: error.message
    });
  }
});

module.exports = router;