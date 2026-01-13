/**
 * WizardStepIndicator - Indicador visual dos passos do wizard
 * 
 * Mostra progresso e permite navegação entre passos completados
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Package, MapPin, Palette, Settings, Calculator, Check } from 'lucide-react';
import { 
  WIZARD_STEPS, 
  WIZARD_STEP_CONFIG,
  type WizardStep,
  getStepIndex,
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
  const currentIndex = getStepIndex(wizard.currentStep);
  
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative mb-2">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80"
            initial={{ width: 0 }}
            animate={{ width: `${wizard.stepProgress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <span className="absolute right-0 top-2 text-xs text-muted-foreground">
          {Math.round(wizard.stepProgress)}%
        </span>
      </div>

      {/* Steps */}
      <div className="flex items-stretch gap-2 mt-4">
        {WIZARD_STEPS.map((step, idx) => {
          const config = WIZARD_STEP_CONFIG[step];
          const Icon = STEP_ICONS[step];
          const isCompleted = wizard.isStepComplete(step) && idx < currentIndex;
          const isCurrent = step === wizard.currentStep;
          const isClickable = wizard.canNavigateToStep(step);
          const isPast = idx < currentIndex;

          return (
            <motion.button
              key={step}
              onClick={() => isClickable && wizard.setStep(step)}
              disabled={!isClickable}
              className={cn(
                'flex-1 relative rounded-xl p-3 transition-all',
                'border-2 flex flex-col items-start gap-2',
                isCurrent && 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20',
                isCompleted && !isCurrent && 'border-success/50 bg-success/5',
                !isCurrent && !isCompleted && 'border-border bg-card',
                isClickable && !isCurrent && 'hover:border-primary/50 hover:bg-muted/50 cursor-pointer',
                !isClickable && 'opacity-50 cursor-not-allowed'
              )}
              whileHover={isClickable && !isCurrent ? { scale: 1.02 } : undefined}
              whileTap={isClickable && !isCurrent ? { scale: 0.98 } : undefined}
            >
              {/* Icon */}
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                isCurrent && 'bg-primary text-primary-foreground',
                isCompleted && !isCurrent && 'bg-success text-success-foreground',
                !isCurrent && !isCompleted && 'bg-muted text-muted-foreground'
              )}>
                {isCompleted && !isCurrent ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Text */}
              <div className="text-left">
                <p className={cn(
                  'text-[10px] font-medium uppercase tracking-wider',
                  isCurrent ? 'text-primary' : 'text-muted-foreground'
                )}>
                  Passo {idx + 1}
                </p>
                <p className={cn(
                  'text-sm font-semibold line-clamp-1',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {config.shortLabel}
                </p>
              </div>

              {/* Connector line */}
              {idx < WIZARD_STEPS.length - 1 && (
                <div className={cn(
                  'absolute -right-3 top-1/2 w-4 h-0.5 z-10',
                  isPast ? 'bg-success' : 'bg-border'
                )} />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
