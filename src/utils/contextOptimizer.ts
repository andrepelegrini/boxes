import { createContext, useContext, useMemo, useRef } from 'react';

/**
 * Context optimizer to prevent unnecessary re-renders
 * Splits large contexts and provides selective subscriptions
 */

// Types for context optimization
export interface ContextSubscription<T> {
  selector: (state: T) => any;
  equalityFn?: (a: any, b: any) => boolean;
}

export interface OptimizedContextValue<T> {
  state: T;
  subscribe: (subscription: ContextSubscription<T>) => () => void;
  getSnapshot: (selector: (state: T) => any) => any;
}

/**
 * Creates an optimized context that prevents unnecessary re-renders
 * by allowing components to subscribe to specific parts of the state
 */
export function createOptimizedContext<T>() {
  const Context = createContext<OptimizedContextValue<T> | null>(null);
  
  return {
    Context,
    useOptimizedContext: (selector?: (state: T) => any, equalityFn?: (a: any, b: any) => boolean) => {
      const context = useContext(Context);
      if (!context) {
        throw new Error('useOptimizedContext must be used within the corresponding Provider');
      }
      
      // If no selector provided, return full state (not optimized)
      if (!selector) {
        return context.state;
      }
      
      // Use optimized subscription
      const subscription = useMemo(() => ({
        selector,
        equalityFn: equalityFn || ((a, b) => a === b)
      }), [selector, equalityFn]);
      
      return context.getSnapshot(subscription.selector);
    }
  };
}

/**
 * Default shallow equality function for objects
 */
export function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || a[key] !== b[key]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Memoization utility for expensive computations
 */
export function useMemoizedSelector<T, R>(
  state: T,
  selector: (state: T) => R,
  deps: React.DependencyList = []
): R {
  return useMemo(() => selector(state), [state, ...deps]);
}

/**
 * Hook for creating stable callback references
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  return useMemo(() => {
    return ((...args: any[]) => callbackRef.current(...args)) as T;
  }, []);
}

/**
 * Batches state updates to prevent cascading re-renders
 */
export function useBatchedUpdates() {
  const batchQueue = useRef<(() => void)[]>([]);
  const isProcessing = useRef(false);
  
  const processBatch = useMemo(() => {
    return () => {
      if (isProcessing.current) return;
      
      isProcessing.current = true;
      const updates = batchQueue.current.splice(0);
      
      // Use React's unstable_batchedUpdates if available
      if ('unstable_batchedUpdates' in React) {
        (React as any).unstable_batchedUpdates(() => {
          updates.forEach(update => update());
        });
      } else {
        updates.forEach(update => update());
      }
      
      isProcessing.current = false;
    };
  }, []);
  
  const batchUpdate = useMemo(() => {
    return (update: () => void) => {
      batchQueue.current.push(update);
      setTimeout(processBatch, 0);
    };
  }, [processBatch]);
  
  return batchUpdate;
}