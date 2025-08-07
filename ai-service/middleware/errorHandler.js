import { logger } from '../utils/logger.js';

function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  
  if (sanitized.messages && Array.isArray(sanitized.messages)) {
    sanitized.messages = sanitized.messages.map(msg => ({
      ...msg,
      text: '[REDACTED]'
    }));
  }
  
  return sanitized;
}

export function errorHandler(err, req, res, next) {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: sanitizeRequestBody(req.body)
  });

  // OpenAI/Anthropic API errors
  if (err.response?.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'AI API rate limit exceeded',
      retryAfter: err.response.headers['retry-after']
    });
  }

  if (err.response?.status === 401) {
    return res.status(500).json({
      success: false,
      error: 'AI API authentication failed - check API keys'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}