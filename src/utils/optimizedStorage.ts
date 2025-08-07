/**
 * Optimized storage utility to prevent blocking the main thread
 * with synchronous localStorage operations
 */

import React from 'react';

interface StorageOperation {
  key: string;
  value: string;
  timestamp: number;
}

interface StorageConfig {
  debounceMs?: number;
  batchSize?: number;
  useCompression?: boolean;
  fallbackToMemory?: boolean;
}

class OptimizedStorage {
  private pendingWrites = new Map<string, StorageOperation>();
  private writeQueue: StorageOperation[] = [];
  private isProcessing = false;
  private memoryFallback = new Map<string, string>();
  private config: Required<StorageConfig>;
  private writeTimeout?: NodeJS.Timeout;

  constructor(config: StorageConfig = {}) {
    this.config = {
      debounceMs: 500,
      batchSize: 10,
      useCompression: false,
      fallbackToMemory: true,
      ...config
    };
  }

  /**
   * Get item from storage (synchronous, optimized)
   */
  getItem(key: string): string | null {
    try {
      // Check pending writes first
      const pending = this.pendingWrites.get(key);
      if (pending) {
        return pending.value;
      }

      // Try localStorage
      const value = localStorage.getItem(key);
      if (value !== null) {
        return this.config.useCompression ? this.decompress(value) : value;
      }

      // Fallback to memory if enabled
      if (this.config.fallbackToMemory) {
        return this.memoryFallback.get(key) || null;
      }

      return null;
    } catch (error) {
      console.warn('Storage getItem failed:', error);
      return this.config.fallbackToMemory ? this.memoryFallback.get(key) || null : null;
    }
  }

  /**
   * Set item in storage (asynchronous, debounced)
   */
  setItem(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const processedValue = this.config.useCompression ? this.compress(value) : value;
        
        // Add to pending writes (immediate availability)
        this.pendingWrites.set(key, {
          key,
          value: processedValue,
          timestamp: Date.now()
        });

        // Add to memory fallback immediately
        if (this.config.fallbackToMemory) {
          this.memoryFallback.set(key, processedValue);
        }

        // Schedule batched write
        this.scheduleWrite(key, processedValue);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Remove from pending writes
        this.pendingWrites.delete(key);
        
        // Remove from memory fallback
        this.memoryFallback.delete(key);

        // Schedule removal
        this.scheduleWrite(key, null);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear all storage
   */
  clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.pendingWrites.clear();
        this.memoryFallback.clear();
        this.writeQueue = [];
        
        // Use requestIdleCallback if available, otherwise setTimeout
        this.scheduleIdleWork(() => {
          try {
            localStorage.clear();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Force immediate write of all pending operations
   */
  flush(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.writeTimeout) {
        clearTimeout(this.writeTimeout);
      }
      
      this.processBatch()
        .then(() => resolve())
        .catch(reject);
    });
  }

  /**
   * Schedule a write operation
   */
  private scheduleWrite(key: string, value: string | null): void {
    // Add to write queue
    const operation: StorageOperation = {
      key,
      value: value || '',
      timestamp: Date.now()
    };

    // Remove existing operation for this key
    this.writeQueue = this.writeQueue.filter(op => op.key !== key);
    
    if (value !== null) {
      this.writeQueue.push(operation);
    }

    // Debounce batch processing
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }

    this.writeTimeout = setTimeout(() => {
      this.processBatch();
    }, this.config.debounceMs);
  }

  /**
   * Process write operations in batches
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.writeQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process in chunks to avoid blocking
      while (this.writeQueue.length > 0) {
        const batch = this.writeQueue.splice(0, this.config.batchSize);
        
        await this.scheduleIdleWork(() => {
          batch.forEach(operation => {
            try {
              if (operation.value) {
                localStorage.setItem(operation.key, operation.value);
              } else {
                localStorage.removeItem(operation.key);
              }
              
              // Remove from pending writes after successful write
              this.pendingWrites.delete(operation.key);
            } catch (error) {
              console.warn(`Failed to write ${operation.key} to localStorage:`, error);
              // Keep in memory fallback on localStorage failure
            }
          });
        });

        // Yield control between batches
        await this.nextTick();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Schedule work during idle time
   */
  private scheduleIdleWork(callback: () => void): Promise<void> {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          callback();
          resolve();
        });
      } else {
        setTimeout(() => {
          callback();
          resolve();
        }, 0);
      }
    });
  }

  /**
   * Basic compression for large values
   */
  private compress(value: string): string {
    if (!this.config.useCompression || value.length < 1000) {
      return value;
    }
    
    // Simple run-length encoding for JSON-like data
    return value.replace(/(\s+)/g, (match) => {
      return match.length > 3 ? `~${match.length}~` : match;
    });
  }

  /**
   * Decompress compressed values
   */
  private decompress(value: string): string {
    if (!this.config.useCompression) {
      return value;
    }
    
    return value.replace(/~(\d+)~/g, (_, length) => {
      return ' '.repeat(parseInt(length, 10));
    });
  }

  /**
   * Yield control to browser
   */
  private nextTick(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return {
      pendingWrites: this.pendingWrites.size,
      queuedOperations: this.writeQueue.length,
      memoryEntries: this.memoryFallback.size,
      isProcessing: this.isProcessing
    };
  }
}

// Global optimized storage instance
export const optimizedStorage = new OptimizedStorage({
  debounceMs: 500,
  batchSize: 5,
  useCompression: true,
  fallbackToMemory: true
});

/**
 * React hook for optimized storage operations
 */
export function useOptimizedStorage() {
  return {
    getItem: optimizedStorage.getItem.bind(optimizedStorage),
    setItem: optimizedStorage.setItem.bind(optimizedStorage),
    removeItem: optimizedStorage.removeItem.bind(optimizedStorage),
    clear: optimizedStorage.clear.bind(optimizedStorage),
    flush: optimizedStorage.flush.bind(optimizedStorage),
    getStats: optimizedStorage.getStats.bind(optimizedStorage)
  };
}

/**
 * Hook for persisting state with optimized storage
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [state, setState] = React.useState<T>(() => {
    try {
      const stored = optimizedStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistedState = React.useCallback((value: T) => {
    setState(value);
    optimizedStorage.setItem(key, JSON.stringify(value));
  }, [key]);

  return [state, setPersistedState];
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    optimizedStorage.flush();
  });
}