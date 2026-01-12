/**
 * Progress Indicators
 * Various progress and loading state components
 */

import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, Loader2, X } from "lucide-react";

// Linear Progress Bar
interface LinearProgressProps {
  value: number;
  max?: number;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "error";
  animated?: boolean;
  className?: string;
}

export function LinearProgress({
  value,
  max = 100,
  showValue = false,
  size = "md",
  variant = "default",
  animated = true,
  className,
}: LinearProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const variantClasses = {
    default: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "w-full rounded-full bg-secondary overflow-hidden",
          sizeClasses[size]
        )}
      >
        <motion.div
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            variantClasses[variant],
            animated && "transition-all"
          )}
        />
      </div>
      {showValue && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 ml-2 text-xs font-medium">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// Circular Progress
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
  children?: ReactNode;
}

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  showValue = true,
  variant = "default",
  className,
  children,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const variantClasses = {
    default: "stroke-primary",
    success: "stroke-green-500",
    warning: "stroke-yellow-500",
    error: "stroke-red-500",
  };

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={variantClasses[variant]}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showValue && (
          <span className="text-lg font-semibold">{Math.round(percentage)}%</span>
        ))}
      </div>
    </div>
  );
}

// Step Progress
interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function StepProgress({
  steps,
  currentStep,
  orientation = "horizontal",
  className,
}: StepProgressProps) {
  return (
    <div
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col" : "items-center",
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
            className={cn(
              "flex",
              orientation === "vertical" ? "flex-row" : "flex-col items-center",
              !isLast && (orientation === "vertical" ? "" : "flex-1")
            )}
          >
            {/* Step Circle */}
            <div className="flex items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted
                    ? "hsl(var(--primary))"
                    : isCurrent
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted))",
                  scale: isCurrent ? 1.1 : 1,
                }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                  isCompleted || isCurrent
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </motion.div>

              {/* Connector Line */}
              {!isLast && orientation === "horizontal" && (
                <div className="flex-1 mx-2 min-w-[40px]">
                  <div className="h-0.5 bg-muted">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: isCompleted ? "100%" : "0%" }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Label */}
            <div
              className={cn(
                orientation === "vertical" ? "ml-4" : "mt-2 text-center"
              )}
            >
              <p
                className={cn(
                  "text-sm font-medium",
                  isCurrent && "text-primary"
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>

            {/* Vertical Connector */}
            {!isLast && orientation === "vertical" && (
              <div className="ml-5 mt-2 mb-2">
                <div className="w-0.5 h-8 bg-muted">
                  <motion.div
                    initial={{ height: "0%" }}
                    animate={{ height: isCompleted ? "100%" : "0%" }}
                    className="w-full bg-primary"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Loading Dots
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-current"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

// Skeleton Pulse
export function SkeletonPulse({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      className={cn("rounded bg-muted", className)}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      {...props}
    />
  );
}

// Determinate/Indeterminate Progress
interface ProgressBarProps {
  value?: number;
  indeterminate?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  indeterminate = false,
  className,
}: ProgressBarProps) {
  if (indeterminate) {
    return (
      <div className={cn("h-1 w-full overflow-hidden bg-secondary rounded-full", className)}>
        <motion.div
          className="h-full w-1/3 bg-primary rounded-full"
          animate={{
            x: ["-100%", "400%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    );
  }

  return <LinearProgress value={value || 0} className={className} />;
}

// Upload Progress
interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: "uploading" | "success" | "error" | "cancelled";
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function UploadProgress({
  fileName,
  progress,
  status,
  onCancel,
  onRetry,
  className,
}: UploadProgressProps) {
  const statusConfig = {
    uploading: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      color: "text-primary",
      label: `${progress}%`,
    },
    success: {
      icon: <Check className="h-4 w-4" />,
      color: "text-green-500",
      label: "Concluído",
    },
    error: {
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-red-500",
      label: "Erro",
    },
    cancelled: {
      icon: <X className="h-4 w-4" />,
      color: "text-muted-foreground",
      label: "Cancelado",
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg border", className)}>
      <div className={cn("flex-shrink-0", config.color)}>{config.icon}</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        {status === "uploading" && (
          <LinearProgress value={progress} size="sm" className="mt-1" />
        )}
        <p className={cn("text-xs", config.color)}>{config.label}</p>
      </div>

      {status === "uploading" && onCancel && (
        <button
          onClick={onCancel}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {status === "error" && onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// Task Progress with Subtasks
interface SubTask {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error";
}

interface TaskProgressProps {
  title: string;
  subTasks: SubTask[];
  className?: string;
}

export function TaskProgress({ title, subTasks, className }: TaskProgressProps) {
  const completed = subTasks.filter((t) => t.status === "completed").length;
  const progress = (completed / subTasks.length) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">{title}</h3>
          <span className="text-sm text-muted-foreground">
            {completed}/{subTasks.length}
          </span>
        </div>
        <LinearProgress value={progress} />
      </div>

      <div className="space-y-2">
        {subTasks.map((task) => {
          const statusIcons = {
            pending: <div className="w-4 h-4 rounded-full border-2" />,
            running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
            completed: <Check className="h-4 w-4 text-green-500" />,
            error: <AlertCircle className="h-4 w-4 text-red-500" />,
          };

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded",
                task.status === "running" && "bg-primary/5"
              )}
            >
              {statusIcons[task.status]}
              <span
                className={cn(
                  "text-sm",
                  task.status === "completed" && "text-muted-foreground line-through"
                )}
              >
                {task.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Countdown Timer
export function CountdownTimer({
  targetDate,
  onComplete,
  className,
}: {
  targetDate: Date;
  onComplete?: () => void;
  className?: string;
}) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const diff = target - now;

      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        onComplete?.();
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  return (
    <div className={cn("flex gap-4", className)}>
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="text-center">
          <motion.div
            key={value}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold tabular-nums"
          >
            {String(value).padStart(2, "0")}
          </motion.div>
          <div className="text-xs text-muted-foreground uppercase">{unit}</div>
        </div>
      ))}
    </div>
  );
}

// Loading Spinner with Text
export function LoadingSpinner({
  text,
  size = "md",
  className,
}: {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
