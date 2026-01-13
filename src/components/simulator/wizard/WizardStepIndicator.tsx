/**
 * WizardStepIndicator - Indicador visual minimalista dos passos
 * 
 * Design: Clean, compacto, com feedback visual sutil
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Package, MapPin, Palette, Settings, Calculator, Check } from 'lucide-react';
import { 
  WIZARD_STEPS, 
  WIZARD_STEP_CONFIG,
  type WizardStep,
} from '@/types/domain/simulator-wizard';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface WizardStepIndicatorProps {
  wizard: UseSimulatorWizardReturn;
}

const STEP_ICONS: Record<WizardStep, React.ElementType> = {
  product: Package,
  location: MapPin,
  technique: Palette,
  options: Settings,
  result: Calculator,
};

export function WizardStepIndicator({ wizard }: WizardStepIndicatorProps) {
  const currentIndex = WIZARD_STEPS.indexOf(wizard.currentStep);
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Mobile: Compact pills */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">
            Passo {currentIndex + 1} de {WIZARD_STEPS.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {WIZARD_STEP_CONFIG[wizard.currentStep].shortLabel}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${wizard.stepProgress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Desktop: Horizontal steps */}
      <div className="hidden sm:flex items-center justify-between">
        {WIZARD_STEPS.map((step, idx) => {
          const config = WIZARD_STEP_CONFIG[step];
          const Icon = STEP_ICONS[step];
          const isCompleted = wizard.isStepComplete(step) && idx < currentIndex;
          const isCurrent = step === wizard.currentStep;
          const isClickable = wizard.canNavigateToStep(step);
          const isPast = idx < currentIndex;

          return (
            <div key={step} className="flex items-center flex-1">
              <motion.button
                onClick={() => isClickable && wizard.setStep(step)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 transition-all w-full',
                  isCurrent && 'bg-primary/10',
                  isClickable && !isCurrent && 'hover:bg-muted/80 cursor-pointer',
                  !isClickable && 'cursor-not-allowed opacity-50'
                )}
                whileHover={isClickable && !isCurrent ? { scale: 1.02 } : undefined}
                whileTap={isClickable && !isCurrent ? { scale: 0.98 } : undefined}
              >
                {/* Icon Circle */}
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0',
                  isCurrent && 'bg-primary text-primary-foreground shadow-lg shadow-primary/25',
                  isCompleted && !isCurrent && 'bg-success/15 text-success',
                  !isCurrent && !isCompleted && 'bg-muted text-muted-foreground'
                )}>
                  {isCompleted && !isCurrent ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                {/* Label */}
                <div className="text-left min-w-0">
                  <p className={cn(
                    'text-xs uppercase tracking-wide',
                    isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}>
                    Passo {idx + 1}
                  </p>
                  <p className={cn(
                    'text-sm font-semibold truncate',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {config.shortLabel}
                  </p>
                </div>
              </motion.button>

              {/* Connector Line */}
              {idx < WIZARD_STEPS.length - 1 && (
                <div className="flex-1 px-2 hidden lg:block">
                  <div className={cn(
                    'h-0.5 rounded-full transition-colors',
                    isPast ? 'bg-success' : 'bg-border'
                  )} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
