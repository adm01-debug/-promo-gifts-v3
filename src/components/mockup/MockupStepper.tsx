import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MockupStepperProps {
  currentStep: number;
  steps?: { label: string; description?: string }[];
}

const defaultSteps = [
  { label: "Produto", description: "Selecione o produto" },
  { label: "Técnica", description: "Escolha a técnica" },
  { label: "Logo", description: "Faça upload do logo" },
  { label: "Posição", description: "Ajuste o posicionamento" },
  { label: "Preview", description: "Gere o mockup" },
];

export function MockupStepper({ currentStep, steps = defaultSteps }: MockupStepperProps) {
  return (
    <div className="w-full">
      {/* Desktop stepper */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;
          
          return (
            <div 
              key={step.label} 
              className="flex flex-col items-center relative z-10"
            >
              {/* Step circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  "text-sm font-semibold",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-background border-primary text-primary ring-4 ring-primary/20",
                  isUpcoming && "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  stepNumber
                )}
              </div>
              
              {/* Label */}
              <div className="mt-2 text-center">
                <p className={cn(
                  "text-xs font-medium transition-colors",
                  isCurrent && "text-primary",
                  isCompleted && "text-foreground",
                  isUpcoming && "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[80px]">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Mobile stepper - compact pills */}
      <div className="sm:hidden">
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            
            return (
              <div
                key={step.label}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  isCurrent ? "w-8 bg-primary" : "w-2",
                  isCompleted && "bg-primary",
                  !isCompleted && !isCurrent && "bg-muted"
                )}
              />
            );
          })}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {steps[currentStep - 1]?.label}
          </p>
          {steps[currentStep - 1]?.description && (
            <p className="text-xs text-muted-foreground">
              {steps[currentStep - 1]?.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to calculate current step based on form state
export function useMockupStep(state: {
  product: boolean;
  technique: boolean;
  logo: boolean;
  positioned: boolean;
  generated: boolean;
}): number {
  if (state.generated) return 5;
  if (state.positioned && state.logo) return 4;
  if (state.logo) return 4;
  if (state.technique) return 3;
  if (state.product) return 2;
  return 1;
}
