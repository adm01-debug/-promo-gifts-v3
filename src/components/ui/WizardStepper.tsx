import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Circle, Loader2 } from "lucide-react";
import { Button } from "./button";
import React, { useState, createContext, useContext } from "react";

interface Step {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  optional?: boolean;
}

interface WizardContextType {
  currentStep: number;
  steps: Step[];
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isLoading: boolean;
}

const WizardContext = createContext<WizardContextType | null>(null);

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onComplete?: () => void;
  isLoading?: boolean;
  allowClickNavigation?: boolean;
  variant?: "default" | "compact" | "vertical";
  children: React.ReactNode;
  className?: string;
}

export function WizardStepper({
  steps,
  currentStep: controlledStep,
  onStepChange,
  onComplete,
  isLoading = false,
  allowClickNavigation = false,
  variant = "default",
  children,
  className,
}: WizardStepperProps) {
  const [internalStep, setInternalStep] = useState(0);
  const currentStep = controlledStep ?? internalStep;

  const setCurrentStep = (step: number) => {
    if (controlledStep === undefined) {
      setInternalStep(step);
    }
    onStepChange?.(step);
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const contextValue: WizardContextType = {
    currentStep,
    steps,
    goToStep,
    nextStep,
    prevStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    isLoading,
  };

  return (
    <WizardContext.Provider value={contextValue}>
      <div className={cn("w-full", className)}>
        {/* Step Indicators */}
        {variant === "vertical" ? (
          <div className="flex gap-8">
            <VerticalSteps
              steps={steps}
              currentStep={currentStep}
              allowClick={allowClickNavigation}
              onStepClick={goToStep}
            />
            <div className="flex-1">{children}</div>
          </div>
        ) : (
          <>
            {variant === "compact" ? (
              <CompactSteps
                steps={steps}
                currentStep={currentStep}
                allowClick={allowClickNavigation}
                onStepClick={goToStep}
              />
            ) : (
              <HorizontalSteps
                steps={steps}
                currentStep={currentStep}
                allowClick={allowClickNavigation}
                onStepClick={goToStep}
              />
            )}
            <div className="mt-8">{children}</div>
          </>
        )}
      </div>
    </WizardContext.Provider>
  );
}

// Horizontal Steps
function HorizontalSteps({
  steps,
  currentStep,
  allowClick,
  onStepClick,
}: {
  steps: Step[];
  currentStep: number;
  allowClick: boolean;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="relative">
      {/* Progress Bar */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
        <motion.div
          className="absolute top-0 left-0 h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
      </div>

      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const status = index < currentStep ? "complete" : index === currentStep ? "current" : "upcoming";
          
          return (
            <button
              key={step.id}
              onClick={() => allowClick && index < currentStep && onStepClick(index)}
              disabled={!allowClick || index > currentStep}
              className={cn(
                "flex flex-col items-center gap-2 group",
                allowClick && index < currentStep && "cursor-pointer"
              )}
            >
              <motion.div
                className={cn(
                  "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                  status === "complete" && "bg-primary border-primary text-primary-foreground",
                  status === "current" && "bg-background border-primary text-primary",
                  status === "upcoming" && "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
                whileHover={allowClick && index < currentStep ? { scale: 1.1 } : undefined}
                whileTap={allowClick && index < currentStep ? { scale: 0.95 } : undefined}
              >
                {status === "complete" ? (
                  <Check className="w-5 h-5" />
                ) : step.icon ? (
                  step.icon
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </motion.div>
              <div className="text-center">
                <p className={cn(
                  "text-sm font-medium",
                  status === "current" ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[100px]">
                    {step.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Compact Steps
function CompactSteps({
  steps,
  currentStep,
  allowClick,
  onStepClick,
}: {
  steps: Step[];
  currentStep: number;
  allowClick: boolean;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const status = index < currentStep ? "complete" : index === currentStep ? "current" : "upcoming";
        
        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => allowClick && index < currentStep && onStepClick(index)}
              disabled={!allowClick || index > currentStep}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
                status === "complete" && "bg-primary/10 text-primary hover:bg-primary/20",
                status === "current" && "bg-primary text-primary-foreground",
                status === "upcoming" && "bg-muted text-muted-foreground"
              )}
            >
              {status === "complete" ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <span className="w-4 text-center">{index + 1}</span>
              )}
              <span className="font-medium">{step.title}</span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Vertical Steps
function VerticalSteps({
  steps,
  currentStep,
  allowClick,
  onStepClick,
}: {
  steps: Step[];
  currentStep: number;
  allowClick: boolean;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4 min-w-[200px]">
      {steps.map((step, index) => {
        const status = index < currentStep ? "complete" : index === currentStep ? "current" : "upcoming";
        
        return (
          <button
            key={step.id}
            onClick={() => allowClick && index < currentStep && onStepClick(index)}
            disabled={!allowClick || index > currentStep}
            className={cn(
              "flex items-start gap-3 text-left",
              allowClick && index < currentStep && "cursor-pointer"
            )}
          >
            <div className="relative flex flex-col items-center">
              <motion.div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                  status === "complete" && "bg-primary border-primary text-primary-foreground",
                  status === "current" && "bg-background border-primary text-primary",
                  status === "upcoming" && "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {status === "complete" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </motion.div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "absolute top-8 w-0.5 h-8",
                  index < currentStep ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
            <div className="pt-1">
              <p className={cn(
                "text-sm font-medium",
                status === "current" ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
                {step.optional && (
                  <span className="text-xs ml-1">(opcional)</span>
                )}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Step Content Wrapper
export function WizardStepContent({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  const { currentStep } = useWizard();

  return (
    <AnimatePresence mode="wait">
      {currentStep === step && (
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Navigation Buttons
export function WizardNavigation({
  onNext,
  onPrev,
  onComplete,
  nextLabel = "Próximo",
  prevLabel = "Voltar",
  completeLabel = "Concluir",
  isNextDisabled = false,
  className,
}: {
  onNext?: () => void | Promise<void>;
  onPrev?: () => void;
  onComplete?: () => void | Promise<void>;
  nextLabel?: string;
  prevLabel?: string;
  completeLabel?: string;
  isNextDisabled?: boolean;
  className?: string;
}) {
  const { nextStep, prevStep, isFirstStep, isLastStep, isLoading } = useWizard();

  const handleNext = async () => {
    if (onNext) {
      await onNext();
    }
    nextStep();
  };

  const handleComplete = async () => {
    if (onComplete) {
      await onComplete();
    }
  };

  return (
    <div className={cn("flex items-center justify-between pt-6", className)}>
      <Button
        variant="outline"
        onClick={onPrev || prevStep}
        disabled={isFirstStep || isLoading}
      >
        {prevLabel}
      </Button>
      
      {isLastStep ? (
        <Button
          onClick={handleComplete}
          disabled={isNextDisabled || isLoading}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {completeLabel}
        </Button>
      ) : (
        <Button
          onClick={handleNext}
          disabled={isNextDisabled || isLoading}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {nextLabel}
        </Button>
      )}
    </div>
  );
}
