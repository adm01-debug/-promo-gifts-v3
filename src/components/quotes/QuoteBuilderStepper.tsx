/**
 * QuoteBuilderStepper — Indicador visual de progresso para o fluxo de orçamento
 * 4 etapas: Cliente → Itens → Condições → Revisão
 */

import { Check, Building2, Package, CreditCard, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type QuoteBuilderStep = 'client' | 'items' | 'conditions' | 'review';

interface StepDef {
  id: QuoteBuilderStep;
  label: string;
  icon: typeof Building2;
}

const STEPS: StepDef[] = [
  { id: 'client', label: 'Cliente', icon: Building2 },
  { id: 'items', label: 'Itens', icon: Package },
  { id: 'conditions', label: 'Condições', icon: CreditCard },
  { id: 'review', label: 'Revisão', icon: FileCheck },
];

interface QuoteBuilderStepperProps {
  /** Which fields have been filled — drives completed state */
  completedSteps: QuoteBuilderStep[];
  /** Optional: highlight a specific step */
  activeStep?: QuoteBuilderStep;
  className?: string;
}

export function QuoteBuilderStepper({
  completedSteps,
  activeStep,
  className,
}: QuoteBuilderStepperProps) {
  return (
    <div data-testid="quote-wizard" role="tablist" className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isActive = step.id === activeStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200',
                    isCompleted && !isActive && 'border-primary bg-primary/20 text-primary',
                    isActive &&
                      'scale-110 border-primary bg-primary text-primary-foreground shadow-md',
                    !isCompleted && !isActive && 'border-border bg-muted/50 text-muted-foreground',
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'whitespace-nowrap text-xs font-medium transition-colors',
                    isActive && 'text-primary',
                    isCompleted && !isActive && 'text-foreground',
                    !isActive && !isCompleted && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="mx-3 mt-[-1rem] h-0.5 flex-1">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      STEPS.findIndex((s) => s.id === activeStep) > index
                        ? 'bg-primary'
                        : 'bg-border',
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
