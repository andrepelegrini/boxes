import React from 'react';
import { shallowEqual } from '../../utils/contextOptimizer';

/**
 * Higher-order component factory for creating memoized components
 * with custom equality functions
 */
export function withMemoization<P extends object>(
  Component: React.ComponentType<P>,
  equalityFn?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = React.memo(Component, equalityFn || shallowEqual);
  MemoizedComponent.displayName = `Memoized(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

/**
 * Specialized memo for components that depend on large objects
 * but only care about specific properties
 */
export function withSelectorMemo<P extends object, T>(
  Component: React.ComponentType<P>,
  selector: (props: P) => T,
  equalityFn?: (a: T, b: T) => boolean
) {
  return React.memo(Component, (prevProps, nextProps) => {
    const prevSelected = selector(prevProps);
    const nextSelected = selector(nextProps);
    return equalityFn ? equalityFn(prevSelected, nextSelected) : prevSelected === nextSelected;
  });
}

/**
 * Performance-optimized wrapper for list components
 */
export function withListOptimization<P extends { items?: any[] }>(
  Component: React.ComponentType<P>,
  itemEqualityFn?: (a: any, b: any) => boolean
) {
  return React.memo(Component, (prevProps, nextProps) => {
    // Quick reference check first
    if (prevProps.items === nextProps.items) return true;
    
    // Check array length
    if (prevProps.items?.length !== nextProps.items?.length) return false;
    
    // Deep compare items if needed
    if (prevProps.items && nextProps.items) {
      return prevProps.items.every((item, index) => {
        const nextItem = nextProps.items![index];
        return itemEqualityFn ? itemEqualityFn(item, nextItem) : item === nextItem;
      });
    }
    
    return false;
  });
}

/**
 * Optimized memo for components with function props
 */
export function withCallbackMemo<P extends object>(
  Component: React.ComponentType<P>,
  functionPropKeys: (keyof P)[]
) {
  return React.memo(Component, (prevProps, nextProps) => {
    // Check non-function props first
    for (const key of Object.keys(prevProps) as (keyof P)[]) {
      if (!functionPropKeys.includes(key) && prevProps[key] !== nextProps[key]) {
        return false;
      }
    }
    
    // Function props are assumed to be stable (from useCallback)
    // Skip comparison for performance
    return true;
  });
}


/**
 * Lazy component wrapper with loading state
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  fallback: React.ReactElement | null = <div>Loading...</div>
) {
  const LazyComponent = React.lazy(importFn);
  
  return React.memo((props: P) => (
    <React.Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </React.Suspense>
  ));
}

/**
 * Virtual list item wrapper for large lists
 */
export interface VirtualizedItemProps {
  index: number;
  style: React.CSSProperties;
  data: any;
}

export function withVirtualization<T>(
  ItemComponent: React.ComponentType<{ item: T; index: number }>,
) {
  return React.memo(({ index, style, data }: VirtualizedItemProps) => (
    <div style={style}>
      <ItemComponent item={data[index]} index={index} />
    </div>
  ));
}

