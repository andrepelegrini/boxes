const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const slackApp = require('./slack/app');
const slackRoutes = require('./routes/slack.routes');

const app = express();
const PORT = process.env.SLACK_SERVICE_PORT || 3006;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:1420', 'http://localhost:3000', 'tauri://localhost'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'slack-service',
    timestamp: new Date().toISOString(),
    slack_connected: slackApp.isInitialized()
  });
});

// API routes
app.use('/api/slack', slackRoutes);

// Slack events endpoint will be set up after initialization

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Slack service error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    // Initialize Slack app
    await slackApp.initialize();
    
    // Set up Slack events endpoint after initialization (only if receiver exists)
    if (slackApp.receiver && slackApp.receiver.router) {
      app.use('/slack/events', slackApp.receiver.router);
      logger.info('Slack events endpoint configured');
    } else {
      logger.warn('Slack events endpoint not configured - missing credentials');
    }
    
    app.listen(PORT, () => {
      logger.info(`🚀 Slack Service running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      if (slackApp.receiver) {
        logger.info(`🔗 Slack events: http://localhost:${PORT}/slack/events`);
      }
    });
  } catch (error) {
    logger.error('Failed to start slack service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await slackApp.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await slackApp.shutdown();
  process.exit(0);
});

startServer();