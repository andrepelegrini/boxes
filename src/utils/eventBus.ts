/**
 * Typed Event Bus for Event-Driven Architecture
 * Provides type-safe event emission and subscription system
 */

export interface BaseEvent {
  timestamp: number;
  source: string;
}

// Slack integration event definitions
export interface SlackEventMap {
  // OAuth Flow Events
  'slack.oauth.started': BaseEvent & {
    clientId: string;
    redirectUri: string;
    scopes?: string[];
  };
  'slack.oauth.completed': BaseEvent & {
    teamId: string;
    teamName?: string;
    accessToken: string;
    userId: string;
    scope: string;
  };
  'slack.oauth.failed': BaseEvent & {
    error: string;
    code?: string;
    clientId: string;
  };

  // Channel Events
  'slack.channel.join.requested': BaseEvent & {
    channelId: string;
    projectId?: string;
  };
  'slack.channel.join.completed': BaseEvent & {
    channelId: string;
    channelName?: string;
    projectId?: string;
  };
  'slack.channel.join.failed': BaseEvent & {
    channelId: string;
    error: string;
    projectId?: string;
  };

  // Connection Events
  'slack.connection.requested': BaseEvent & {
    projectId: string;
    channelId: string;
    channelName?: string;
    options?: {
      enableSync?: boolean;
      autoJoin?: boolean;
      analysisSettings?: any;
    };
  };
  'slack.connection.completed': BaseEvent & {
    projectId: string;
    channelId: string;
    syncId: string;
  };
  'slack.connection.failed': BaseEvent & {
    projectId: string;
    channelId: string;
    error: string;
    stage: 'join' | 'metadata' | 'sync';
  };

  // Sync Events  
  'slack.sync.started': BaseEvent & {
    jobId: string;
    projectId: string;
    channelId: string;
    messageCount?: number;
  };
  'slack.sync.progress': BaseEvent & {
    jobId: string;
    projectId: string;
    channelId: string;
    processed: number;
    total: number;
    estimatedTimeRemaining?: number;
  };
  'slack.sync.completed': BaseEvent & {
    jobId: string;
    projectId: string;
    channelId: string;
    messagesProcessed: number;
    tasksCreated: number;
    duration: number;
  };
  'slack.sync.failed': BaseEvent & {
    jobId: string;
    projectId: string;
    channelId: string;
    error: string;
    stage: 'fetch' | 'analyze' | 'store';
    canRetry: boolean;
    retryAfter?: number;
  };

  // AI Analysis Events
  'ai.analysis.started': BaseEvent & {
    jobId: string;
    projectId: string;
    channelId?: string;
    messageCount: number;
    analysisType: 'task_discovery' | 'project_update' | 'team_insights';
  };
  'ai.analysis.progress': BaseEvent & {
    jobId: string;
    projectId: string;
    processed: number;
    total: number;
    currentStage: string;
  };
  'ai.analysis.completed': BaseEvent & {
    jobId: string;
    projectId: string;
    channelId?: string;
    results: {
      tasks?: Array<{
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high';
        source: string;
      }>;
      insights?: string[];
      updates?: string[];
    };
    duration: number;
  };
  'ai.analysis.failed': BaseEvent & {
    jobId: string;
    projectId: string;
    error: string;
    stage: 'preparation' | 'processing' | 'extraction';
    canRetry: boolean;
  };

  // Background Job Events
  'job.queued': BaseEvent & {
    jobId: string;
    jobType: 'slack_sync' | 'ai_analysis' | 'channel_connect';
    priority: 'low' | 'medium' | 'high';
    projectId?: string;
    channelId?: string;
    estimatedDuration?: number;
  };
  'job.started': BaseEvent & {
    jobId: string;
    jobType: string;
    workerId: string;
  };
  'job.completed': BaseEvent & {
    jobId: string;
    jobType: string;
    workerId: string;
    duration: number;
    result?: any;
  };
  'job.failed': BaseEvent & {
    jobId: string;
    jobType: string;
    workerId: string;
    error: string;
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: number;
  };
  'job.cancelled': BaseEvent & {
    jobId: string;
    jobType: string;
    reason: string;
  };

  // UI Notification Events
  'ui.notification.show': BaseEvent & {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    actions?: Array<{
      label: string;
      action: string;
    }>;
  };
  'ui.loading.start': BaseEvent & {
    operation: string;
    message?: string;
    canCancel?: boolean;
  };
  'ui.loading.stop': BaseEvent & {
    operation: string;
  };

  // Global Task Suggestion Events
  'global.task.suggestion': BaseEvent & {
    id: string;
    title: string;
    description: string;
    confidence: number;
    source: 'slack' | 'email' | 'ai';
    sourceDetails: {
      platform: string;
      chatName?: string;
      channelName?: string;
      messageCount?: number;
      participants?: string[];
      timeframe?: string;
    };
    suggestedProject?: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    createdAt: string;
  };
  'global.task.batch': BaseEvent & {
    tasks: Array<{
      id: string;
      title: string;
      confidence: number;
      source: string;
    }>;
    totalCount: number;
    source: 'slack' | 'email' | 'ai';
  };

}

