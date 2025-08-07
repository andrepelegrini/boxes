import { analysisQueue } from './analysis.queue.js';
import { logger } from '../utils/logger.js';

export async function initializeQueues() {
  logger.info('Initializing background job queues...');
  
  // Clean up any stuck jobs on startup
  await analysisQueue.clean(1000 * 60 * 60 * 24); // Clean jobs older than 24 hours
  
  logger.info('Background job queues initialized');
  
  return {
    analysisQueue
  };
}

export { analysisQueue };