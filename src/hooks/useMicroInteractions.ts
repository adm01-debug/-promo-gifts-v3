import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Hook for button loading state with minimum display time
 */
export function useLoadingState(minDuration = 400) {
  const [isLoading, setIsLoading] = useState(false);
  const startTimeRef = useRef<number>(0);

  const startLoading = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, minDuration - elapsed);

    setTimeout(() => {
      setIsLoading(false);
    }, remaining);
  }, [minDuration]);

  const withLoading = useCallback(
    async <T,>(asyncFn: () => Promise<T>): Promise<T> => {
      startLoading();
      try {
        const result = await asyncFn();
        stopLoading();
        return result;
      } catch (error) {
        stopLoading();
        throw error;
      }
    },
    [startLoading, stopLoading]
  );

  return { isLoading, startLoading, stopLoading, withLoading };
}

/**
 * Hook for success/error feedback animation
 */
export function useFeedback(duration = 2000) {
  const [state, setState] = useState<"idle" | "success" | "error">("idle");

  const showSuccess = useCallback(() => {
    setState("success");
    setTimeout(() => setState("idle"), duration);
  }, [duration]);

  const showError = useCallback(() => {
    setState("error");
    setTimeout(() => setState("idle"), duration);
  }, [duration]);

  const reset = useCallback(() => {
    setState("idle");
  }, []);

  return {
    state,
    isSuccess: state === "success",
    isError: state === "error",
    isIdle: state === "idle",
    showSuccess,
    showError,
    reset,
  };
}

/**
 * Hook for shake animation trigger
 */
export function useShake() {
  const [shake, setShake] = useState(false);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  return { shake, triggerShake };
}

/**
 * Hook for pulse animation
 */
export function usePulse(duration = 2000) {
  const [isPulsing, setIsPulsing] = useState(false);

  const startPulse = useCallback(() => {
    setIsPulsing(true);
  }, []);

  const stopPulse = useCallback(() => {
    setIsPulsing(false);
  }, []);

  const pulseOnce = useCallback(() => {
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), duration);
  }, [duration]);

  return { isPulsing, startPulse, stopPulse, pulseOnce };
}

/**
 * Hook for hover state with delay
 */
export function useHoverIntent(delay = 100) {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const onMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, delay);
  }, [delay]);

  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isHovered,
    hoverProps: { onMouseEnter, onMouseLeave },
  };
}

/**
 * Hook for press state
 */
export function usePressState() {
  const [isPressed, setIsPressed] = useState(false);

  const pressProps = {
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onMouseLeave: () => setIsPressed(false),
    onTouchStart: () => setIsPressed(true),
    onTouchEnd: () => setIsPressed(false),
  };

  return { isPressed, pressProps };
}

/**
 * Hook for counting animation
 */
export function useCountUp(
  target: number,
  duration = 1000,
  startOnMount = true
) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  const start = useCallback(() => {
    setHasStarted(true);
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (target - startValue) * eased);

      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  useEffect(() => {
    if (startOnMount && !hasStarted) {
      start();
    }
  }, [startOnMount, hasStarted, start]);

  const reset = useCallback(() => {
    setCount(0);
    setHasStarted(false);
  }, []);

  return { count, start, reset, hasStarted };
}

/**
 * Hook for stagger animation of list items
 */
export function useStaggeredList<T>(
  items: T[],
  staggerDelay = 50
): { visibleItems: T[]; isComplete: boolean } {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (visibleCount < items.length) {
      const timer = setTimeout(() => {
        setVisibleCount((prev) => prev + 1);
      }, staggerDelay);

      return () => clearTimeout(timer);
    } else if (visibleCount === items.length && items.length > 0) {
      setIsComplete(true);
    }
  }, [visibleCount, items.length, staggerDelay]);

  useEffect(() => {
    setVisibleCount(0);
    setIsComplete(false);
  }, [items]);

  return {
    visibleItems: items.slice(0, visibleCount),
    isComplete,
  };
}

/**
 * Hook for intersection observer animation trigger
 */
export function useAnimateOnScroll(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hasAnimated, options]);

  return { ref, isVisible, hasAnimated };
}
