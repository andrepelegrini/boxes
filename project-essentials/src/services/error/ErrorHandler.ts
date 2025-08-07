
export class ErrorHandler {
  public static handleError(error: Error, context?: string) {
    console.error(`[${context || 'General'}] Error:`, error.message, error.stack);
    // In a real application, you would log this to a file or an external service.
  }
}
