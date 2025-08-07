const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const queueManager = require('./queues/queueManager');
const queueRoutes = require('./routes/queue.routes');

const app = express();
const PORT = process.env.QUEUE_SERVICE_PORT || 3005;

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
    service: 'queue-service',
    timestamp: new Date().toISOString(),
    redis: queueManager.isConnected() ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/queue', queueRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Queue service error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize queue manager and start server
async function startServer() {
  try {
    await queueManager.initialize();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Queue Service running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start queue service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await queueManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await queueManager.shutdown();
  process.exit(0);
});

startServer();