export type SlackEventHandler<K extends keyof SlackEventMap> = (event: SlackEventMap[K]) => void | Promise<void>;

export type EventUnsubscriber = () => void;

/**
 * Type-safe event bus implementation
 */
class TypedEventBus {
  private listeners: Map<keyof SlackEventMap, Set<Function>> = new Map();
  private onceListeners: Map<keyof SlackEventMap, Set<Function>> = new Map();
  private eventHistory: Array<{ event: keyof SlackEventMap; data: any; timestamp: number }> = [];
  private maxHistorySize = 1000;
  
  // Job event chain tracking for debugging
  private jobEventChains = new Map<string, Array<{event: string, timestamp: number, stage?: string}>>();
  private maxChainSize = 50;

  /**
   * Subscribe to an event
   */
  on<K extends keyof SlackEventMap>(
    event: K,
    handler: SlackEventHandler<K>
  ): EventUnsubscriber {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler);
    
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(handler);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Subscribe to an event once
   */
  once<K extends keyof SlackEventMap>(
    event: K,
    handler: SlackEventHandler<K>
  ): EventUnsubscriber {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    
    this.onceListeners.get(event)!.add(handler);
    
    return () => {
      const eventListeners = this.onceListeners.get(event);
      if (eventListeners) {
        eventListeners.delete(handler);
        if (eventListeners.size === 0) {
          this.onceListeners.delete(event);
        }
      }
    };
  }

  /**
   * Extract job ID from event data for flow tracking
   */
  private extractJobId(data: any): string | null {
    return data.jobId || data.syncJobId || data.connectionJobId || null;
  }

  /**
   * Emit an event
   */
  async emit<K extends keyof SlackEventMap>(
    event: K,
    data: Omit<SlackEventMap[K], keyof BaseEvent>
  ): Promise<void> {
    const eventData: SlackEventMap[K] = {
      ...data,
      timestamp: Date.now(),
      source: 'event-bus'
    } as SlackEventMap[K];

    // Add to history
    this.eventHistory.push({
      event,
      data: eventData,
      timestamp: eventData.timestamp
    });

    // Track job event chains for debugging
    const jobId = this.extractJobId(data);
    if (jobId) {
      if (!this.jobEventChains.has(jobId)) {
        this.jobEventChains.set(jobId, []);
      }
      
      const chain = this.jobEventChains.get(jobId)!;
      chain.push({ 
        event: String(event), 
        timestamp: eventData.timestamp,
        stage: (data as any).stage
      });
      
      // Trim chain if needed
      if (chain.length > this.maxChainSize) {
        chain.splice(0, chain.length - this.maxChainSize);
      }
      
    }

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    // Call regular listeners
    const regularListeners = this.listeners.get(event);
    if (regularListeners) {
      const promises: Promise<void>[] = [];
      for (const handler of regularListeners) {
        try {
          const result = (handler as SlackEventHandler<K>)(eventData);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`❌ [EventBus] Error in event handler for ${String(event)}:`, error);
        }
      }
      
      // Wait for all async handlers
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }

