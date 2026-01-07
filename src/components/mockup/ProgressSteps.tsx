import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ProgressStepsProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  className?: string;
}

export const ProgressSteps = forwardRef<HTMLDivElement, ProgressStepsProps>(
  ({ currentStep, totalSteps, labels, className }, ref) => {
    const progressPercent = (currentStep / totalSteps) * 100;

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {/* Progress Bar with Gradient */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
              "bg-gradient-to-r from-primary via-primary to-primary/80"
            )}
            style={{ width: `${progressPercent}%` }}
          />
          {/* Shimmer effect */}
          {currentStep < totalSteps && (
            <div
              className="absolute inset-y-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              style={{ 
                left: `${progressPercent - 20}%`,
                width: '20%',
                backgroundSize: '200% 100%'
              }}
            />
          )}
        </div>

        {/* Step Pills */}
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-all duration-300",
                  isCompleted && "text-primary",
                  isCurrent && "text-primary font-medium",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-300",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary/20 text-primary ring-2 ring-primary/30 animate-pulse",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {stepNum}
                </div>
                {labels?.[i] && (
                  <span className="hidden sm:inline">{labels[i]}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

ProgressSteps.displayName = "ProgressSteps";
