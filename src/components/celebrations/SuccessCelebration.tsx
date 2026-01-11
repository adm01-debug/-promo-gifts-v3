import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { Check, PartyPopper, Star, Trophy, Sparkles } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type CelebrationType = 
  | "confetti"
  | "fireworks"
  | "stars"
  | "simple"
  | "emoji";

export interface SuccessCelebrationProps {
  show: boolean;
  type?: CelebrationType;
  duration?: number;
  message?: string;
  submessage?: string;
  onComplete?: () => void;
  className?: string;
}

export interface UseSuccessCelebrationOptions {
  defaultType?: CelebrationType;
  defaultDuration?: number;
}

// ============================================================================
// HOOK: useSuccessCelebration
// ============================================================================

export function useSuccessCelebration({
  defaultType = "confetti",
  defaultDuration = 3000,
}: UseSuccessCelebrationOptions = {}) {
  const [isShowing, setIsShowing] = React.useState(false);
  const [message, setMessage] = React.useState<string>();
  const [type, setType] = React.useState<CelebrationType>(defaultType);

  const celebrate = React.useCallback((opts?: {
    message?: string;
    type?: CelebrationType;
    duration?: number;
  }) => {
    if (opts?.message) setMessage(opts.message);
    if (opts?.type) setType(opts.type);

    setIsShowing(true);

    setTimeout(() => {
      setIsShowing(false);
      setMessage(undefined);
    }, opts?.duration || defaultDuration);
  }, [defaultDuration]);

  const stopCelebration = React.useCallback(() => {
    setIsShowing(false);
    setMessage(undefined);
  }, []);

  return {
    isShowing,
    message,
    type,
    celebrate,
    stopCelebration,
  };
}

// ============================================================================
// CONFETTI EFFECTS
// ============================================================================

function fireConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

function fireFireworks() {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

function fireStars() {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ["star"] as confetti.Shape[],
    colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"],
    zIndex: 9999,
  };

  function shoot() {
    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ["star"],
    });

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      shapes: ["circle"],
    });
  }

  setTimeout(shoot, 0);
  setTimeout(shoot, 100);
  setTimeout(shoot, 200);
}

// ============================================================================
// SUCCESS CELEBRATION COMPONENT
// ============================================================================

export function SuccessCelebration({
  show,
  type = "confetti",
  duration = 3000,
  message = "Sucesso!",
  submessage,
  onComplete,
  className,
}: SuccessCelebrationProps) {
  React.useEffect(() => {
    if (show) {
      // Fire appropriate effect
      switch (type) {
        case "confetti":
          fireConfetti();
          break;
        case "fireworks":
          fireFireworks();
          break;
        case "stars":
          fireStars();
          break;
      }

      // Call onComplete after duration
      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, type, duration, onComplete]);

  const getIcon = () => {
    switch (type) {
      case "fireworks":
        return <PartyPopper className="h-12 w-12 text-primary" />;
      case "stars":
        return <Star className="h-12 w-12 text-yellow-500 fill-yellow-500" />;
      case "emoji":
        return <span className="text-5xl">🎉</span>;
      default:
        return <Check className="h-12 w-12 text-green-500" />;
    }
  };

  return (
    <AnimatePresence>
      {show && type !== "simple" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
            className
          )}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", damping: 15 }}
            className="flex flex-col items-center gap-4 p-8 bg-background rounded-2xl shadow-2xl border"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              {getIcon()}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-center"
            >
              {message}
            </motion.h2>
            {submessage && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-center"
              >
                {submessage}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// INLINE SUCCESS INDICATOR
// ============================================================================

export interface InlineSuccessProps {
  show: boolean;
  message?: string;
  className?: string;
}

export function InlineSuccess({ show, message = "Salvo!", className }: InlineSuccessProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium",
            className
          )}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
          >
            <Check className="h-3.5 w-3.5" />
          </motion.div>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// MILESTONE CELEBRATION
// ============================================================================

export interface MilestoneCelebrationProps {
  show: boolean;
  milestone: string;
  description?: string;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function MilestoneCelebration({
  show,
  milestone,
  description,
  icon,
  onDismiss,
  className,
}: MilestoneCelebrationProps) {
  React.useEffect(() => {
    if (show) {
      fireStars();
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
            "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
            "px-6 py-4 rounded-xl shadow-2xl",
            "flex items-center gap-4",
            className
          )}
        >
          <div className="flex-shrink-0">
            {icon || <Trophy className="h-8 w-8" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <h3 className="font-bold">Marco Alcançado!</h3>
            </div>
            <p className="font-medium">{milestone}</p>
            {description && (
              <p className="text-sm opacity-90">{description}</p>
            )}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-white hover:bg-white/20"
            >
              Fechar
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
