// src/components/simulator/SimulatorStepIndicator.tsx
// Indicador de progresso do wizard com progress bar animada

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

const steps: { id: SimulatorStep; label: string; shortLabel: string; icon: typeof Package }[] = [
  { id: 'product', label: 'Selecionar Produto', shortLabel: 'Produto', icon: Package },
  { id: 'techniques', label: 'Configurar Técnicas', shortLabel: 'Técnicas', icon: Palette },
  { id: 'results', label: 'Ver Resultados', shortLabel: 'Resultados', icon: BarChart3 },
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

  // Calculate progress percentage
  const getProgressPercentage = () => {
    let completed = 0;
    if (hasProduct) completed++;
    if (hasTechniques) completed++;
    if (hasResults) completed++;
    return (completed / 3) * 100;
  };

  const progressPercent = getProgressPercentage();

  return (
    <div className="mb-8 space-y-4">
      {/* Progress bar superior */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Progresso da simulação
          </span>
          <motion.span 
            className="text-sm font-bold text-primary"
            key={progressPercent}
            initial={{ scale: 1.2, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {Math.round(progressPercent)}%
          </motion.span>
        </div>
        
        {/* Progress bar com glow effect */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50 backdrop-blur-sm">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary-glow relative"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ 
              type: "spring", 
              stiffness: 100, 
              damping: 20,
              duration: 0.5 
            }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            {/* Glow effect */}
            {progressPercent > 0 && (
              <motion.div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary blur-md"
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-stretch gap-2 md:gap-3">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.id);
          const isActive = currentStep === step.id;
          const clickable = isStepClickable(step.id);
          const Icon = step.icon;
          const isComplete = status === 'complete';

          return (
            <motion.button
              key={step.id}
              onClick={() => clickable && onStepClick?.(step.id)}
              disabled={!clickable}
              className={cn(
                "relative flex-1 flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 rounded-xl transition-all",
                "border-2",
                isActive && "border-primary bg-primary/10 shadow-lg shadow-primary/20",
                isComplete && !isActive && "border-success/50 bg-success/5",
                status === 'pending' && "border-muted bg-muted/20",
                clickable && "cursor-pointer",
                !clickable && "cursor-not-allowed opacity-50"
              )}
              whileHover={clickable ? { scale: 1.02, y: -2 } : {}}
              whileTap={clickable ? { scale: 0.98 } : {}}
            >
              {/* Step number badge */}
              <motion.div 
                className={cn(
                  "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl relative",
                  isActive && "bg-primary text-primary-foreground",
                  isComplete && !isActive && "bg-success text-success-foreground",
                  status === 'pending' && "bg-muted text-muted-foreground"
                )}
                initial={false}
                animate={{
                  scale: isActive ? 1.05 : 1,
                  boxShadow: isActive 
                    ? "0 0 20px hsl(var(--primary) / 0.4)" 
                    : "0 0 0px transparent"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isComplete && !isActive ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Check className="h-5 w-5 md:h-6 md:w-6" />
                  </motion.div>
                ) : (
                  <Icon className="h-5 w-5 md:h-6 md:w-6" />
                )}
                
                {/* Pulse effect for active step */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-primary/20"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                )}
              </motion.div>

              {/* Labels */}
              <div className="flex flex-col items-center md:items-start">
                <span className={cn(
                  "text-xs text-muted-foreground",
                  isActive && "text-primary font-medium"
                )}>
                  Passo {idx + 1}
                </span>
                <span className={cn(
                  "font-medium text-xs md:text-sm text-center md:text-left",
                  isActive && "text-primary",
                  isComplete && !isActive && "text-success",
                  status === 'pending' && "text-muted-foreground"
                )}>
                  <span className="hidden lg:block">{step.label}</span>
                  <span className="lg:hidden">{step.shortLabel}</span>
                </span>
              </div>

              {/* Connection line (desktop) */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-0.5 z-10">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      isComplete ? "bg-success" : "bg-muted"
                    )}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
