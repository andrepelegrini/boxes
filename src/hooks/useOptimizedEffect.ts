import { useEffect, useRef, useMemo } from 'react';
import { useDebounce } from './useDebounce';

/**
 * Optimized useEffect that prevents unnecessary executions
 * and provides debouncing for expensive operations
 */
export function useOptimizedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  options: {
    debounceMs?: number;
    skipFirstRender?: boolean;
    maxExecutions?: number;
  } = {}
) {
  const { debounceMs = 0, skipFirstRender = false, maxExecutions } = options;
  const isFirstRender = useRef(true);
  const executionCount = useRef(0);
  const prevDeps = useRef<React.DependencyList | undefined>(undefined);
  
  // Create a debounced version of the effect if needed
  const debouncedEffect = useDebounce(effect, debounceMs);
  const actualEffect = debounceMs > 0 ? debouncedEffect : effect;
  
  // Memoize dependency comparison to prevent unnecessary checks
  const depsChanged = useMemo(() => {
    if (!prevDeps.current) return true;
    if (prevDeps.current.length !== deps.length) return true;
    
    return deps.some((dep, index) => dep !== prevDeps.current![index]);
  }, [deps]);
  
  useEffect(() => {
    // Skip first render if requested
    if (skipFirstRender && isFirstRender.current) {
      isFirstRender.current = false;
      prevDeps.current = deps;
      return;
    }
    
    // Check execution limit
    if (maxExecutions && executionCount.current >= maxExecutions) {
      return;
    }
    
    // Only execute if dependencies actually changed
    if (depsChanged) {
      executionCount.current++;
      prevDeps.current = deps;
      return actualEffect();
    }
  }, [actualEffect, depsChanged, maxExecutions, skipFirstRender]);
}

/**
 * Hook for managing multiple related effects that should be debounced together
 */
export function useBatchedEffects(
  effects: Array<{
    effect: () => void | (() => void);
    deps: React.DependencyList;
    priority?: 'high' | 'medium' | 'low';
  }>,
  options: {
    debounceMs?: number;
    batchSize?: number;
  } = {}
) {
  const { debounceMs = 100, batchSize = 3 } = options;
  const batchQueue = useRef<(() => void)[]>([]);
  
  const executeBatch = useDebounce(() => {
    const batch = batchQueue.current.splice(0, batchSize);
    batch.forEach(effect => effect());
  }, debounceMs);
  
  // Sort effects by priority
  const sortedEffects = useMemo(() => {
    return effects.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      return aPriority - bPriority;
    });
  }, [effects]);
  
  sortedEffects.forEach(({ effect, deps }) => {
    useEffect(() => {
      batchQueue.current.push(effect);
      executeBatch();
    }, deps);
  });
}

/**
 * Hook for preventing effect cascades when multiple state updates happen rapidly
 */
export function useStabilizedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  stabilizationMs: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecutionRef = useRef<number>(0);
  
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionRef.current;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // If enough time has passed, execute immediately
    if (timeSinceLastExecution >= stabilizationMs) {
      lastExecutionRef.current = now;
      return effect();
    }
    
    // Otherwise, schedule for later
    timeoutRef.current = setTimeout(() => {
      lastExecutionRef.current = Date.now();
      effect();
    }, stabilizationMs - timeSinceLastExecution);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);
}