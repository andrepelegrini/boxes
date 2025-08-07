import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { aiRouter } from './routes/ai.routes.js';
import { logger } from './utils/logger.js';
import { initializeQueues } from './queues/index.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'tauri://localhost']
}));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware (reduced verbosity)
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/ai', aiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ai-service',
    version: '1.0.0'
  });
});

// Error handling
app.use(errorHandler);

// Initialize background queues
async function startServer() {
  try {
    logger.info('🚀 Initializing AI Service...');
    
    // Initialize Bull queues for background processing
    await initializeQueues();
    
    app.listen(PORT, () => {
      logger.info(`✅ AI Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start AI service', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down AI Service...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Shutting down AI Service...');
  process.exit(0);
});

startServer();