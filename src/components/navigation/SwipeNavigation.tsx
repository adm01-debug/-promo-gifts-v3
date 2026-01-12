import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationHistory {
  path: string;
  title: string;
  timestamp: number;
}

const MAX_HISTORY = 50;
const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;

// Navigation history context
const HISTORY_KEY = "navigation_history";

function getStoredHistory(): NavigationHistory[] {
  try {
    const stored = sessionStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function storeHistory(history: NavigationHistory[]) {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
}

// Get page title from path
function getPageTitle(path: string): string {
  const titles: Record<string, string> = {
    "/": "Catálogo",
    "/mockup": "Mockups",
    "/simulador-precos": "Simulador",
    "/orcamentos": "Orçamentos",
    "/pedidos": "Pedidos",
    "/empresas": "Empresas",
    "/favoritos": "Favoritos",
    "/configuracoes": "Configurações",
  };
  return titles[path] || path.split("/").pop() || "Página";
}

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [history, setHistory] = useState<NavigationHistory[]>(() => getStoredHistory());
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Track navigation
  useEffect(() => {
    const newEntry: NavigationHistory = {
      path: location.pathname,
      title: getPageTitle(location.pathname),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      // If we're not at the end, we're navigating from history
      if (currentIndex >= 0 && currentIndex < prev.length - 1) {
        // We navigated to a new page from history, truncate forward history
        const newHistory = [...prev.slice(0, currentIndex + 1), newEntry];
        storeHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
        return newHistory;
      }

      // Normal navigation - add to end
      const newHistory = [...prev, newEntry];
      storeHistory(newHistory);
      setCurrentIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [location.pathname]);

  // Update can go back/forward
  useEffect(() => {
    setCanGoBack(currentIndex > 0);
    setCanGoForward(currentIndex < history.length - 1);
  }, [currentIndex, history.length]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      navigate(history[newIndex].path);
    }
  }, [currentIndex, history, navigate]);

  const goForward = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      navigate(history[newIndex].path);
    }
  }, [currentIndex, history, navigate]);

  return {
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    history,
    currentIndex,
  };
}

interface SwipeNavigationProps {
  children: React.ReactNode;
  enabled?: boolean;
  showIndicators?: boolean;
}

export function SwipeNavigation({
  children,
  enabled = true,
  showIndicators = true,
}: SwipeNavigationProps) {
  const { canGoBack, canGoForward, goBack, goForward } = useSwipeNavigation();
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;

      // Check if swipe was significant enough
      const isSignificantSwipe =
        Math.abs(offset.x) > SWIPE_THRESHOLD ||
        Math.abs(velocity.x) > VELOCITY_THRESHOLD;

      if (isSignificantSwipe) {
        if (offset.x > 0 && canGoBack) {
          goBack();
        } else if (offset.x < 0 && canGoForward) {
          goForward();
        }
      }

      setSwipeDirection(null);
      setSwipeProgress(0);
    },
    [canGoBack, canGoForward, goBack, goForward]
  );

  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset } = info;
      const progress = Math.min(Math.abs(offset.x) / SWIPE_THRESHOLD, 1);
      setSwipeProgress(progress);

      if (offset.x > 20 && canGoBack) {
        setSwipeDirection("right");
      } else if (offset.x < -20 && canGoForward) {
        setSwipeDirection("left");
      } else {
        setSwipeDirection(null);
      }
    },
    [canGoBack, canGoForward]
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Swipe Indicators */}
      {showIndicators && (
        <>
          <AnimatePresence>
            {swipeDirection === "right" && canGoBack && (
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: swipeProgress, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="fixed left-4 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg",
                    swipeProgress >= 1 && "ring-4 ring-primary/30"
                  )}
                >
                  <ChevronLeft className="h-6 w-6" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {swipeDirection === "left" && canGoForward && (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: swipeProgress, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="fixed right-4 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg",
                    swipeProgress >= 1 && "ring-4 ring-primary/30"
                  )}
                >
                  <ChevronRight className="h-6 w-6" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Main Content with Drag */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Navigation Progress Indicator
interface NavigationProgressProps {
  steps: { label: string; completed: boolean; current?: boolean }[];
  className?: string;
}

export function NavigationProgress({ steps, className }: NavigationProgressProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
              step.completed
                ? "bg-primary text-primary-foreground"
                : step.current
                ? "bg-primary/20 text-primary border-2 border-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {step.completed ? "✓" : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-8 h-0.5",
                step.completed ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Step Labels
export function NavigationStepLabels({
  steps,
  className,
}: NavigationProgressProps) {
  return (
    <div className={cn("flex justify-between", className)}>
      {steps.map((step, index) => (
        <div
          key={index}
          className={cn(
            "text-xs text-center transition-colors",
            step.current
              ? "text-primary font-medium"
              : step.completed
              ? "text-foreground"
              : "text-muted-foreground"
          )}
          style={{ width: `${100 / steps.length}%` }}
        >
          {step.label}
        </div>
      ))}
    </div>
  );
}

// Back/Forward Navigation Buttons
export function NavigationButtons({ className }: { className?: string }) {
  const { canGoBack, canGoForward, goBack, goForward } = useSwipeNavigation();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        onClick={goBack}
        disabled={!canGoBack}
        className={cn(
          "p-2 rounded-lg transition-all",
          canGoBack
            ? "hover:bg-muted text-foreground"
            : "text-muted-foreground/50 cursor-not-allowed"
        )}
        aria-label="Voltar"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={goForward}
        disabled={!canGoForward}
        className={cn(
          "p-2 rounded-lg transition-all",
          canGoForward
            ? "hover:bg-muted text-foreground"
            : "text-muted-foreground/50 cursor-not-allowed"
        )}
        aria-label="Avançar"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
