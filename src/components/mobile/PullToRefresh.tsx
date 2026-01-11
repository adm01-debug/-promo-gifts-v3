import { ReactNode, useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Loader2, RefreshCw, ArrowDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  pullThreshold?: number;
  maxPull?: number;
  className?: string;
  disabled?: boolean;
  indicatorClassName?: string;
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
  successText?: string;
}

type RefreshState = "idle" | "pulling" | "ready" | "refreshing" | "success";

export function PullToRefresh({
  children,
  onRefresh,
  pullThreshold = 80,
  maxPull = 120,
  className,
  disabled = false,
  indicatorClassName,
  refreshingText = "Atualizando...",
  pullText = "Puxe para atualizar",
  releaseText = "Solte para atualizar",
  successText = "Atualizado!",
}: PullToRefreshProps) {
  const [state, setState] = useState<RefreshState>("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);

  // Calculate progress (0 to 1)
  const progress = useTransform(y, [0, pullThreshold], [0, 1]);
  const indicatorY = useTransform(y, [0, maxPull], [-60, 20]);
  const rotation = useTransform(y, [0, pullThreshold], [0, 180]);
  const scale = useTransform(y, [0, pullThreshold / 2, pullThreshold], [0.5, 0.8, 1]);

  const handleDragEnd = useCallback(
    async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled || state === "refreshing") return;

      if (info.offset.y >= pullThreshold) {
        setState("refreshing");
        try {
          await onRefresh();
          setState("success");
          setTimeout(() => {
            setState("idle");
            y.set(0);
          }, 1000);
        } catch (error) {
          console.error("Refresh failed:", error);
          setState("idle");
          y.set(0);
        }
      } else {
        setState("idle");
        y.set(0);
      }
    },
    [disabled, onRefresh, pullThreshold, state, y]
  );

  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled || state === "refreshing") return;

      if (info.offset.y > 0) {
        if (info.offset.y >= pullThreshold) {
          setState("ready");
        } else {
          setState("pulling");
        }
      }
    },
    [disabled, pullThreshold, state]
  );

  const getStateConfig = () => {
    switch (state) {
      case "pulling":
        return {
          icon: <ArrowDown className="h-5 w-5" />,
          text: pullText,
          color: "text-muted-foreground",
        };
      case "ready":
        return {
          icon: <RefreshCw className="h-5 w-5" />,
          text: releaseText,
          color: "text-primary",
        };
      case "refreshing":
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin" />,
          text: refreshingText,
          color: "text-primary",
        };
      case "success":
        return {
          icon: <Check className="h-5 w-5" />,
          text: successText,
          color: "text-success",
        };
      default:
        return null;
    }
  };

  const stateConfig = getStateConfig();

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden touch-pan-y", className)}
    >
      {/* Pull Indicator */}
      <motion.div
        className={cn(
          "absolute left-0 right-0 top-0 flex flex-col items-center justify-center",
          "pointer-events-none z-10",
          indicatorClassName
        )}
        style={{
          y: indicatorY,
          scale,
        }}
      >
        {stateConfig && (
          <motion.div
            className={cn(
              "flex flex-col items-center gap-2 py-3 px-4 rounded-full",
              "bg-card/90 backdrop-blur-sm shadow-lg border",
              stateConfig.color
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              style={{
                rotate:
                  state === "pulling" || state === "ready" ? rotation : 0,
              }}
            >
              {stateConfig.icon}
            </motion.div>
            <span className="text-xs font-medium">{stateConfig.text}</span>
          </motion.div>
        )}
      </motion.div>

      {/* Content */}
      <motion.div
        drag={disabled || state === "refreshing" ? false : "y"}
        dragConstraints={{ top: 0, bottom: maxPull }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        style={{ y }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Hook for programmatic refresh
export function usePullToRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async (fn: () => Promise<void>) => {
    setIsRefreshing(true);
    try {
      await fn();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return { isRefreshing, refresh };
}
