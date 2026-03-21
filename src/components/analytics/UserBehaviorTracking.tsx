/**
 * User Behavior Tracking Components
 * Analytics, heatmaps, and user journey tracking
 */

import React, { 
import { logger } from "@/lib/logger";
  createContext, 
  useContext, 
  useCallback, 
  useEffect, 
  useRef,
  useState
} from "react";

// ============================================
// ANALYTICS CONTEXT
// ============================================

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
}

interface AnalyticsContextType {
  track: (name: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  page: (name: string, properties?: Record<string, unknown>) => void;
  events: AnalyticsEvent[];
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

interface AnalyticsProviderProps {
  children: React.ReactNode;
  debug?: boolean;
  onEvent?: (event: AnalyticsEvent) => void;
}

export function AnalyticsProvider({ 
  children, 
  debug = false,
  onEvent 
}: AnalyticsProviderProps) {
  const eventsRef = useRef<AnalyticsEvent[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  const track = useCallback((name: string, properties?: Record<string, unknown>) => {
    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
    };
    
    eventsRef.current.push(event);
    setEvents([...eventsRef.current]);
    
    if (debug) {
      logger.log("[Analytics] Track:", name, properties);
    }
    
    onEvent?.(event);
  }, [debug, onEvent]);

  const identify = useCallback((userId: string, traits?: Record<string, unknown>) => {
    if (debug) {
      logger.log("[Analytics] Identify:", userId, traits);
    }
    track("identify", { userId, ...traits });
  }, [debug, track]);

  const page = useCallback((name: string, properties?: Record<string, unknown>) => {
    if (debug) {
      logger.log("[Analytics] Page:", name, properties);
    }
    track("page_view", { page: name, ...properties });
  }, [debug, track]);

  return (
    <AnalyticsContext.Provider value={{ track, identify, page, events }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return no-op functions if not in provider
    return {
      track: () => {},
      identify: () => {},
      page: () => {},
      events: [],
    };
  }
  return context;
}

// ============================================
// CLICK TRACKING
// ============================================

interface TrackClickProps {
  eventName: string;
  properties?: Record<string, unknown>;
  children: React.ReactElement;
}

export function TrackClick({ eventName, properties, children }: TrackClickProps) {
  const { track } = useAnalytics();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      track(eventName, {
        ...properties,
        element: (e.target as HTMLElement).tagName,
        text: (e.target as HTMLElement).textContent?.slice(0, 50),
      });
      
      // Call original onClick if exists
      if (children.props.onClick) {
        children.props.onClick(e);
      }
    },
    [eventName, properties, track, children.props]
  );

  return React.cloneElement(children, { onClick: handleClick });
}

// ============================================
// VIEW TRACKING
// ============================================

interface TrackViewProps {
  eventName: string;
  properties?: Record<string, unknown>;
  children: React.ReactNode;
  threshold?: number;
}

export function TrackView({ 
  eventName, 
  properties, 
  children,
  threshold = 0.5 
}: TrackViewProps) {
  const { track } = useAnalytics();
  const ref = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          track(eventName, {
            ...properties,
            viewportPercentage: Math.round(entry.intersectionRatio * 100),
          });
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [eventName, properties, threshold, track]);

  return <div ref={ref}>{children}</div>;
}

// ============================================
// TIME ON PAGE TRACKING
// ============================================

export function useTimeOnPage(pageName: string) {
  const { track } = useAnalytics();
  const startTime = useRef(Date.now());
  const lastActiveTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();
    lastActiveTime.current = Date.now();

    const handleActivity = () => {
      lastActiveTime.current = Date.now();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const timeSpent = lastActiveTime.current - startTime.current;
        track("time_on_page", {
          page: pageName,
          duration: timeSpent,
          durationFormatted: formatDuration(timeSpent),
        });
      } else {
        startTime.current = Date.now();
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Track on unmount
      const timeSpent = lastActiveTime.current - startTime.current;
      track("time_on_page", {
        page: pageName,
        duration: timeSpent,
        durationFormatted: formatDuration(timeSpent),
      });
    };
  }, [pageName, track]);
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// ============================================
// SCROLL DEPTH TRACKING
// ============================================

export function useScrollDepth(pageName: string) {
  const { track } = useAnalytics();
  const maxDepth = useRef(0);
  const milestones = useRef(new Set<number>());

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentDepth = Math.round((window.scrollY / scrollHeight) * 100);
      
      if (currentDepth > maxDepth.current) {
        maxDepth.current = currentDepth;
      }

      // Track milestones (25%, 50%, 75%, 100%)
      [25, 50, 75, 100].forEach((milestone) => {
        if (currentDepth >= milestone && !milestones.current.has(milestone)) {
          milestones.current.add(milestone);
          track("scroll_depth", {
            page: pageName,
            depth: milestone,
          });
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pageName, track]);

  return maxDepth.current;
}

// ============================================
// FORM ANALYTICS
// ============================================

interface FormAnalyticsOptions {
  formName: string;
  trackFieldFocus?: boolean;
  trackFieldBlur?: boolean;
  trackSubmit?: boolean;
}

export function useFormAnalytics({
  formName,
  trackFieldFocus = true,
  trackFieldBlur = true,
  trackSubmit = true,
}: FormAnalyticsOptions) {
  const { track } = useAnalytics();
  const startTime = useRef<number | null>(null);
  const fieldInteractions = useRef<Record<string, number>>({});

  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      if (!startTime.current) {
        startTime.current = Date.now();
      }
      
      if (trackFieldFocus) {
        track("form_field_focus", {
          form: formName,
          field: fieldName,
        });
      }
      
      fieldInteractions.current[fieldName] = 
        (fieldInteractions.current[fieldName] || 0) + 1;
    },
    [formName, track, trackFieldFocus]
  );

  const handleFieldBlur = useCallback(
    (fieldName: string, hasValue: boolean) => {
      if (trackFieldBlur) {
        track("form_field_blur", {
          form: formName,
          field: fieldName,
          hasValue,
        });
      }
    },
    [formName, track, trackFieldBlur]
  );

  const handleSubmit = useCallback(
    (success: boolean, errorFields?: string[]) => {
      if (trackSubmit) {
        const duration = startTime.current 
          ? Date.now() - startTime.current 
          : 0;
          
        track("form_submit", {
          form: formName,
          success,
          duration,
          durationFormatted: formatDuration(duration),
          fieldInteractions: { ...fieldInteractions.current },
          errorFields,
        });
      }
    },
    [formName, track, trackSubmit]
  );

  return {
    handleFieldFocus,
    handleFieldBlur,
    handleSubmit,
  };
}

