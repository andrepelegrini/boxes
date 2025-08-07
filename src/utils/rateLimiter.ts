/**
 * Rate Limiter for Google Gemini API
 * 
 * Handles API rate limiting to prevent quota exceeded errors and provide
 * a better user experience when interacting with external APIs.
 */

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerDay: number;
  retryAfterMs: number;
  backoffMultiplier: number;
}

interface RequestRecord {
  timestamp: number;
  success: boolean;
}

class APIRateLimiter {
  private requests: RequestRecord[] = [];
  private config: RateLimitConfig;
  private isRateLimited = false;
  private rateLimitResetTime = 0;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if we can make a request without hitting rate limits
   */
  canMakeRequest(): { allowed: boolean; retryAfterMs?: number; reason?: string } {
    const now = Date.now();
    
    // Clean old requests (older than 24 hours)
    this.requests = this.requests.filter(req => now - req.timestamp < 24 * 60 * 60 * 1000);
    
    // Check if we're in a rate limit cool-down period
    if (this.isRateLimited && now < this.rateLimitResetTime) {
      return {
        allowed: false,
        retryAfterMs: this.rateLimitResetTime - now,
        reason: 'Rate limited - waiting for cooldown period'
      };
    }
    
    // Reset rate limit status if cooldown period has passed
    if (this.isRateLimited && now >= this.rateLimitResetTime) {
      this.isRateLimited = false;
    }
    
    // Check requests per minute (last 60 seconds)
    const oneMinuteAgo = now - 60 * 1000;
    const recentRequests = this.requests.filter(req => req.timestamp > oneMinuteAgo);
    
    if (recentRequests.length >= this.config.maxRequestsPerMinute) {
      return {
        allowed: false,
        retryAfterMs: 60 * 1000,
        reason: `Rate limit: ${this.config.maxRequestsPerMinute} requests per minute exceeded`
      };
    }
    
    // Check requests per day (last 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const dayRequests = this.requests.filter(req => req.timestamp > oneDayAgo);
    
    if (dayRequests.length >= this.config.maxRequestsPerDay) {
      return {
        allowed: false,
        retryAfterMs: 24 * 60 * 60 * 1000,
        reason: `Daily quota exceeded: ${this.config.maxRequestsPerDay} requests per day`
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Record a successful request
   */
  recordSuccess() {
    this.requests.push({
      timestamp: Date.now(),
      success: true
    });
  }
  
  /**
   * Record a failed request and potentially trigger rate limiting
   */
  recordFailure(error: any) {
    const now = Date.now();
    this.requests.push({
      timestamp: now,
      success: false
    });
    
    // Check if it's a rate limit error (429 or quota exceeded)
    if (this.isRateLimitError(error)) {
      this.handleRateLimitError(error);
    }
  }
  
  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const errorStatus = error.status || error.statusCode;
    
    return (
      errorStatus === 429 ||
      errorMessage.includes('429') ||
      errorMessage.includes('Too Many Requests') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('exceeded')
    );
  }
  
  /**
   * Handle rate limit errors by setting cooldown periods
   */
  private handleRateLimitError(error: any) {
    const now = Date.now();
    this.isRateLimited = true;
    
    // Extract retry-after time from error if available
    let retryAfterSeconds = this.config.retryAfterMs / 1000;
    
    const errorMessage = error.message || error.toString();
    const retryMatch = errorMessage.match(/retryDelay":"(\d+)s/);
    if (retryMatch) {
      retryAfterSeconds = parseInt(retryMatch[1], 10);
    }
    
    // Set rate limit reset time with some buffer
    this.rateLimitResetTime = now + (retryAfterSeconds * 1000) + 5000; // +5s buffer
    
    console.warn(`Rate limit triggered. Requests blocked until ${new Date(this.rateLimitResetTime).toLocaleTimeString()}`);
  }
  
  /**
   * Get current rate limit status
   */
  getStatus(): {
    isRateLimited: boolean;
    requestsLastMinute: number;
    requestsLastDay: number;
    resetTime?: Date | undefined;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    return {
      isRateLimited: this.isRateLimited,
      requestsLastMinute: this.requests.filter(req => req.timestamp > oneMinuteAgo).length,
      requestsLastDay: this.requests.filter(req => req.timestamp > oneDayAgo).length,
      resetTime: this.isRateLimited ? new Date(this.rateLimitResetTime) : undefined
    };
  }
  
  /**
   * Reset rate limiter state (useful for testing)
   */
  reset() {
    this.requests = [];
    this.isRateLimited = false;
    this.rateLimitResetTime = 0;
  }
}

// Default configuration for Google Gemini API
const GEMINI_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequestsPerMinute: 8, // Conservative limit (API allows 10)
  maxRequestsPerDay: 1000, // Conservative daily limit
  retryAfterMs: 60 * 1000, // 1 minute default retry
  backoffMultiplier: 2
};

// Singleton rate limiter instance
export const geminiRateLimiter = new APIRateLimiter(GEMINI_RATE_LIMIT_CONFIG);

/**
 * Wrapper function for making rate-limited API calls
 */
export async function makeRateLimitedRequest<T>(
  apiCall: () => Promise<T>,
  context = 'API request'
): Promise<T> {
  const limitCheck = geminiRateLimiter.canMakeRequest();
  
  if (!limitCheck.allowed) {
    const error = new Error(
      `${context} blocked by rate limiter: ${limitCheck.reason}. ` +
      `Retry after ${Math.ceil((limitCheck.retryAfterMs || 0) / 1000)} seconds.`
    );
    (error as any).isRateLimited = true;
    (error as any).retryAfterMs = limitCheck.retryAfterMs;
    throw error;
  }
  
  try {
    const result = await apiCall();
    geminiRateLimiter.recordSuccess();
    return result;
  } catch (error) {
    geminiRateLimiter.recordFailure(error);
    throw error;
  }
}

/**
 * Get user-friendly rate limit status for UI display
 */
export function getRateLimitStatus(): {
  message: string;
  severity: 'info' | 'warning' | 'error';
  canMakeRequest: boolean;
  resetTime?: string | undefined;
} {
  const status = geminiRateLimiter.getStatus();
  const limitCheck = geminiRateLimiter.canMakeRequest();
  
  if (status.isRateLimited) {
    return {
      message: `Limite de requisições atingido. Aguarde até ${status.resetTime?.toLocaleTimeString('pt-BR') || 'em breve'} para usar IA novamente.`,
      severity: 'error',
      canMakeRequest: false,
      resetTime: status.resetTime?.toLocaleTimeString('pt-BR')
    };
  }
  
  if (status.requestsLastMinute >= 7) { // Warning at 7/8 requests
    return {
      message: `Próximo do limite: ${status.requestsLastMinute}/8 requisições por minuto. Use IA com moderação.`,
      severity: 'warning',
      canMakeRequest: limitCheck.allowed
    };
  }
  
  if (status.requestsLastDay >= 800) { // Warning at 800/1000 requests
    return {
      message: `Limite diário próximo: ${status.requestsLastDay}/1000 requisições hoje.`,
      severity: 'warning',
      canMakeRequest: limitCheck.allowed
    };
  }
  
  return {
    message: `IA disponível (${status.requestsLastMinute}/8 por minuto, ${status.requestsLastDay}/1000 hoje)`,
    severity: 'info',
    canMakeRequest: limitCheck.allowed
  };
}

export { APIRateLimiter, type RateLimitConfig };