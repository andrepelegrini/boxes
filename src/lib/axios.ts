import axios from 'axios';

// Service URLs - these should match your running services
export const SERVICE_URLS = {
  DATABASE: 'http://localhost:3004', // Prisma database service
  AI: 'http://localhost:3002', // LangChain.js AI service
  OAUTH: 'http://localhost:3003', // Express + Passport OAuth service
  QUEUE: 'http://localhost:3005', // Bull Queue service
  SLACK: 'http://localhost:3006', // Official Slack SDK service
  WHATSAPP: 'http://localhost:3001', // WhatsApp service
  SOCKET: 'http://localhost:3007' // Socket.io real-time service
};

// Create axios instances for each service
export const databaseApi = axios.create({
  baseURL: SERVICE_URLS.DATABASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const aiApi = axios.create({
  baseURL: SERVICE_URLS.AI,
  timeout: 120000, // AI operations can take longer
  headers: {
    'Content-Type': 'application/json'
  }
});

export const oauthApi = axios.create({
  baseURL: SERVICE_URLS.OAUTH,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const queueApi = axios.create({
  baseURL: SERVICE_URLS.QUEUE,
  timeout: 60000, // Queue operations can take time
  headers: {
    'Content-Type': 'application/json'
  }
});

export const slackApi = axios.create({
  baseURL: SERVICE_URLS.SLACK,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const whatsappApi = axios.create({
  baseURL: SERVICE_URLS.WHATSAPP,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth tokens, logging, etc.
const requestInterceptor = (config: any) => {
  // Add timestamp to requests
  config.metadata = { startTime: new Date() };
  
  // Log outgoing requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      params: config.params,
      data: config.data
    });
  }
  
  return config;
};

// Response interceptor - handle errors, logging, etc.
const responseInterceptor = (response: any) => {
  // Log response time in development
  if (process.env.NODE_ENV === 'development' && response.config.metadata) {
    const duration = new Date().getTime() - response.config.metadata.startTime.getTime();
    console.log(`📥 ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
  }
  
  return response;
};

const errorInterceptor = (error: any) => {
  // Log errors
  if (process.env.NODE_ENV === 'development') {
    console.error(`❌ API Error:`, {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
  }
  
  // Handle specific error cases
  if (error.response?.status === 401) {
    // Handle unauthorized - could redirect to login
    console.warn('Unauthorized request - token may be expired');
  }
  
  if (error.response?.status === 429) {
    // Handle rate limiting
    console.warn('Rate limit exceeded, implementing backoff...');
    const retryAfter = error.response.headers['retry-after'] || 1;
    
    // Return a promise that resolves after the retry delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(axios.request(error.config));
      }, retryAfter * 1000);
    });
  }
  
  return Promise.reject(error);
};

// Apply interceptors to all instances
[databaseApi, aiApi, oauthApi, queueApi, slackApi, whatsappApi].forEach(api => {
  api.interceptors.request.use(requestInterceptor);
  api.interceptors.response.use(responseInterceptor, errorInterceptor);
});

// Helper functions for common operations
export const apiHelpers = {
  // Retry function for failed requests
  async retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retry(fn, retries - 1, delay * 2); // Exponential backoff
      }
      throw error;
    }
  },
  
  // Batch requests with concurrency limit
  async batchRequests<T>(requests: (() => Promise<T>)[], concurrency = 5): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];
    
    for (const request of requests) {
      const promise = request().then(result => {
        results.push(result);
      });
      
      executing.push(promise);
      
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }
    
    await Promise.all(executing);
    return results;
  }
};

export default {
  database: databaseApi,
  ai: aiApi,
  oauth: oauthApi,
  queue: queueApi,
  slack: slackApi,
  whatsapp: whatsappApi,
  helpers: apiHelpers
};