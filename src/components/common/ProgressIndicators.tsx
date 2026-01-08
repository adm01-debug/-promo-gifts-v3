import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

// Circular progress indicator
interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  className?: string;
  color?: "primary" | "success" | "warning" | "error";
}

const progressColors = {
  primary: "stroke-primary",
  success: "stroke-green-500",
  warning: "stroke-amber-500",
  error: "stroke-red-500"
};

export function CircularProgress({
  value,
  size = 60,
  strokeWidth = 6,
  showValue = true,
  className,
  color = "primary"
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={progressColors[color]}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {showValue && (
        <span className="absolute text-sm font-semibold text-foreground">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}

// Linear progress bar
interface LinearProgressProps {
  value: number;
  className?: string;
  color?: "primary" | "success" | "warning" | "error";
  showValue?: boolean;
  animated?: boolean;
  size?: "sm" | "md" | "lg";
}

const barColors = {
  primary: "bg-primary",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500"
};

const barSizes = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3"
};

export function LinearProgress({
  value,
  className,
  color = "primary",
  showValue = false,
  animated = true,
  size = "md"
}: LinearProgressProps) {
  return (
    <div className={cn("w-full", className)}>
      {showValue && (
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{Math.round(value)}%</span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", barSizes[size])}>
        <motion.div
          className={cn("h-full rounded-full", barColors[color])}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: animated ? 0.5 : 0, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// Step progress indicator
interface Step {
  label: string;
  description?: string;
  completed?: boolean;
  current?: boolean;
}

interface StepProgressProps {
  steps: Step[];
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function StepProgress({ steps, className, orientation = "horizontal" }: StepProgressProps) {
  const isVertical = orientation === "vertical";

  return (
    <div 
      className={cn(
        "flex gap-2",
        isVertical ? "flex-col" : "flex-row items-center justify-between",
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = step.completed;
        const isCurrent = step.current;
        const isLast = index === steps.length - 1;

        return (
          <div 
            key={index}
            className={cn(
              "flex gap-3",
              isVertical ? "flex-row items-start" : "flex-col items-center flex-1"
            )}
          >
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <motion.div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2",
                  "transition-colors duration-300",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "border-primary bg-primary/10 text-primary",
                  !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                )}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </motion.div>

              {/* Connector line */}
              {!isLast && !isVertical && (
                <div className="hidden sm:block w-full h-0.5 bg-muted mt-4 absolute left-1/2">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  />
                </div>
              )}
            </div>

            {/* Step content */}
            <div className={cn(
              isVertical ? "flex-1 pb-8" : "text-center mt-2"
            )}>
              <p className={cn(
                "text-sm font-medium",
                (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              )}

              {/* Vertical connector */}
              {!isLast && isVertical && (
                <div className="absolute left-4 top-10 w-0.5 h-[calc(100%-2.5rem)] bg-muted">
                  <motion.div
                    className="w-full bg-primary"
                    initial={{ height: 0 }}
                    animate={{ height: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Goal progress with target
interface GoalProgressProps {
  current: number;
  target: number;
  label?: string;
  formatValue?: (value: number) => string;
  className?: string;
}

export function GoalProgress({
  current,
  target,
  label,
  formatValue = (v) => v.toLocaleString("pt-BR"),
  className
}: GoalProgressProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={cn(
            "text-sm font-medium",
            isComplete ? "text-green-500" : "text-foreground"
          )}>
            {formatValue(current)} / {formatValue(target)}
          </span>
        </div>
      )}
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            isComplete ? "bg-green-500" : "bg-primary"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Target marker */}
        <div 
          className="absolute top-0 w-0.5 h-full bg-foreground/50"
          style={{ left: "100%" }}
        />
      </div>
      <div className="text-right">
        <span className={cn(
          "text-xs font-medium",
          isComplete ? "text-green-500" : "text-muted-foreground"
        )}>
          {isComplete ? "✓ Meta atingida!" : `${percentage.toFixed(0)}% da meta`}
        </span>
      </div>
    </div>
  );
}

// Loading dots
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1
          }}
        />
      ))}
    </div>
  );
}

// Spinner
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const spinnerSizes = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8"
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <motion.div
      className={cn(
        "border-2 border-muted border-t-primary rounded-full",
        spinnerSizes[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}
