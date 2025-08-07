// Ultra-simple ServiceWrapper - just passes through without complexity

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ServiceWrapper {
  static async execute<T>(
    _operationName: string,
    operation: () => Promise<T>
  ): Promise<ServiceResult<T>> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async executeMutation<T>(
    operation: () => Promise<T>
  ): Promise<ServiceResult<T>> {
    return this.execute('mutation', operation);
  }

  static clearCache(_key: string) {
    // No-op - no caching
  }
}