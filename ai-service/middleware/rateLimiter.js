import { logger } from '../utils/logger.js';

// Simple in-memory rate limiter
// In production, use Redis-based rate limiting
const requests = new Map();

export function rateLimiter(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100,
    keyGenerator = (req) => req.ip
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Clean old entries
    const cutoff = now - windowMs;
    for (const [k, timestamps] of requests.entries()) {
      const filtered = timestamps.filter(t => t > cutoff);
      if (filtered.length === 0) {
        requests.delete(k);
      } else {
        requests.set(k, filtered);
      }
    }
    
    // Check rate limit
    const timestamps = requests.get(key) || [];
    const recentRequests = timestamps.filter(t => t > cutoff);
    
    if (recentRequests.length >= max) {
      logger.warn('Rate limit exceeded', {
        key,
        requests: recentRequests.length,
        limit: max
      });
      
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }
    
    // Add current request
    recentRequests.push(now);
    requests.set(key, recentRequests);
    
    next();
  };
}