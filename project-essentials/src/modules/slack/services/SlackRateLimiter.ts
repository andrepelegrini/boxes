/**
 * Slack-specific rate limiter that respects Slack's API rate limits
 * Based on Slack's documented rate limit tiers and best practices
 */

// Event emission utility for rate limiting
const emitRateLimitEvent = (eventName: string, payload: any) => {
  try {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(eventName, { detail: payload });
      window.dispatchEvent(event);
    }
  } catch (error) {
    console.warn(`Failed to emit rate limit event ${eventName}:`, error);
  }
};

export interface SlackRateLimitOptions {
  enableRateLimit?: boolean;
  respectRetryAfter?: boolean;
  maxRetries?: number;
  baseDelay?: number;
}

/**
 * Slack API method tiers with their respective rate limits per minute
 */
export enum SlackRateLimitTier {
  TIER_1 = 1,   // ~1 request per minute (most restrictive)
  TIER_2 = 20,  // ~20 requests per minute  
  TIER_3 = 50,  // ~50 requests per minute
  TIER_4 = 100, // ~100 requests per minute (least restrictive)
}

/**
 * Mapping of Slack API methods to their rate limit tiers
 * Based on Slack's official documentation
 */
export const SLACK_METHOD_TIERS: Record<string, SlackRateLimitTier> = {
  // Tier 1 (Most restrictive - 1 per minute)
  'conversations.history': SlackRateLimitTier.TIER_1,
  'conversations.replies': SlackRateLimitTier.TIER_1,
  'users.profile.set': SlackRateLimitTier.TIER_1,
  
  // Tier 2 (20 per minute)
  'conversations.list': SlackRateLimitTier.TIER_2,
  'users.list': SlackRateLimitTier.TIER_2,
  'users.info': SlackRateLimitTier.TIER_2,
  
  // Tier 3 (50 per minute)
  'conversations.info': SlackRateLimitTier.TIER_3,
  'team.info': SlackRateLimitTier.TIER_3,
  'auth.test': SlackRateLimitTier.TIER_3,
  
  // Tier 4 (100 per minute)
  'chat.postMessage': SlackRateLimitTier.TIER_4,
  'chat.update': SlackRateLimitTier.TIER_4,
  'chat.delete': SlackRateLimitTier.TIER_4,
};

/**
 * Rate limiter state for tracking requests per method per workspace
 */
interface RateLimitState {
  requests: number;
  windowStart: number;
  retryAfter?: number;
}

export class SlackRateLimiter {
  private static instance: SlackRateLimiter;
  private rateLimitState = new Map<string, RateLimitState>();
  private readonly WINDOW_SIZE = 60 * 1000; // 1 minute in milliseconds
  
  static getInstance(): SlackRateLimiter {
    if (!SlackRateLimiter.instance) {
      SlackRateLimiter.instance = new SlackRateLimiter();
    }
    return SlackRateLimiter.instance;
  }

  /**
   * Execute a Slack API call with proper rate limiting
   */
  async executeWithRateLimit<T>(
    methodName: string,
    workspaceId: string,
    apiCall: () => Promise<T>,
    options: SlackRateLimitOptions = {}
  ): Promise<T> {
    const opts = {
      enableRateLimit: true,
      respectRetryAfter: true,
      maxRetries: 3,
      baseDelay: 1000,
      ...options,
    };

    if (!opts.enableRateLimit) {
      return apiCall();
    }

    const tier = this.getMethodTier(methodName);
    const key = `${workspaceId}:${methodName}`;

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
      // Check if we need to wait before making the request
      const waitTime = this.calculateWaitTime(key, tier);
      if (waitTime > 0) {
        console.log(`Rate limit: waiting ${waitTime}ms for ${methodName}`);
        
        // Emit rate limit waiting event
        emitRateLimitEvent('slack-rate-limit-waiting', {
          methodName,
          workspaceId,
          waitTimeMs: waitTime,
          tier,
          message: `Rate limit: waiting ${waitTime}ms for ${methodName}`
        });
        
        await this.delay(waitTime);
      }

      try {
        // Record the request attempt
        this.recordRequest(key);
        
        const result = await apiCall();
        return result;
      } catch (error) {
        const is429Error = this.isRateLimitError(error);
        
        if (is429Error && attempt < opts.maxRetries) {
          const retryAfter = this.extractRetryAfter(error);
          
          if (retryAfter && opts.respectRetryAfter) {
            // Respect the Retry-After header
            this.setRetryAfter(key, retryAfter);
            console.log(`Rate limited: respecting Retry-After ${retryAfter}s for ${methodName}`);
            await this.delay(retryAfter * 1000);
          } else {
            // Use exponential backoff
            const backoffDelay = this.calculateExponentialBackoff(attempt, opts.baseDelay);
            console.log(`Rate limited: exponential backoff ${backoffDelay}ms for ${methodName}`);
            await this.delay(backoffDelay);
          }
          
          continue;
        }
        
        throw error;
      }
    }

