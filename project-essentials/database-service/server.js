import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger.js';
import { projectRouter } from './routes/projects.routes.js';
import { taskRouter } from './routes/tasks.routes.js';
import { documentRouter } from './routes/documents.routes.js';
import { eventRouter } from './routes/events.routes.js';
import { slackRouter } from './routes/slack.routes.js';
import { whatsappRouter } from './routes/whatsapp.routes.js';
import { userRouter } from './routes/users.routes.js';
import { settingRouter } from './routes/settings.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'tauri://localhost']
}));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

// Rate limiting
app.use('/api/', rateLimiter());

// Routes
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/documents', documentRouter);
app.use('/api/events', eventRouter);
app.use('/api/slack', slackRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/users', userRouter);
app.use('/api/settings', settingRouter);

// Health check
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'database-service',
      database: 'connected'
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'database-service',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
async function shutdown() {
  logger.info('🛑 Shutting down database service...');
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
async function startServer() {
  try {
    logger.info('🚀 Starting Database Service...');
    
    // Test database connection
    console.log('About to connect to database...');
    await prisma.$connect();
    console.log('Database connected, testing query...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('Query successful, starting server...');
    logger.info('✅ Connected to database');
    
    console.log('About to listen on port', PORT);
    const server = app.listen(PORT, '127.0.0.1', () => {
      console.log('Server listening callback called');
      logger.info(`✅ Database Service running on port ${PORT}`);
      logger.info(`📊 Database API available at http://localhost:${PORT}/api`);
    });
    
    console.log('Server setup complete, waiting for requests...');
    
    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });
    
  } catch (error) {
    logger.error('Failed to start database service', error);
    process.exit(1);
  }
}

startServer();