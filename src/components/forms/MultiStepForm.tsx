import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  optional?: boolean;
  validationFn?: () => boolean | Promise<boolean>;
}

export interface MultiStepFormProps {
  steps: FormStep[];
  children: React.ReactNode[];
  onComplete?: () => void;
  onStepChange?: (step: number) => void;
  allowSkipOptional?: boolean;
  showProgressBar?: boolean;
  showStepIndicators?: boolean;
  className?: string;
  submitLabel?: string;
  nextLabel?: string;
  prevLabel?: string;
  skipLabel?: string;
}

export interface StepIndicatorProps {
  steps: FormStep[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (step: number) => void;
  allowNavigation?: boolean;
}

export interface FormStepContentProps {
  children: React.ReactNode;
  isActive: boolean;
  direction: "forward" | "backward";
}

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  allowNavigation = true,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full mb-8">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.has(index);
        const isCurrent = index === currentStep;
        const isPast = index < currentStep;
        const canNavigate = allowNavigation && (isCompleted || isPast);

        return (
          <React.Fragment key={step.id}>
            {/* Step Circle */}
            <button
              type="button"
              onClick={() => canNavigate && onStepClick?.(index)}
              disabled={!canNavigate}
              className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isCompleted && "bg-primary border-primary text-primary-foreground",
                isCurrent && !isCompleted && "border-primary bg-primary/10 text-primary",
                !isCurrent && !isCompleted && "border-muted-foreground/30 text-muted-foreground",
                canNavigate && "cursor-pointer hover:scale-110",
                !canNavigate && "cursor-default"
              )}
              aria-label={`${step.title} - ${isCompleted ? 'Concluído' : isCurrent ? 'Atual' : 'Pendente'}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.span
                    key="number"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-sm font-semibold"
                  >
                    {step.icon || index + 1}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Step Label */}
              <span className={cn(
                "absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap",
                isCurrent ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
                {step.optional && <span className="text-muted-foreground/60 ml-1">(Opcional)</span>}
              </span>
            </button>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-3 h-0.5 bg-muted-foreground/20 relative overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: isPast || isCompleted ? "100%" : "0%" }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================================
// FORM STEP CONTENT WITH ANIMATION
// ============================================================================

function FormStepContent({ children, isActive, direction }: FormStepContentProps) {
  const variants = {
    enter: (dir: "forward" | "backward") => ({
      x: dir === "forward" ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: "forward" | "backward") => ({
      x: dir === "forward" ? -50 : 50,
      opacity: 0,
    }),
  };

  if (!isActive) return null;

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// ERROR SUMMARY COMPONENT
// ============================================================================

export interface FormErrorSummaryProps {
  errors: Array<{ field: string; message: string }>;
  onErrorClick?: (field: string) => void;
  className?: string;
}

export function FormErrorSummary({ errors, onErrorClick, className }: FormErrorSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-destructive mb-2">
            Por favor, corrija os seguintes erros:
          </h4>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => onErrorClick?.(error.field)}
                  className="text-sm text-destructive/90 hover:text-destructive underline-offset-2 hover:underline focus:outline-none focus:underline"
                >
                  {error.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN MULTI-STEP FORM COMPONENT
// ============================================================================

export function MultiStepForm({
  steps,
  children,
  onComplete,
  onStepChange,
  allowSkipOptional = true,
  showProgressBar = true,
  showStepIndicators = true,
  className,
  submitLabel = "Finalizar",
  nextLabel = "Próximo",
  prevLabel = "Anterior",
  skipLabel = "Pular",
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());
  const [direction, setDirection] = React.useState<"forward" | "backward">("forward");
  const [isValidating, setIsValidating] = React.useState(false);

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  const goToStep = React.useCallback((step: number) => {
    if (step < 0 || step >= steps.length) return;
    
    setDirection(step > currentStep ? "forward" : "backward");
    setCurrentStep(step);
    onStepChange?.(step);
  }, [currentStep, steps.length, onStepChange]);

  const markStepComplete = React.useCallback((step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, []);

  const handleNext = React.useCallback(async () => {
    if (currentStepData.validationFn) {
      setIsValidating(true);
      try {
        const isValid = await currentStepData.validationFn();
        if (!isValid) {
          setIsValidating(false);
          return;
        }
      } catch {
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    markStepComplete(currentStep);

    if (isLastStep) {
      onComplete?.();
    } else {
      goToStep(currentStep + 1);
    }
  }, [currentStep, currentStepData, isLastStep, markStepComplete, goToStep, onComplete]);

  const handlePrev = React.useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, isFirstStep, goToStep]);

  const handleSkip = React.useCallback(() => {
    if (currentStepData.optional && !isLastStep) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, currentStepData, isLastStep, goToStep]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.ctrlKey) {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext]);

  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      {showProgressBar && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Passo {currentStep + 1} de {steps.length}</span>
            <span>{Math.round(progress)}% completo</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Step Indicators */}
      {showStepIndicators && (
        <div className="mb-12">
          <StepIndicator
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
            allowNavigation={true}
          />
        </div>
      )}

      {/* Step Title & Description */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold">{currentStepData.title}</h3>
        {currentStepData.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {currentStepData.description}
          </p>
        )}
      </div>

      {/* Step Content */}
      <div className="min-h-[200px] mb-8">
        <AnimatePresence mode="wait" custom={direction}>
          {React.Children.map(children, (child, index) => (
            <FormStepContent
              key={index}
              isActive={index === currentStep}
              direction={direction}
            >
              {child}
            </FormStepContent>
          ))}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          type="button"
          variant="ghost"
          onClick={handlePrev}
          disabled={isFirstStep}
          className={cn(isFirstStep && "invisible")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {prevLabel}
        </Button>

        <div className="flex items-center gap-2">
          {currentStepData.optional && allowSkipOptional && !isLastStep && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              {skipLabel}
            </Button>
          )}

          <Button
            type="button"
            onClick={handleNext}
            disabled={isValidating}
          >
            {isValidating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Validando...
              </span>
            ) : isLastStep ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                {submitLabel}
              </>
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground text-center mt-4">
        Pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> para avançar
      </p>
    </div>
  );
}

// ============================================================================
// HOOK FOR FORM STEP MANAGEMENT
// ============================================================================

export interface UseMultiStepFormOptions {
  totalSteps: number;
  onComplete?: () => void;
  initialStep?: number;
}

export function useMultiStepForm({ totalSteps, onComplete, initialStep = 0 }: UseMultiStepFormOptions) {
  const [currentStep, setCurrentStep] = React.useState(initialStep);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());
  const [stepData, setStepData] = React.useState<Record<number, Record<string, unknown>>>({});

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const goToStep = React.useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const nextStep = React.useCallback(() => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, isLastStep, onComplete]);

  const prevStep = React.useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  const updateStepData = React.useCallback((step: number, data: Record<string, unknown>) => {
    setStepData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...data }
    }));
  }, []);

  const getAllData = React.useCallback(() => {
    return Object.values(stepData).reduce((acc, data) => ({ ...acc, ...data }), {});
  }, [stepData]);

  const reset = React.useCallback(() => {
    setCurrentStep(initialStep);
    setCompletedSteps(new Set());
    setStepData({});
  }, [initialStep]);

  return {
    currentStep,
    isFirstStep,
    isLastStep,
    progress,
    completedSteps,
    stepData,
    goToStep,
    nextStep,
    prevStep,
    updateStepData,
    getAllData,
    reset,
  };
}
