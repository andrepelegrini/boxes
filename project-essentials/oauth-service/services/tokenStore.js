import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Token Store Error', err));

// Initialize connection
async function ensureConnected() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function storeToken(identifier, tokenData) {
  try {
    await ensureConnected();
    
    const key = `oauth:tokens:${identifier}`;
    const value = JSON.stringify({
      ...tokenData,
      storedAt: Date.now()
    });
    
    // Store with 30 day expiry
    await redisClient.setEx(key, 30 * 24 * 60 * 60, value);
    
    logger.info('Token stored', { 
      identifier, 
      provider: tokenData.provider 
    });
  } catch (error) {
    logger.error('Failed to store token', error);
    throw error;
  }
}

export async function getToken(identifier) {
  try {
    await ensureConnected();
    
    const key = `oauth:tokens:${identifier}`;
    const value = await redisClient.get(key);
    
    if (!value) {
      return null;
    }
    
    return JSON.parse(value);
  } catch (error) {
    logger.error('Failed to get token', error);
    throw error;
  }
}

export async function deleteToken(identifier) {
  try {
    await ensureConnected();
    
    const key = `oauth:tokens:${identifier}`;
    await redisClient.del(key);
    
    logger.info('Token deleted', { identifier });
  } catch (error) {
    logger.error('Failed to delete token', error);
    throw error;
  }
}

export async function refreshTokenExpiry(identifier) {
  try {
    await ensureConnected();
    
    const key = `oauth:tokens:${identifier}`;
    // Extend expiry by 30 days
    await redisClient.expire(key, 30 * 24 * 60 * 60);
  } catch (error) {
    logger.error('Failed to refresh token expiry', error);
    throw error;
  }
}