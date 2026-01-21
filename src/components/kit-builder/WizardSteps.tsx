/**
 * Kit Builder Wizard Steps
 * Indicador de progresso do wizard
 */

import { Check, Package, Gift, Palette, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KitBuilderStep } from '@/lib/kit-builder';

interface WizardStepsProps {
  currentStep: KitBuilderStep;
  completedSteps: KitBuilderStep[];
  onStepClick?: (step: KitBuilderStep) => void;
}

const STEPS: { id: KitBuilderStep; label: string; icon: typeof Package }[] = [
  { id: 'box', label: 'Caixa', icon: Package },
  { id: 'items', label: 'Itens', icon: Gift },
  { id: 'personalization', label: 'Personalização', icon: Palette },
  { id: 'summary', label: 'Resumo', icon: FileText },
];

export function WizardSteps({ currentStep, completedSteps, onStepClick }: WizardStepsProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isPast = STEPS.findIndex(s => s.id === currentStep) > index;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <button
                onClick={() => onStepClick?.(step.id)}
                disabled={!isCompleted && !isActive}
                className={cn(
                  "flex flex-col items-center gap-2 transition-all",
                  (isCompleted || isActive) && "cursor-pointer",
                  !isCompleted && !isActive && "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                    isActive && "bg-primary border-primary text-primary-foreground scale-110 shadow-lg",
                    isCompleted && !isActive && "bg-primary/20 border-primary text-primary",
                    !isActive && !isCompleted && "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActive && "text-primary",
                    isCompleted && !isActive && "text-foreground",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-4">
                  <div
                    className={cn(
                      "h-full transition-colors",
                      isPast || isCompleted
                        ? "bg-primary"
                        : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
