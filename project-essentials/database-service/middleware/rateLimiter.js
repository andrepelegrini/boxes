import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

export function rateLimiter(options = {}) {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // High limit for database operations
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path
      });
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      });
    }
  };
  
  return rateLimit({ ...defaults, ...options });
}