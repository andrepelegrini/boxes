const express = require('express');
const router = express.Router();
const slackApp = require('../slack/app');
const logger = require('../utils/logger');

// Get list of channels
router.get('/channels', async (req, res) => {
  try {
    const channels = await slackApp.getChannels();
    
    res.json({
      success: true,
      channels: channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        is_member: channel.is_member,
        is_private: channel.is_private,
        topic: channel.topic?.value || '',
        purpose: channel.purpose?.value || '',
        num_members: channel.num_members
      }))
    });
  } catch (error) {
    logger.error('Failed to get channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channels',
      message: error.message
    });
  }
});

// Get channel history
router.get('/channels/:channelId/history', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit, cursor, oldest, latest } = req.query;
    
    const options = {};
    if (limit) options.limit = parseInt(limit);
    if (cursor) options.cursor = cursor;
    if (oldest) options.oldest = oldest;
    if (latest) options.latest = latest;
    
    const history = await slackApp.getChannelHistory(channelId, options);
    
    res.json({
      success: true,
      ...history
    });
  } catch (error) {
    logger.error('Failed to get channel history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel history',
      message: error.message
    });
  }
});

// Join a channel
router.post('/channels/:channelId/join', async (req, res) => {
  try {
    const { channelId } = req.params;
    
    const channel = await slackApp.joinChannel(channelId);
    
    res.json({
      success: true,
      message: 'Successfully joined channel',
      channel: {
        id: channel.id,
        name: channel.name,
        is_member: true
      }
    });
  } catch (error) {
    logger.error('Failed to join channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join channel',
      message: error.message
    });
  }
});

// Send a message to a channel
router.post('/channels/:channelId/message', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { text, blocks, thread_ts, reply_broadcast } = req.body;
    
    if (!text && !blocks) {
      return res.status(400).json({
        success: false,
        error: 'Either text or blocks must be provided'
      });
    }
    
    const result = await slackApp.sendMessage(channelId, text, {
      blocks,
      thread_ts,
      reply_broadcast
    });
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      ts: result.ts,
      channel: result.channel
    });
  } catch (error) {
    logger.error('Failed to send message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error.message
    });
  }
});

// Get team information
router.get('/team', async (req, res) => {
  try {
    const team = await slackApp.getTeamInfo();
    
    res.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        domain: team.domain,
        icon: team.icon
      }
    });
  } catch (error) {
    logger.error('Failed to get team info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team information',
      message: error.message
    });
  }
});

// Get user information
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await slackApp.getUserInfo(userId);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        real_name: user.real_name,
        display_name: user.profile?.display_name || '',
        email: user.profile?.email || '',
        is_bot: user.is_bot,
        is_admin: user.is_admin,
        is_owner: user.is_owner
      }
    });
  } catch (error) {
    logger.error('Failed to get user info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user information',
      message: error.message
    });
  }
});

// Test connection
router.get('/test', async (req, res) => {
  try {
    const team = await slackApp.getTeamInfo();
    
    res.json({
      success: true,
      message: 'Slack connection is working',
      team_name: team.name,
      connected_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Slack connection test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Slack connection test failed',
      message: error.message
    });
  }
});

// Queue channel sync
router.post('/sync/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { channelName, projectId } = req.body;
    
    const result = await slackApp.queueChannelSync(channelId, channelName || channelId);
    
    res.json({
      success: true,
      message: 'Channel sync queued successfully',
      jobId: result.jobId
    });
  } catch (error) {
    logger.error('Failed to queue channel sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue channel sync',
      message: error.message
    });
  }
});

// Analyze messages
router.post('/analyze', async (req, res) => {
  try {
    const { messages, analysisType, projectContext } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }
    
    // Queue messages for analysis
    const jobId = `analysis_${Date.now()}`;
    
    logger.info(`Queuing ${messages.length} messages for ${analysisType || 'general'} analysis`);
    
    // TODO: Integrate with queue service
    // const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:3005';
    // await axios.post(`${queueServiceUrl}/api/queue/slack/analyze-messages`, {
    //   messages,
    //   analysisType: analysisType || 'task-detection',
    //   projectContext
    // });
    
    res.json({
      success: true,
      message: 'Messages queued for analysis',
      jobId,
      messagesCount: messages.length
    });
  } catch (error) {
    logger.error('Failed to queue message analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue message analysis',
      message: error.message
    });
  }
});

module.exports = router;