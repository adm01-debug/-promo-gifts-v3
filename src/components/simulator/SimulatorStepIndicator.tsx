// src/components/simulator/SimulatorStepIndicator.tsx
// Indicador de progresso do wizard

import { cn } from "@/lib/utils";
import { Check, Package, Palette, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import type { SimulatorStep } from "@/types/simulation";

interface SimulatorStepIndicatorProps {
  currentStep: SimulatorStep;
  onStepClick?: (step: SimulatorStep) => void;
  hasProduct: boolean;
  hasTechniques: boolean;
  hasResults: boolean;
}

const steps: { id: SimulatorStep; label: string; icon: typeof Package }[] = [
  { id: 'product', label: 'Produto', icon: Package },
  { id: 'techniques', label: 'Técnicas', icon: Palette },
  { id: 'results', label: 'Resultados', icon: BarChart3 },
];

export function SimulatorStepIndicator({
  currentStep,
  onStepClick,
  hasProduct,
  hasTechniques,
  hasResults,
}: SimulatorStepIndicatorProps) {
  const getStepStatus = (stepId: SimulatorStep) => {
    if (stepId === 'product') return hasProduct ? 'complete' : 'current';
    if (stepId === 'techniques') {
      if (hasTechniques) return 'complete';
      if (hasProduct) return 'current';
      return 'pending';
    }
    if (stepId === 'results') {
      if (hasResults) return 'complete';
      if (hasTechniques) return 'current';
      return 'pending';
    }
    return 'pending';
  };

  const isStepClickable = (stepId: SimulatorStep) => {
    if (stepId === 'product') return true;
    if (stepId === 'techniques') return hasProduct;
    if (stepId === 'results') return hasTechniques;
    return false;
  };

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-6">
      {steps.map((step, idx) => {
        const status = getStepStatus(step.id);
        const isActive = currentStep === step.id;
        const clickable = isStepClickable(step.id);
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => clickable && onStepClick?.(step.id)}
              disabled={!clickable}
              className={cn(
                "relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                "border-2",
                isActive && "border-primary bg-primary/10 text-primary",
                status === 'complete' && !isActive && "border-success/50 bg-success/5 text-success",
                status === 'pending' && "border-muted bg-muted/30 text-muted-foreground",
                clickable && "cursor-pointer hover:scale-105",
                !clickable && "cursor-not-allowed opacity-60"
              )}
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full",
                  isActive && "bg-primary text-primary-foreground",
                  status === 'complete' && !isActive && "bg-success text-success-foreground",
                  status === 'pending' && "bg-muted text-muted-foreground"
                )}
              >
                {status === 'complete' && !isActive ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </motion.div>
              <span className="hidden sm:block font-medium text-sm">
                {step.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="step-indicator"
                  className="absolute inset-0 border-2 border-primary rounded-xl"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>

            {idx < steps.length - 1 && (
              <div className={cn(
                "w-8 md:w-12 h-0.5 mx-1",
                status === 'complete' ? "bg-success/50" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
