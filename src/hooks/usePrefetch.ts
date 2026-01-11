import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface PrefetchOptions {
  delay?: number;
  onEnter?: boolean;
  onFocus?: boolean;
}

/**
 * Hook for prefetching data on hover/focus
 */
export function usePrefetch<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options: PrefetchOptions = {}
) {
  const { delay = 100, onEnter = true, onFocus = true } = options;
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const prefetch = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 60 * 1000, // 1 minute
      });
    }, delay);
  }, [queryClient, queryKey, queryFn, delay]);

  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const prefetchHandlers = {
    onMouseEnter: onEnter ? prefetch : undefined,
    onMouseLeave: onEnter ? cancelPrefetch : undefined,
    onFocus: onFocus ? prefetch : undefined,
    onBlur: onFocus ? cancelPrefetch : undefined,
  };

  return { prefetch, cancelPrefetch, prefetchHandlers };
}

/**
 * Hook for prefetching next page in pagination
 */
export function usePrefetchNextPage<T>(
  queryKey: any[],
  queryFn: (page: number) => Promise<T>,
  currentPage: number,
  hasNextPage: boolean
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasNextPage) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: [...queryKey, nextPage],
        queryFn: () => queryFn(nextPage),
        staleTime: 60 * 1000,
      });
    }
  }, [queryClient, queryKey, queryFn, currentPage, hasNextPage]);
}

/**
 * Hook for prefetching on route change intent
 */
export function usePrefetchRoute(
  path: string,
  prefetchFn: () => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const prefetchedRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (enabled && !prefetchedRef.current) {
      prefetchedRef.current = true;
      prefetchFn();
    }
  }, [enabled, prefetchFn]);

  return {
    onMouseEnter: handleMouseEnter,
  };
}

/**
 * Hook for intersection observer-based prefetching
 */
export function usePrefetchOnVisible<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const { threshold = 0.1, rootMargin = "100px" } = options;
  const queryClient = useQueryClient();
  const elementRef = useRef<HTMLElement | null>(null);
  const prefetchedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !prefetchedRef.current) {
          prefetchedRef.current = true;
          queryClient.prefetchQuery({
            queryKey,
            queryFn,
            staleTime: 60 * 1000,
          });
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [queryClient, queryKey, queryFn, threshold, rootMargin]);

  return { ref: elementRef };
}

/**
 * Hook for prefetching images
 */
export function usePrefetchImages(urls: string[]) {
  useEffect(() => {
    const images = urls.map((url) => {
      const img = new Image();
      img.src = url;
      return img;
    });

    return () => {
      images.forEach((img) => {
        img.src = "";
      });
    };
  }, [urls]);
}
