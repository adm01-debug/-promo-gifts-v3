import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useState, useEffect } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface InlineToastProps {
  variant?: ToastVariant;
  title: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  duration?: number;
  className?: string;
}

const variantStyles: Record<ToastVariant, {
  bg: string;
  border: string;
  icon: typeof CheckCircle;
  iconColor: string;
}> = {
  success: {
    bg: "bg-success/10",
    border: "border-success/30",
    icon: CheckCircle,
    iconColor: "text-success",
  },
  error: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    icon: XCircle,
    iconColor: "text-destructive",
  },
  warning: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    icon: AlertTriangle,
    iconColor: "text-warning",
  },
  info: {
    bg: "bg-info/10",
    border: "border-info/30",
    icon: Info,
    iconColor: "text-info",
  },
};

export function InlineToast({
  variant = "info",
  title,
  description,
  dismissible = true,
  onDismiss,
  duration,
  className,
}: InlineToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className={cn(
            "rounded-lg border p-4",
            styles.bg,
            styles.border,
            className
          )}
        >
          <div className="flex gap-3">
            <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", styles.iconColor)} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{title}</p>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Progress indicator
interface ProgressIndicatorProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: "default" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProgressIndicator({
  value,
  max = 100,
  label,
  showValue = true,
  variant = "default",
  size = "md",
  className,
}: ProgressIndicatorProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const variantColors = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-destructive",
  };

  const sizeStyles = {
    sm: { bar: "h-1.5", text: "text-xs" },
    md: { bar: "h-2.5", text: "text-sm" },
    lg: { bar: "h-4", text: "text-base" },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn("space-y-2", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className={cn("font-medium text-foreground", styles.text)}>
              {label}
            </span>
          )}
          {showValue && (
            <span className={cn("text-muted-foreground", styles.text)}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", styles.bar)}>
        <motion.div
          className={cn("h-full rounded-full", variantColors[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// Step Indicator
interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  variant?: "horizontal" | "vertical";
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  variant = "horizontal",
  className,
}: StepIndicatorProps) {
  const isHorizontal = variant === "horizontal";

  return (
    <div
      className={cn(
        "flex",
        isHorizontal ? "items-center" : "flex-col",
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
              isHorizontal ? "items-center flex-1" : "gap-4"
            )}
          >
            <div className={cn("flex items-center", !isHorizontal && "flex-col")}>
              {/* Step circle */}
              <motion.div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                  "border-2 transition-colors",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "border-primary text-primary bg-primary/10",
                  !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                )}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </motion.div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "bg-muted-foreground/30",
                    isHorizontal ? "h-0.5 flex-1 mx-2" : "w-0.5 h-8 my-2"
                  )}
                >
                  {isCompleted && (
                    <motion.div
                      className={cn(
                        "bg-primary",
                        isHorizontal ? "h-full" : "w-full"
                      )}
                      initial={isHorizontal ? { width: 0 } : { height: 0 }}
                      animate={isHorizontal ? { width: "100%" } : { height: "100%" }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Labels for vertical variant */}
            {!isHorizontal && (
              <div className="pb-8">
                <p
                  className={cn(
                    "font-medium",
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
