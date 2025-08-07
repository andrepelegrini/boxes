import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import { logger } from './utils/logger.js';
import { setupPassportStrategies } from './config/passport.js';
import { authRouter } from './routes/auth.routes.js';
import { oauthRouter } from './routes/oauth.routes.js';
import { rateLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'tauri://localhost',
    'http://localhost:3000',
    'http://localhost:1420'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('✅ Connected to Redis'));

// Initialize session store
async function setupSessions() {
  await redisClient.connect();
  
  app.use(session({
    store: new RedisStore({
      client: redisClient,
      prefix: 'oauth-session:'
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Setup Passport strategies
  setupPassportStrategies();
}

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip
  });
  next();
});

// Rate limiting
app.use('/api/', rateLimiter());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/oauth', oauthRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'oauth-service'
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function startServer() {
  try {
    logger.info('🚀 Starting OAuth Service...');
    
    await setupSessions();
    
    // Check if we should use HTTPS
    const useHttps = process.env.USE_HTTPS === 'true';
    
    if (useHttps) {
      // Try to load SSL certificates
      try {
        const sslOptions = {
          key: fs.readFileSync(process.env.SSL_KEY_PATH || path.join(process.cwd(), 'ssl', 'key.pem')),
          cert: fs.readFileSync(process.env.SSL_CERT_PATH || path.join(process.cwd(), 'ssl', 'cert.pem'))
        };
        
        https.createServer(sslOptions, app).listen(PORT, () => {
          logger.info(`✅ OAuth Service running on HTTPS port ${PORT}`);
          logger.info(`📍 OAuth endpoints available at https://localhost:${PORT}/api/oauth`);
        });
      } catch (sslError) {
        logger.warn('SSL certificates not found, falling back to HTTP:', sslError.message);
        logger.info('To use HTTPS, place SSL certificates in ssl/ directory or set SSL_KEY_PATH and SSL_CERT_PATH');
        
        app.listen(PORT, () => {
          logger.info(`✅ OAuth Service running on HTTP port ${PORT}`);
          logger.info(`📍 OAuth endpoints available at http://localhost:${PORT}/api/oauth`);
        });
      }
    } else {
      app.listen(PORT, () => {
        logger.info(`✅ OAuth Service running on HTTP port ${PORT}`);
        logger.info(`📍 OAuth endpoints available at http://localhost:${PORT}/api/oauth`);
      });
    }
  } catch (error) {
    logger.error('Failed to start OAuth service', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down OAuth Service...');
  await redisClient.quit();
  process.exit(0);
});

startServer();