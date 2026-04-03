/**
 * QuoteBuilderStepper — Indicador visual de progresso para o fluxo de orçamento
 * 4 etapas: Cliente → Itens → Condições → Revisão
 */

import { Check, Building2, Package, CreditCard, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type QuoteBuilderStep = "client" | "items" | "conditions" | "review";

interface StepDef {
  id: QuoteBuilderStep;
  label: string;
  icon: typeof Building2;
}

const STEPS: StepDef[] = [
  { id: "client", label: "Cliente", icon: Building2 },
  { id: "items", label: "Itens", icon: Package },
  { id: "conditions", label: "Condições", icon: CreditCard },
  { id: "review", label: "Revisão", icon: FileCheck },
];

interface QuoteBuilderStepperProps {
  completedSteps: QuoteBuilderStep[];
  activeStep?: QuoteBuilderStep;
  className?: string;
}

export function QuoteBuilderStepper({
  completedSteps,
  activeStep,
  className,
}: QuoteBuilderStepperProps) {
  // Determine first incomplete step as "current"
  const currentStepIndex = STEPS.findIndex(s => !completedSteps.includes(s.id));
  const effectiveActiveIndex = activeStep
    ? STEPS.findIndex(s => s.id === activeStep)
    : currentStepIndex === -1 ? STEPS.length - 1 : currentStepIndex;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = index === effectiveActiveIndex;
          const isPast = index < effectiveActiveIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2 relative">
                {/* Pulse ring for current step */}
                {isCurrent && !isCompleted && (
                  <motion.div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary/20"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                    backgroundColor: isCompleted
                      ? "hsl(var(--primary) / 0.15)"
                      : isCurrent
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted) / 0.5)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 relative z-10 transition-shadow",
                    isCompleted && "border-primary",
                    isCurrent && !isCompleted && "border-primary shadow-lg shadow-primary/25",
                    !isCompleted && !isCurrent && "border-border/60"
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Check className="h-4 w-4 text-primary" />
                    </motion.div>
                  ) : (
                    <Icon className={cn(
                      "h-4 w-4",
                      isCurrent ? "text-primary-foreground" : "text-muted-foreground/60"
                    )} />
                  )}
                </motion.div>
                <span
                  className={cn(
                    "text-xs font-semibold transition-colors whitespace-nowrap",
                    isCurrent && "text-primary",
                    isCompleted && "text-foreground",
                    !isCurrent && !isCompleted && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-3 mt-[-1.25rem] relative overflow-hidden rounded-full bg-border/40">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                    initial={false}
                    animate={{
                      width: isCompleted ? "100%" : isCurrent ? "30%" : "0%",
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
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
