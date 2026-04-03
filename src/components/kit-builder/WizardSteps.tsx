/**
 * Kit Builder Wizard Steps — Redesigned
 * Stepper horizontal com progresso animado e contadores contextuais
 * Padronizado com tokens semânticos do Design System
 */

import { Check, Package, Gift, Palette, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { KitBuilderStep } from '@/lib/kit-builder';

interface WizardStepsProps {
  currentStep: KitBuilderStep;
  completedSteps: KitBuilderStep[];
  onStepClick?: (step: KitBuilderStep) => void;
  stepCounts?: Partial<Record<KitBuilderStep, number>>;
}

const STEPS: { id: KitBuilderStep; label: string; icon: typeof Package }[] = [
  { id: 'box', label: 'Caixa', icon: Package },
  { id: 'items', label: 'Itens', icon: Gift },
  { id: 'personalization', label: 'Personalização', icon: Palette },
  { id: 'summary', label: 'Resumo', icon: FileText },
];

export function WizardSteps({ currentStep, completedSteps, onStepClick, stepCounts }: WizardStepsProps) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isPast = currentIndex > index;
          const Icon = step.icon;
          const count = stepCounts?.[step.id];
          const isClickable = isCompleted || isActive;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step */}
              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={cn(
                  "group flex flex-col items-center gap-1.5 transition-all relative",
                  isClickable && "cursor-pointer",
                  !isClickable && "cursor-not-allowed"
                )}
              >
                {/* Circle */}
                <motion.div
                  layout
                  className={cn(
                    "relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
                    isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-primary/10",
                    isCompleted && !isActive && "bg-primary/15 text-primary border-2 border-primary/30",
                    !isActive && !isCompleted && "bg-muted/50 text-muted-foreground/50 border-2 border-border/50"
                  )}
                  whileHover={isClickable ? { scale: 1.08 } : undefined}
                  whileTap={isClickable ? { scale: 0.95 } : undefined}
                >
                  {isCompleted && !isActive ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Check className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}

                  {/* Count badge */}
                  {count !== undefined && count > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm"
                    >
                      {count}
                    </motion.span>
                  )}
                </motion.div>

                {/* Label */}
                <span
                  className={cn(
                    "text-xs font-medium transition-all duration-200",
                    isActive && "text-primary font-semibold",
                    isCompleted && !isActive && "text-foreground/80",
                    !isActive && !isCompleted && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Animated connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-3 bg-border/40 rounded-full overflow-hidden relative">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: '0%' }}
                    animate={{
                      width: isPast || isCompleted ? '100%' : isActive ? '30%' : '0%'
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
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
