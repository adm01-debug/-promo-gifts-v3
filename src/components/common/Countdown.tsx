import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownProps {
  targetDate: Date | string;
  onComplete?: () => void;
  variant?: "default" | "compact" | "minimal";
  showDays?: boolean;
  showSeconds?: boolean;
  className?: string;
  labels?: {
    days?: string;
    hours?: string;
    minutes?: string;
    seconds?: string;
  };
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

/**
 * Countdown - Componente de contagem regressiva
 * 
 * @example
 * <Countdown targetDate="2025-12-31T23:59:59" />
 * <Countdown targetDate={new Date(Date.now() + 3600000)} variant="compact" />
 */
export function Countdown({
  targetDate,
  onComplete,
  variant = "default",
  showDays = true,
  showSeconds = true,
  className,
  labels = {
    days: "dias",
    hours: "horas",
    minutes: "min",
    seconds: "seg",
  },
}: CountdownProps) {
  const target = useMemo(() => new Date(targetDate), [targetDate]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(target));
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(target);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0 && !hasCompleted) {
        setHasCompleted(true);
        onComplete?.();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [target, onComplete, hasCompleted]);

  if (timeLeft.total <= 0) {
    return (
      <div className={cn("text-muted-foreground text-sm", className)}>
        Tempo esgotado
      </div>
    );
  }

  if (variant === "minimal") {
    const parts = [];
    if (showDays && timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
    parts.push(`${timeLeft.hours.toString().padStart(2, "0")}h`);
    parts.push(`${timeLeft.minutes.toString().padStart(2, "0")}m`);
    if (showSeconds) parts.push(`${timeLeft.seconds.toString().padStart(2, "0")}s`);

    return (
      <span className={cn("font-mono text-sm", className)}>
        {parts.join(" ")}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1 font-mono text-sm", className)}>
        {showDays && timeLeft.days > 0 && (
          <>
            <span className="font-bold">{timeLeft.days}</span>
            <span className="text-muted-foreground text-xs">d</span>
          </>
        )}
        <span className="font-bold">{timeLeft.hours.toString().padStart(2, "0")}</span>
        <span className="text-muted-foreground">:</span>
        <span className="font-bold">{timeLeft.minutes.toString().padStart(2, "0")}</span>
        {showSeconds && (
          <>
            <span className="text-muted-foreground">:</span>
            <span className="font-bold">{timeLeft.seconds.toString().padStart(2, "0")}</span>
          </>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showDays && (
        <CountdownUnit value={timeLeft.days} label={labels.days!} />
      )}
      <CountdownUnit value={timeLeft.hours} label={labels.hours!} />
      <CountdownUnit value={timeLeft.minutes} label={labels.minutes!} />
      {showSeconds && (
        <CountdownUnit value={timeLeft.seconds} label={labels.seconds!} />
      )}
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-muted rounded-lg px-3 py-2 min-w-[52px]">
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="block text-xl font-bold font-mono text-center"
          >
            {value.toString().padStart(2, "0")}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] text-muted-foreground uppercase mt-1 tracking-wide">
        {label}
      </span>
    </div>
  );
}

/**
 * ExpirationCountdown - Countdown para expiração com cores de urgência
 */
export function ExpirationCountdown({
  expiresAt,
  warningThreshold = 24, // hours
  dangerThreshold = 6, // hours
  onExpire,
}: {
  expiresAt: Date | string;
  warningThreshold?: number;
  dangerThreshold?: number;
  onExpire?: () => void;
}) {
  const timeLeft = calculateTimeLeft(new Date(expiresAt));
  const hoursLeft = timeLeft.days * 24 + timeLeft.hours;

  const colorClass = useMemo(() => {
    if (hoursLeft <= dangerThreshold) return "text-destructive";
    if (hoursLeft <= warningThreshold) return "text-warning";
    return "text-muted-foreground";
  }, [hoursLeft, warningThreshold, dangerThreshold]);

  return (
    <div className={cn("flex items-center gap-2", colorClass)}>
      <Countdown
        targetDate={expiresAt}
        variant="compact"
        showSeconds={hoursLeft <= dangerThreshold}
        showDays={timeLeft.days > 0}
        onComplete={onExpire}
        className={colorClass}
      />
    </div>
  );
}

export default Countdown;