    // Call once listeners and remove them
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      const promises: Promise<void>[] = [];
      for (const handler of onceListeners) {
        try {
          const result = (handler as SlackEventHandler<K>)(eventData);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`Error in once event handler for ${String(event)}:`, error);
        }
      }
      
      // Clear once listeners
      this.onceListeners.delete(event);
      
      // Wait for all async handlers
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  off<K extends keyof SlackEventMap>(event: K): void {
    this.listeners.delete(event);
    this.onceListeners.delete(event);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
    this.onceListeners.clear();
  }

  /**
   * Get event history (useful for debugging)
   */
  getEventHistory(limit?: number): Array<{ event: keyof SlackEventMap; data: any; timestamp: number }> {
    const history = this.eventHistory.slice();
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get current listener counts
   */
  getListenerCounts(): Record<string, { regular: number; once: number }> {
    const counts: Record<string, { regular: number; once: number }> = {};
    
    for (const [event, listeners] of this.listeners.entries()) {
      counts[String(event)] = { regular: listeners.size, once: 0 };
    }
    
    for (const [event, listeners] of this.onceListeners.entries()) {
      if (!counts[String(event)]) {
        counts[String(event)] = { regular: 0, once: listeners.size };
      } else {
        counts[String(event)].once = listeners.size;
      }
    }
    
    return counts;
  }

  /**
   * Get job event chain for debugging
   */
  getJobEventChain(jobId: string): Array<{event: string, timestamp: number, stage?: string}> {
    return this.jobEventChains.get(jobId) || [];
  }

  /**
   * Clear job event chain (for cleanup)
   */
  clearJobEventChain(jobId: string): void {
    this.jobEventChains.delete(jobId);
  }

  /**
   * Get all active job chains
   */
  getAllJobChains(): Map<string, Array<{event: string, timestamp: number, stage?: string}>> {
    return new Map(this.jobEventChains);
  }

  /**
   * Wait for a specific event to occur
   */
  waitForEvent<K extends keyof SlackEventMap>(
    event: K,
    timeout?: number,
    predicate?: (data: SlackEventMap[K]) => boolean
  ): Promise<SlackEventMap[K]> {
    
    return new Promise((resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout | undefined;
      let eventCount = 0;
      
      if (timeout) {
        timeoutHandle = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event: ${String(event)}`));
        }, timeout);
      }

      const unsubscribe = this.once(event, (data) => {
        eventCount++;
        
        if (predicate && !predicate(data)) {
          
          // Re-subscribe if predicate doesn't match
          this.once(event, (newData) => {
            eventCount++;
            
            if (!predicate || predicate(newData)) {
              if (timeoutHandle) clearTimeout(timeoutHandle);
              resolve(newData);
            } else {
            }
          });
          return;
        }
        
        
        if (timeoutHandle) clearTimeout(timeoutHandle);
        resolve(data);
      });
    });
  }
}

// Export singleton instance
export const eventBus = new TypedEventBus();

// React hook for event subscription
export function useEventBus<K extends keyof SlackEventMap>(
  event: K,
  handler: SlackEventHandler<K>,
  deps: any[] = []
): void {
  // Dynamic import to avoid circular dependencies with React
  const { useEffect } = require('react');
  
  useEffect(() => {
    const unsubscribe = eventBus.on(event, handler);
    return unsubscribe;
  }, deps);
}

// Utility for creating job IDs
export function createJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Event emission helpers
export const SlackEvents = {
  // OAuth helpers
  emitOAuthStarted: (clientId: string, redirectUri: string, scopes?: string[]) =>
    eventBus.emit('slack.oauth.started', { clientId, redirectUri, scopes }),
    
  emitOAuthCompleted: (teamId: string, accessToken: string, userId: string, scope: string, teamName?: string) =>
    eventBus.emit('slack.oauth.completed', { teamId, teamName, accessToken, userId, scope }),
    
  emitOAuthFailed: (error: string, clientId: string, code?: string) =>
    eventBus.emit('slack.oauth.failed', { error, code, clientId }),

  // Connection helpers
  emitConnectionRequested: (projectId: string, channelId: string, channelName?: string, options?: any) =>
    eventBus.emit('slack.connection.requested', { projectId, channelId, channelName, options }),
    
  emitConnectionCompleted: (projectId: string, channelId: string, syncId: string) =>
    eventBus.emit('slack.connection.completed', { projectId, channelId, syncId }),
    
  emitConnectionFailed: (projectId: string, channelId: string, error: string, stage: 'join' | 'metadata' | 'sync') =>
    eventBus.emit('slack.connection.failed', { projectId, channelId, error, stage }),

  // Sync helpers
  emitSyncStarted: (jobId: string, projectId: string, channelId: string, messageCount?: number) =>
    eventBus.emit('slack.sync.started', { jobId, projectId, channelId, messageCount }),
    
  emitSyncCompleted: (jobId: string, projectId: string, channelId: string, messagesProcessed: number, tasksCreated: number, duration: number) =>
    eventBus.emit('slack.sync.completed', { jobId, projectId, channelId, messagesProcessed, tasksCreated, duration }),
    
  emitSyncFailed: (jobId: string, projectId: string, channelId: string, error: string, stage: 'fetch' | 'analyze' | 'store', canRetry: boolean = false, retryAfter?: number) =>
    eventBus.emit('slack.sync.failed', { jobId, projectId, channelId, error, stage, canRetry, retryAfter }),

  // Job helpers
  emitJobQueued: (jobId: string, jobType: 'slack_sync' | 'ai_analysis' | 'channel_connect', priority: 'low' | 'medium' | 'high' = 'medium', projectId?: string, channelId?: string) =>
    eventBus.emit('job.queued', { jobId, jobType, priority, projectId, channelId }),
    
  emitJobStarted: (jobId: string, jobType: string, workerId: string) =>
    eventBus.emit('job.started', { jobId, jobType, workerId }),
    
  emitJobCompleted: (jobId: string, jobType: string, workerId: string, duration: number, result?: any) =>
    eventBus.emit('job.completed', { jobId, jobType, workerId, duration, result }),
    
  emitJobFailed: (jobId: string, jobType: string, workerId: string, error: string, retryCount: number, maxRetries: number, nextRetryAt?: number) =>
    eventBus.emit('job.failed', { jobId, jobType, workerId, error, retryCount, maxRetries, nextRetryAt }),
    
  emitJobCancelled: (jobId: string, jobType: string, reason: string) =>
    eventBus.emit('job.cancelled', { jobId, jobType, reason }),

  // UI helpers
  emitNotification: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration?: number) =>
    eventBus.emit('ui.notification.show', { type, title, message, duration }),
    
  emitLoadingStart: (operation: string, message?: string, canCancel?: boolean) =>
    eventBus.emit('ui.loading.start', { operation, message, canCancel }),
    
  emitLoadingStop: (operation: string) =>
    eventBus.emit('ui.loading.stop', { operation })
};