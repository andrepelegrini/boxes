const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const logger = require('../utils/logger');

class SlackService {
  constructor() {
    this.app = null;
    this.webClient = null;
    this.initialized = false;
    this.receiver = null;
  }

  async initialize() {
    try {
      // Check if required Slack credentials are available
      if (!process.env.SLACK_BOT_TOKEN) {
        logger.warn('Slack bot token not found - Slack service will be disabled');
        this.app = null;
        this.receiver = null;
        this.initialized = false;
        return;
      }

      // Initialize Slack app with Socket Mode or HTTP mode
      const useSocketMode = process.env.SLACK_SOCKET_MODE === 'true';
      
      if (useSocketMode) {
        // Socket Mode - for development and simple setups
        this.app = new App({
          token: process.env.SLACK_BOT_TOKEN,
          appToken: process.env.SLACK_APP_TOKEN,
          socketMode: true,
          logger: {
            debug: (...msgs) => logger.debug(msgs.join(' ')),
            info: (...msgs) => logger.info(msgs.join(' ')),
            warn: (...msgs) => logger.warn(msgs.join(' ')),
            error: (...msgs) => logger.error(msgs.join(' ')),
            setLevel: () => {},
            setName: () => {},
          }
        });
      } else {
        // HTTP Mode - for production
        this.app = new App({
          token: process.env.SLACK_BOT_TOKEN,
          signingSecret: process.env.SLACK_SIGNING_SECRET,
          logger: {
            debug: (...msgs) => logger.debug(msgs.join(' ')),
            info: (...msgs) => logger.info(msgs.join(' ')),
            warn: (...msgs) => logger.warn(msgs.join(' ')),
            error: (...msgs) => logger.error(msgs.join(' ')),
            setLevel: () => {},
            setName: () => {},
          }
        });
      }

      // Store receiver for Express routing
      this.receiver = this.app.receiver;

      // Initialize standalone web client for API calls
      this.webClient = new WebClient(process.env.SLACK_BOT_TOKEN);

      // Set up event listeners
      this.setupEventListeners();

      // Set up slash commands
      this.setupSlashCommands();

      // Set up interactive components
      this.setupInteractiveComponents();

      // Start the app
      if (useSocketMode) {
        await this.app.start();
        logger.info('⚡️ Slack app started with Socket Mode');
      } else {
        logger.info('⚡️ Slack app initialized with HTTP Mode');
      }

      this.initialized = true;
      logger.info('✅ Slack service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Slack service:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Listen for messages in channels the bot is in
    this.app.message(async ({ message, say, logger: slackLogger }) => {
      try {
        // Only process messages that aren't from bots
        if (message.subtype !== 'bot_message' && !message.bot_id) {
          logger.info(`Received message in channel ${message.channel}: ${message.text?.substring(0, 50)}...`);
          
          // You can add custom message processing here
          // For example, queue for AI analysis
          await this.queueMessageForAnalysis(message);
        }
      } catch (error) {
        logger.error('Error processing message:', error);
      }
    });

    // Listen for channel join events
    this.app.event('member_joined_channel', async ({ event, logger: slackLogger }) => {
      try {
        if (event.user === process.env.SLACK_BOT_USER_ID) {
          logger.info(`Bot joined channel: ${event.channel}`);
          // You can add custom logic when bot joins a channel
        }
      } catch (error) {
        logger.error('Error processing member_joined_channel event:', error);
      }
    });

    // Listen for app mentions
    this.app.event('app_mention', async ({ event, say }) => {
      try {
        logger.info(`Bot mentioned in channel ${event.channel}: ${event.text}`);
        
        // Simple response to mentions
        await say({
          text: `Hello <@${event.user}>! I'm here to help with project management and task tracking.`,
          thread_ts: event.ts
        });
      } catch (error) {
        logger.error('Error processing app mention:', error);
      }
    });
  }

  setupSlashCommands() {
    // /project-status command
    this.app.command('/project-status', async ({ command, ack, respond }) => {
      try {
        await ack();
        
        logger.info(`Project status command received from user ${command.user_id} in channel ${command.channel_id}`);
        
        // Mock project status response
        await respond({
          text: 'Project Status Summary',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Current Project Status:*\n• Active Tasks: 5\n• Completed This Week: 3\n• Upcoming Deadlines: 2'
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'View Details'
                  },
                  action_id: 'view_project_details'
                }
              ]
            }
          ]
        });
      } catch (error) {
        logger.error('Error processing project-status command:', error);
        await respond('Sorry, there was an error processing your request.');
      }
    });

    // /sync-channel command
    this.app.command('/sync-channel', async ({ command, ack, respond }) => {
      try {
        await ack();
        
        logger.info(`Sync channel command received from user ${command.user_id} in channel ${command.channel_id}`);
        
        // Queue channel sync
        const syncResult = await this.queueChannelSync(command.channel_id, command.channel_name);
        
        await respond({
          text: `Channel sync initiated! Job ID: ${syncResult.jobId}`,
          response_type: 'ephemeral'
        });
      } catch (error) {
        logger.error('Error processing sync-channel command:', error);
        await respond('Sorry, there was an error initiating the channel sync.');
      }
    });
  }

  setupInteractiveComponents() {
    // Handle button clicks
    this.app.action('view_project_details', async ({ body, ack, respond }) => {
      try {
        await ack();
        
        logger.info(`Project details button clicked by user ${body.user.id}`);
        
        await respond({
          text: 'Detailed Project Information',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Detailed Project Status:*\n\n*Active Tasks:*\n• Task 1: In Progress\n• Task 2: Review Required\n• Task 3: Waiting for Client\n\n*Recent Activity:*\n• Meeting scheduled for tomorrow\n• Budget approved\n• New team member onboarded'
              }
            }
          ],
          replace_original: true
        });
      } catch (error) {
        logger.error('Error processing view_project_details action:', error);
      }
    });
  }

  // API Methods for external use
  async getChannels() {
    try {
      const result = await this.webClient.conversations.list({
        types: 'public_channel,private_channel',
        limit: 1000
      });
      
      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }
      
      return result.channels;
    } catch (error) {
      logger.error('Error fetching channels:', error);
      throw error;
    }
  }

  async getChannelHistory(channelId, options = {}) {
    try {
      const result = await this.webClient.conversations.history({
        channel: channelId,
        limit: options.limit || 100,
        cursor: options.cursor,
        oldest: options.oldest,
        latest: options.latest,
        inclusive: options.inclusive || true
      });
      
      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }
      
      return {
        messages: result.messages,
        has_more: result.has_more,
        response_metadata: result.response_metadata
      };
    } catch (error) {
      logger.error('Error fetching channel history:', error);
      throw error;
    }
  }

  async joinChannel(channelId) {
    try {
      const result = await this.webClient.conversations.join({
        channel: channelId
      });
      
      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }
      
      logger.info(`Successfully joined channel: ${channelId}`);
      return result.channel;
    } catch (error) {
      logger.error('Error joining channel:', error);
      throw error;
    }
  }

  async sendMessage(channelId, text, options = {}) {
    try {
      const result = await this.webClient.chat.postMessage({
        channel: channelId,
        text: text,
        blocks: options.blocks,
        thread_ts: options.thread_ts,
        reply_broadcast: options.reply_broadcast
      });
      
      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  async getTeamInfo() {
    try {
      const result = await this.webClient.team.info();
      
      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }
      
      return result.team;
    } catch (error) {
      logger.error('Error fetching team info:', error);
      throw error;
    }
  }

  async getUserInfo(userId) {
    try {
      const result = await this.webClient.users.info({
        user: userId
      });
      
      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }
      
      return result.user;
    } catch (error) {
      logger.error('Error fetching user info:', error);
      throw error;
    }
  }

  // Helper methods
  async queueMessageForAnalysis(message) {
    try {
      // This would integrate with the queue service for AI analysis
      const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:3005';
      
      // For now, just log the message
      logger.info(`Queuing message for analysis: ${message.ts} from channel ${message.channel}`);
      
      // TODO: Actually queue the message for AI analysis
      // await axios.post(`${queueServiceUrl}/api/queue/slack/analyze-messages`, {
      //   messages: [message],
      //   analysisType: 'task-detection',
      //   projectContext: { channel: message.channel }
      // });
      
    } catch (error) {
      logger.error('Error queueing message for analysis:', error);
    }
  }

  async queueChannelSync(channelId, channelName) {
    try {
      // This would integrate with the queue service
      const jobId = `sync_${channelId}_${Date.now()}`;
      
      logger.info(`Queuing channel sync for ${channelName} (${channelId})`);
      
      // TODO: Actually queue the channel sync
      // const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:3005';
      // await axios.post(`${queueServiceUrl}/api/queue/slack/sync-channel`, {
      //   channelId,
      //   channelName,
      //   accessToken: process.env.SLACK_BOT_TOKEN
      // });
      
      return { jobId };
    } catch (error) {
      logger.error('Error queueing channel sync:', error);
      throw error;
    }
  }

  isInitialized() {
    return this.initialized;
  }

  async shutdown() {
    if (this.app && this.initialized) {
      await this.app.stop();
      logger.info('Slack app stopped');
    }
    this.initialized = false;
  }
}

module.exports = new SlackService();