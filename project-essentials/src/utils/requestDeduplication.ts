/**
 * Request deduplication utility to prevent duplicate API calls
 * and improve performance by caching results
 */

interface RequestCache {
  promise: Promise<any>;
  timestamp: number;
  ttl: number;
}

interface RequestConfig {
  ttl?: number; // Time to live in milliseconds
  key?: string; // Custom cache key
  retries?: number; // Number of retries on failure
  retryDelay?: number; // Delay between retries
}

class RequestDeduplicator {
  private cache = new Map<string, RequestCache>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Deduplicate a request function by caching its promise
   */
  async deduplicate<T>(
    requestFn: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      ttl = this.defaultTTL,
      key = this.generateKey(requestFn),
      retries = 0,
      retryDelay = 1000
    } = config;

    // Check if we have a valid cached result
    const cached = this.cache.get(key);
    if (cached && this.isValid(cached)) {
      return cached.promise;
    }

    // Create new request with retry logic
    const promise = this.executeWithRetries(requestFn, retries, retryDelay);
    
    // Cache the promise
    this.cache.set(key, {
      promise,
      timestamp: Date.now(),
      ttl
    });

    // Clean up cache on completion (success or failure)
    promise.finally(() => {
      // Remove from cache after completion to allow fresh requests
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl);
    });

    return promise;
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetries<T>(
    fn: () => Promise<T>,
    retries: number,
    delay: number
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await this.delay(delay);
        return this.executeWithRetries(fn, retries - 1, delay * 1.5); // Exponential backoff
      }
      throw error;
    }
  }

  /**
   * Check if cached entry is still valid
   */
  private isValid(cached: RequestCache): boolean {
    return Date.now() - cached.timestamp < cached.ttl;
  }

  /**
   * Generate cache key from function
   */
  private generateKey(fn: Function): string {
    return fn.toString().slice(0, 100) + Date.now().toString();
  }

  /**
   * Clear expired entries from cache
   */
  clearExpired(): void {
    for (const [key, cached] of this.cache.entries()) {
      if (!this.isValid(cached)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      totalEntries: this.cache.size,
      validEntries: Array.from(this.cache.values()).filter(cached => this.isValid(cached)).length
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Hook for deduplicating requests in React components
 */
export function useRequestDeduplication() {
  return {
    deduplicate: requestDeduplicator.deduplicate.bind(requestDeduplicator),
    clearExpired: requestDeduplicator.clearExpired.bind(requestDeduplicator),
    getStats: requestDeduplicator.getStats.bind(requestDeduplicator)
  };
}

/**
 * Decorator for automatically deduplicating method calls
 */
export function deduplicate(config: RequestConfig = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}.${JSON.stringify(args)}`;
      
      return requestDeduplicator.deduplicate(
        () => originalMethod.apply(this, args),
        { ...config, key }
      );
    };

    return descriptor;
  };
}

/**
 * Specialized deduplication for Tauri commands
 */
export function deduplicateInvoke<T>(
  command: string,
  payload?: any,
  config: RequestConfig = {}
): Promise<T> {
  const key = `tauri.${command}.${JSON.stringify(payload)}`;
  
  return requestDeduplicator.deduplicate(
    async () => {
      const { invoke } = await import('../utils/tauri');
      return invoke(command, payload);
    },
    { ...config, key }
  );
}

// Clean up expired entries every 10 minutes
setInterval(() => {
  requestDeduplicator.clearExpired();
}, 10 * 60 * 1000);