    throw new Error(`Max retries (${opts.maxRetries}) exceeded for ${methodName}`);
  }

  /**
   * Get the rate limit tier for a Slack API method
   */
  private getMethodTier(methodName: string): SlackRateLimitTier {
    return SLACK_METHOD_TIERS[methodName] || SlackRateLimitTier.TIER_3; // Default to Tier 3
  }

  /**
   * Calculate how long to wait before making a request
   */
  private calculateWaitTime(key: string, tier: SlackRateLimitTier): number {
    const state = this.rateLimitState.get(key);
    
    if (!state) {
      return 0; // No previous requests
    }

    const now = Date.now();
    
    // Check if we're still in the retry-after period
    if (state.retryAfter && now < state.retryAfter) {
      return state.retryAfter - now;
    }

    // Check if we're in a new window
    if (now - state.windowStart >= this.WINDOW_SIZE) {
      return 0; // New window, can proceed
    }

    // Check if we've exceeded the tier limit
    if (state.requests >= tier) {
      // Need to wait until the window resets
      const windowEnd = state.windowStart + this.WINDOW_SIZE;
      return Math.max(0, windowEnd - now);
    }

    // For Tier 1 methods, enforce minimum 1-second spacing
    if (tier === SlackRateLimitTier.TIER_1) {
      const timeSinceLastRequest = now - (state.windowStart + (state.requests * 60000 / tier));
      const minInterval = 60000; // 1 minute for Tier 1
      return Math.max(0, minInterval - timeSinceLastRequest);
    }

    return 0; // Can proceed
  }

  /**
   * Record a request for rate limiting purposes
   */
  private recordRequest(key: string): void {
    const now = Date.now();
    const state = this.rateLimitState.get(key);

    if (!state || now - state.windowStart >= this.WINDOW_SIZE) {
      // Start new window
      this.rateLimitState.set(key, {
        requests: 1,
        windowStart: now,
      });
    } else {
      // Increment in current window
      state.requests++;
    }
  }

  /**
   * Set retry-after time for a method
   */
  private setRetryAfter(key: string, retryAfterSeconds: number): void {
    const state = this.rateLimitState.get(key);
    const retryAfterTime = Date.now() + (retryAfterSeconds * 1000);
    
    if (state) {
      state.retryAfter = retryAfterTime;
    } else {
      this.rateLimitState.set(key, {
        requests: 0,
        windowStart: Date.now(),
        retryAfter: retryAfterTime,
      });
    }
  }

  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorMessage.includes('429') || 
           errorMessage.includes('rate limit') ||
           errorMessage.includes('Too Many Requests') ||
           errorMessage.includes('Muitas requisições');
  }

  /**
   * Extract Retry-After header value from error
   */
  private extractRetryAfter(error: any): number | null {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Look for Retry-After in error message
    const retryAfterMatch = errorMessage.match(/retry.?after[:\s]+(\d+)/i);
    if (retryAfterMatch) {
      return parseInt(retryAfterMatch[1], 10);
    }

    // Look for specific wait time mentions
    const waitMatch = errorMessage.match(/(\d+)\s*second/i);
    if (waitMatch) {
      return parseInt(waitMatch[1], 10);
    }

    return null;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateExponentialBackoff(attempt: number, baseDelay: number): number {
    // For Slack, be more conservative with backoff
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3;
    const finalDelay = exponentialDelay * (1 + jitter);
    
    // Cap at 2 minutes but start with higher minimums for Slack
    return Math.min(Math.max(finalDelay, 5000), 120000);
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear rate limit state (useful for testing or workspace changes)
   */
  clearState(workspaceId?: string): void {
    if (workspaceId) {
      // Clear state for specific workspace
      for (const [key] of this.rateLimitState) {
        if (key.startsWith(`${workspaceId}:`)) {
          this.rateLimitState.delete(key);
        }
      }
    } else {
      // Clear all state
      this.rateLimitState.clear();
    }
  }

  /**
   * Get current rate limit status for debugging
   */
  getStatus(workspaceId: string, methodName: string): {
    requests: number;
    limit: number;
    windowStart: number;
    retryAfter?: number;
  } | null {
    const key = `${workspaceId}:${methodName}`;
    const state = this.rateLimitState.get(key);
    
    if (!state) {
      return null;
    }

    return {
      requests: state.requests,
      limit: this.getMethodTier(methodName),
      windowStart: state.windowStart,
      retryAfter: state.retryAfter,
    };
  }
}

export const slackRateLimiter = SlackRateLimiter.getInstance();