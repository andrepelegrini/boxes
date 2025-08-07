import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis State Store Error', err));

async function ensureConnected() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function storeOAuthState(state, data) {
  try {
    await ensureConnected();
    
    const key = `oauth:state:${state}`;
    const value = JSON.stringify(data);
    
    // Store with 10 minute expiry (OAuth flow should complete quickly)
    await redisClient.setEx(key, 600, value);
    
    logger.debug('OAuth state stored', { state });
  } catch (error) {
    logger.error('Failed to store OAuth state', error);
    throw error;
  }
}

export async function validateOAuthState(state) {
  try {
    await ensureConnected();
    
    const key = `oauth:state:${state}`;
    const value = await redisClient.get(key);
    
    if (!value) {
      return null;
    }
    
    // Delete state after validation (one-time use)
    await redisClient.del(key);
    
    return JSON.parse(value);
  } catch (error) {
    logger.error('Failed to validate OAuth state', error);
    throw error;
  }
}