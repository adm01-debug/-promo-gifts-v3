import { LucideIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps?: number[];
  onStepClick?: (stepIndex: number) => void;
  variant?: "horizontal" | "vertical" | "compact";
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps = [],
  onStepClick,
  variant = "horizontal",
  className,
}: StepIndicatorProps) {
  const isStepComplete = (index: number) => completedSteps.includes(index) || index < currentStep;
  const isStepCurrent = (index: number) => index === currentStep;
  const isStepClickable = (index: number) => onStepClick && (isStepComplete(index) || index <= currentStep);

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isComplete = isStepComplete(index);
          const isCurrent = isStepCurrent(index);

          return (
            <button
              key={step.id}
              onClick={() => isStepClickable(index) && onStepClick?.(index)}
              disabled={!isStepClickable(index)}
              className={cn(
                "relative flex items-center justify-center transition-all",
                "h-10 w-10 rounded-full",
                isStepClickable(index) && "cursor-pointer hover:scale-105 active:scale-95",
                !isStepClickable(index) && "cursor-not-allowed",
                isComplete && "bg-success text-success-foreground",
                isCurrent && !isComplete && "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                !isCurrent && !isComplete && "bg-muted text-muted-foreground"
              )}
            >
              {isComplete ? (
                <Check className="h-5 w-5" />
              ) : StepIcon ? (
                <StepIcon className="h-5 w-5" />
              ) : (
                <span className="text-sm font-semibold">{index + 1}</span>
              )}
              
              {/* Pulse animation for current step */}
              {isCurrent && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div className={cn("flex flex-col", className)}>
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isComplete = isStepComplete(index);
          const isCurrent = isStepCurrent(index);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex">
              {/* Step Circle & Line */}
              <div className="flex flex-col items-center mr-4">
                <button
                  onClick={() => isStepClickable(index) && onStepClick?.(index)}
                  disabled={!isStepClickable(index)}
                  className={cn(
                    "relative flex items-center justify-center transition-all",
                    "h-10 w-10 rounded-full shrink-0",
                    isStepClickable(index) && "cursor-pointer hover:scale-105",
                    !isStepClickable(index) && "cursor-not-allowed",
                    isComplete && "bg-success text-success-foreground",
                    isCurrent && !isComplete && "bg-primary text-primary-foreground",
                    !isCurrent && !isComplete && "bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : StepIcon ? (
                    <StepIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </button>
                
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[2rem] my-2",
                      isStepComplete(index) ? "bg-success" : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Step Content */}
              <div className={cn("pb-8", isLast && "pb-0")}>
                <h4
                  className={cn(
                    "font-medium transition-colors",
                    isCurrent && "text-primary",
                    isComplete && "text-foreground",
                    !isCurrent && !isComplete && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </h4>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal variant (default)
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isComplete = isStepComplete(index);
          const isCurrent = isStepCurrent(index);
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center",
                !isLast && "flex-1"
              )}
            >
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isStepClickable(index) && onStepClick?.(index)}
                  disabled={!isStepClickable(index)}
                  className={cn(
                    "relative flex items-center justify-center transition-all",
                    "h-10 w-10 rounded-full",
                    isStepClickable(index) && "cursor-pointer hover:scale-105 active:scale-95",
                    !isStepClickable(index) && "cursor-not-allowed",
                    isComplete && "bg-success text-success-foreground",
                    isCurrent && !isComplete && "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                    !isCurrent && !isComplete && "bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : StepIcon ? (
                    <StepIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                  
                  {/* Pulse animation for current step */}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </button>
                
                {/* Label */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center max-w-[80px] transition-colors",
                    isCurrent && "text-primary",
                    isComplete && "text-foreground",
                    !isCurrent && !isComplete && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 rounded-full transition-colors",
                    isStepComplete(index) ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
