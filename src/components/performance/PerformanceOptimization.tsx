/**
 * Performance Optimization Components
 * Lazy loading, virtual scrolling, optimistic updates
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
  Suspense,
  lazy,
  ComponentType,
  startTransition,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { LegacySkeleton as Skeleton } from "@/components/loading";

// Intersection Observer Hook for Lazy Loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasIntersected(true);
        }
      },
      { rootMargin: "100px", ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isIntersecting, hasIntersected };
}

// Lazy Load Component
interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  placeholder?: ReactNode;
  once?: boolean;
  className?: string;
}

export function LazyLoad({
  children,
  fallback,
  placeholder,
  once = true,
  className,
}: LazyLoadProps) {
  const { ref, isIntersecting, hasIntersected } = useIntersectionObserver();
  const shouldRender = once ? hasIntersected : isIntersecting;

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      {shouldRender ? (
        <Suspense fallback={fallback || <Skeleton className="h-40 w-full" />}>
          {children}
        </Suspense>
      ) : (
        placeholder || fallback || <Skeleton className="h-40 w-full" />
      )}
    </div>
  );
}

// Virtual List
interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight: number | ((index: number) => number);
  overscan?: number;
  className?: string;
  gap?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  className,
  gap = 0,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: typeof itemHeight === "function" ? itemHeight : () => itemHeight,
    overscan,
    gap,
  });

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Virtual Grid
interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  columns: number;
  itemHeight: number;
  gap?: number;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  columns,
  itemHeight,
  gap = 16,
  className,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rows = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight + gap,
    overscan: 2,
  });

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap}px`,
                paddingBottom: `${gap}px`,
              }}
            >
              {rowItems.map((item, i) =>
                renderItem(item, startIndex + i)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Optimistic Update Hook
interface UseOptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollback: () => void) => void;
  onSettled?: () => void;
}

export function useOptimisticUpdate<T>(
  currentValue: T,
  updateFn: (optimisticValue: T) => Promise<T>,
  options: UseOptimisticUpdateOptions<T> = {}
) {
  const [optimisticValue, setOptimisticValue] = useState<T | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousValue = useRef<T>(currentValue);

  const update = useCallback(
    async (newValue: T) => {
      previousValue.current = currentValue;
      setOptimisticValue(newValue);
      setIsPending(true);
      setError(null);

      try {
        const result = await updateFn(newValue);
        options.onSuccess?.(result);
        setOptimisticValue(null);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Update failed");
        setError(error);
        options.onError?.(error, () => setOptimisticValue(null));
        throw error;
      } finally {
        setIsPending(false);
        options.onSettled?.();
      }
    },
    [currentValue, updateFn, options]
  );

  const rollback = useCallback(() => {
    setOptimisticValue(null);
    setError(null);
  }, []);

  return {
    value: optimisticValue ?? currentValue,
    isPending,
    error,
    update,
    rollback,
    isOptimistic: optimisticValue !== null,
  };
}

// Prefetch Component
export function usePrefetch(
  fetchFn: () => Promise<unknown>,
  delay = 200
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hasPrefetched = useRef(false);

  const prefetch = useCallback(() => {
    if (hasPrefetched.current) return;

    timeoutRef.current = setTimeout(() => {
      startTransition(() => {
        fetchFn().then(() => {
          hasPrefetched.current = true;
        });
      });
    }, delay);
  }, [fetchFn, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { prefetch, cancel };
}

interface PrefetchLinkProps {
  children: ReactNode;
  prefetchFn: () => Promise<unknown>;
  className?: string;
  onClick?: () => void;
}

export function PrefetchLink({
  children,
  prefetchFn,
  className,
  onClick,
}: PrefetchLinkProps) {
  const { prefetch, cancel } = usePrefetch(prefetchFn);

  return (
    <span
      onMouseEnter={prefetch}
      onMouseLeave={cancel}
      onFocus={prefetch}
      onBlur={cancel}
      onClick={onClick}
      className={className}
    >
      {children}
    </span>
  );
}

// Debounced Value Hook
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Throttled Callback Hook
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
) {
  const lastCall = useRef(0);
  const lastCallTimer = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall.current;

      if (timeSinceLastCall >= delay) {
        lastCall.current = now;
        callback(...args);
      } else {
        if (lastCallTimer.current) {
          clearTimeout(lastCallTimer.current);
        }
        lastCallTimer.current = setTimeout(() => {
          lastCall.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  ) as T;
}

// Progressive Image Loading
interface ProgressiveImageProps {
  src: string;
  placeholder?: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

export function ProgressiveImage({
  src,
  placeholder,
  alt,
  className,
  onLoad,
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder || "");

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
      onLoad?.();
    };
  }, [src, onLoad]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-all duration-300",
          !isLoaded && "blur-sm scale-105"
        )}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// Infinite Scroll
interface InfiniteScrollProps {
  children: ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loader?: ReactNode;
  endMessage?: ReactNode;
  threshold?: number;
  className?: string;
}

export function InfiniteScroll({
  children,
  hasMore,
  isLoading,
  onLoadMore,
  loader,
  endMessage,
  threshold = 100,
  className,
}: InfiniteScrollProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return (
    <div className={className}>
      {children}
      
      <div ref={loadMoreRef} className="py-4">
        {isLoading && (
          loader || (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          )
        )}
        
        {!hasMore && !isLoading && endMessage && (
          <div className="text-center text-sm text-muted-foreground">
            {endMessage}
          </div>
        )}
      </div>
    </div>
  );
}

// Lazy Component Loader
export function createLazyComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(importFn);

  return function LazyComponentWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense
        fallback={
          fallback || (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Stale While Revalidate
export function useStaleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
    dedupingInterval?: number;
  } = {}
) {
  const [data, setData] = useState<T | null>(() => {
    const cached = localStorage.getItem(`swr-${key}`);
    return cached ? JSON.parse(cached) : null;
  });
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchTime = useRef(0);

  const revalidate = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime.current < (options.dedupingInterval || 2000)) {
      return;
    }

    lastFetchTime.current = now;
    setIsValidating(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      localStorage.setItem(`swr-${key}`, JSON.stringify(result));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Fetch failed"));
    } finally {
      setIsValidating(false);
    }
  }, [key, fetcher, options.dedupingInterval]);

  // Initial fetch
  useEffect(() => {
    revalidate();
  }, [key]);

  // Revalidate on focus
  useEffect(() => {
    if (!options.revalidateOnFocus) return;

    const handleFocus = () => revalidate();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [options.revalidateOnFocus, revalidate]);

  // Revalidate on reconnect
  useEffect(() => {
    if (!options.revalidateOnReconnect) return;

    const handleOnline = () => revalidate();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [options.revalidateOnReconnect, revalidate]);

  return { data, isValidating, error, revalidate };
}