// ============================================
// ERROR TRACKING
// ============================================

export function useErrorTracking() {
  const { track } = useAnalytics();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      track("error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      track("unhandled_rejection", {
        reason: String(event.reason),
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [track]);
}

// ============================================
// USER JOURNEY TRACKING
// ============================================

interface JourneyStep {
  name: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface UserJourneyContextType {
  startJourney: (journeyName: string) => void;
  addStep: (stepName: string, metadata?: Record<string, unknown>) => void;
  completeJourney: () => void;
  abandonJourney: (reason?: string) => void;
  currentJourney: string | null;
  steps: JourneyStep[];
}

const UserJourneyContext = createContext<UserJourneyContextType | null>(null);

export function UserJourneyProvider({ children }: { children: React.ReactNode }) {
  const { track } = useAnalytics();
  const [currentJourney, setCurrentJourney] = useState<string | null>(null);
  const [steps, setSteps] = useState<JourneyStep[]>([]);
  const journeyStartTime = useRef<number>(0);
  const lastStepTime = useRef<number>(0);

  const startJourney = useCallback((journeyName: string) => {
    journeyStartTime.current = Date.now();
    lastStepTime.current = Date.now();
    setCurrentJourney(journeyName);
    setSteps([]);
    track("journey_start", { journey: journeyName });
  }, [track]);

  const addStep = useCallback((stepName: string, metadata?: Record<string, unknown>) => {
    const now = Date.now();
    const duration = now - lastStepTime.current;
    lastStepTime.current = now;

    const step: JourneyStep = {
      name: stepName,
      timestamp: now,
      duration,
      metadata,
    };

    setSteps((prev) => [...prev, step]);
    track("journey_step", {
      journey: currentJourney,
      step: stepName,
      stepNumber: steps.length + 1,
      duration,
      ...metadata,
    });
  }, [currentJourney, steps.length, track]);

  const completeJourney = useCallback(() => {
    const totalDuration = Date.now() - journeyStartTime.current;
    track("journey_complete", {
      journey: currentJourney,
      totalDuration,
      stepCount: steps.length,
      steps: steps.map((s) => s.name),
    });
    setCurrentJourney(null);
    setSteps([]);
  }, [currentJourney, steps, track]);

  const abandonJourney = useCallback((reason?: string) => {
    const totalDuration = Date.now() - journeyStartTime.current;
    track("journey_abandon", {
      journey: currentJourney,
      totalDuration,
      stepCount: steps.length,
      lastStep: steps[steps.length - 1]?.name,
      reason,
    });
    setCurrentJourney(null);
    setSteps([]);
  }, [currentJourney, steps, track]);

  return (
    <UserJourneyContext.Provider
      value={{
        startJourney,
        addStep,
        completeJourney,
        abandonJourney,
        currentJourney,
        steps,
      }}
    >
      {children}
    </UserJourneyContext.Provider>
  );
}

export function useUserJourney() {
  const context = useContext(UserJourneyContext);
  if (!context) {
    throw new Error("useUserJourney must be used within a UserJourneyProvider");
  }
  return context;
}

// ============================================
// A/B TEST TRACKING
// ============================================

interface ABTestConfig {
  testName: string;
  variants: string[];
  weights?: number[];
}

export function useABTest({ testName, variants, weights }: ABTestConfig): string {
  const { track } = useAnalytics();
  const [variant, setVariant] = useState<string>("");

  useEffect(() => {
    // Check localStorage for existing assignment
    const storageKey = `ab_test_${testName}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored && variants.includes(stored)) {
      setVariant(stored);
      return;
    }

    // Assign new variant
    let selectedVariant: string;
    
    if (weights && weights.length === variants.length) {
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const random = Math.random() * totalWeight;
      let cumulative = 0;
      
      selectedVariant = variants[variants.length - 1];
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (random < cumulative) {
          selectedVariant = variants[i];
          break;
        }
      }
    } else {
      selectedVariant = variants[Math.floor(Math.random() * variants.length)];
    }

    localStorage.setItem(storageKey, selectedVariant);
    setVariant(selectedVariant);
    
    track("ab_test_assignment", {
      test: testName,
      variant: selectedVariant,
    });
  }, [testName, variants, weights, track]);

  return variant;
}

export function trackABTestConversion(testName: string, conversionName: string) {
  const storageKey = `ab_test_${testName}`;
  const variant = localStorage.getItem(storageKey);
  
  if (variant) {
    // TODO: Integrar com analytics real quando disponível
    // Silenciado: A/B Test conversion tracking
  }
}
