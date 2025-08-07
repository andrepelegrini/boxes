
export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  projectId?: string;
  service?: string;
  url?: string;
  method?: string;
  retryAttempt?: number;
}

export class ErrorHandler {
  /**
   * Wraps async functions with comprehensive error logging
   */
  static async withErrorLogging<T>(
    fn: () => Promise<T>,
    context: ErrorContext,
    errorMessage?: string
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.logError(error, context, errorMessage);
      throw error;
    }
  }

  /**
   * Wraps sync functions with comprehensive error logging
   */
  static withSyncErrorLogging<T>(
    fn: () => T,
    context: ErrorContext,
    errorMessage?: string
  ): T {
    try {
      return fn();
    } catch (error) {
      this.logError(error, context, errorMessage);
      throw error;
    }
  }

  /**
   * Logs errors based on context and error type
   */
  static logError(
    error: unknown,
    context: ErrorContext,
    customMessage?: string
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const message = customMessage || errorObj.message;

    // Log error based on type with console methods
    const errorType = this.getErrorType(errorObj);
    const logData = {
      type: errorType,
      message,
      context,
      error: errorObj.message,
      stack: errorObj.stack
    };

    if (this.isCriticalError(errorObj)) {
      console.error(`[ErrorHandler] Critical Error - ${errorType}:`, logData);
    } else if (this.isNetworkError(errorObj) || this.isHttpError(errorObj)) {
      console.warn(`[ErrorHandler] Network Error - ${errorType}:`, logData);
    } else {
      console.error(`[ErrorHandler] ${errorType}:`, logData);
    }
  }

  /**
   * Wraps API calls with automatic error logging
   */
  static async withApiErrorLogging<T>(
    apiCall: () => Promise<T>,
    options: {
      url: string;
      method: string;
      component?: string;
      operation?: string;
      retryAttempt?: number;
    }
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      
      // Log successful API call
      const duration = performance.now() - startTime;
      console.log(`[ErrorHandler] API Success: ${options.method} ${options.url} (${duration.toFixed(2)}ms)`);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Log failed API call
      const status = this.getHttpStatusFromError(error);
      console.error(`[ErrorHandler] API Failed: ${options.method} ${options.url} (${status}) (${duration.toFixed(2)}ms)`, {
        error: error instanceof Error ? error.message : String(error),
        component: options.component,
        operation: options.operation,
        retryAttempt: options.retryAttempt
      });
      
      this.logError(error, {
        url: options.url,
        method: options.method,
        component: options.component,
        operation: options.operation,
        retryAttempt: options.retryAttempt
      });
      
      throw error;
    }
  }

  /**
   * Creates a safe async function that logs errors but doesn't throw
   */
  static createSafeAsyncFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext,
    defaultReturn?: R
  ): (...args: T) => Promise<R | undefined> {
    return async (...args: T) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.logError(error, context);
        return defaultReturn;
      }
    };
  }

  /**
   * Creates a safe sync function that logs errors but doesn't throw
   */
  static createSafeSyncFunction<T extends any[], R>(
    fn: (...args: T) => R,
    context: ErrorContext,
    defaultReturn?: R
  ): (...args: T) => R | undefined {
    return (...args: T) => {
      try {
        return fn(...args);
      } catch (error) {
        this.logError(error, context);
        return defaultReturn;
      }
    };
  }

  // Error type detection helpers
  private static getErrorType(error: Error): string {
    if (this.isNetworkError(error)) return 'Network Error';
    if (this.isHttpError(error)) return 'HTTP Error';
    if (this.isAuthError(error)) return 'Authentication Error';
    if (this.isValidationError(error)) return 'Validation Error';
    if (this.isCriticalError(error)) return 'Critical Error';
    return 'Business Logic Error';
  }

  private static isNetworkError(error: Error): boolean {
    return (
      error.name === 'TypeError' && 
      (error.message.includes('fetch') || error.message.includes('network'))
    ) || error.message.includes('Network');
  }

  private static isHttpError(error: Error): boolean {
    return error.message.includes('HTTP') || 
           error.message.includes('status') ||
           /\d{3}/.test(error.message); // Contains HTTP status code
  }

  private static isAuthError(error: Error): boolean {
    return error.message.includes('auth') ||
           error.message.includes('unauthorized') ||
           error.message.includes('forbidden') ||
           error.message.includes('token') ||
           error.message.includes('permission');
  }

  private static isValidationError(error: Error): boolean {
    return error.message.includes('validation') ||
           error.message.includes('invalid') ||
           error.message.includes('required') ||
           error.message.includes('format');
  }

  private static isCriticalError(error: Error): boolean {
    return error.name === 'ReferenceError' ||
           error.name === 'TypeError' ||
           error.message.includes('Cannot read property') ||
           error.message.includes('undefined is not');
  }

  private static getHttpStatusFromError(error: unknown): number {
    if (error instanceof Error) {
      const statusMatch = error.message.match(/(\d{3})/);
      if (statusMatch) {
        return parseInt(statusMatch[1], 10);
      }
    }
    return 500; // Default to server error
  }
}

/**
 * Decorator for automatic error logging in class methods
 */
export function withErrorLogging(context: Partial<ErrorContext> = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const fullContext = {
        component: target.constructor.name,
        operation: propertyKey,
        ...context
      };

      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        ErrorHandler.logError(error, fullContext);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Utility for logging user interactions with error context
 */
export function logUserInteractionError(
  action: string,
  element: string,
  component: string,
  error: unknown,
  additionalContext?: Record<string, any>
) {
  console.error(`[ErrorHandler] User Interaction Failed: ${action} on ${element}`, {
    component,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    element,
    action,
    ...additionalContext
  });
}

export default ErrorHandler;