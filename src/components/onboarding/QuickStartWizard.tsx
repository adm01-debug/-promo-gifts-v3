import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  User,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MiniConfetti } from "@/components/effects/MiniConfetti";

interface QuickStartWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Package;
  action: string;
  route: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "product",
    title: "Escolha um Produto",
    description: "Navegue pelo catálogo e selecione um brinde para seu cliente",
    icon: Package,
    action: "Explorar Catálogo",
    route: "/",
  },
  {
    id: "client",
    title: "Selecione o Cliente",
    description: "Escolha um cliente Bitrix ou cadastre um novo",
    icon: User,
    action: "Ver Clientes",
    route: "/clientes",
  },
  {
    id: "quote",
    title: "Crie o Orçamento",
    description: "Monte o orçamento com produtos, quantidades e personalização",
    icon: FileText,
    action: "Criar Orçamento",
    route: "/orcamentos/novo",
  },
];

export function QuickStartWizard({ isOpen, onClose, onComplete }: QuickStartWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const step = WIZARD_STEPS[currentStep];
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  const handleStepAction = () => {
    // Mark current step as completed
    if (!completedSteps.includes(step.id)) {
      setCompletedSteps([...completedSteps, step.id]);
    }

    if (isLastStep) {
      // Complete wizard
      setShowConfetti(true);
      setTimeout(() => {
        onComplete?.();
        onClose();
        navigate(step.route);
      }, 1500);
    } else {
      // Navigate to route and advance
      navigate(step.route);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <MiniConfetti trigger={showConfetti} count={40} duration={2000} />
      
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-lg"
          >
            <Card className="overflow-hidden border-2 border-primary/20 shadow-2xl">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">
                        Seu Primeiro Orçamento
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Em apenas 3 passos simples
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Passo {currentStep + 1} de {WIZARD_STEPS.length}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>

              {/* Step Indicators */}
              <div className="flex justify-center gap-2 py-4 border-b">
                {WIZARD_STEPS.map((s, idx) => {
                  const StepIcon = s.icon;
                  const isComplete = completedSteps.includes(s.id);
                  const isCurrent = idx === currentStep;
                  
                  return (
                    <button
                      key={s.id}
                      onClick={() => setCurrentStep(idx)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                        "hover:scale-105 active:scale-95",
                        isComplete && "bg-success text-success-foreground",
                        isCurrent && !isComplete && "bg-primary text-primary-foreground",
                        !isCurrent && !isComplete && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Step Content */}
              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-center"
                  >
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                      <step.icon className="h-8 w-8 text-primary" />
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                      {step.description}
                    </p>

                    {/* Primary Action */}
                    <Button
                      size="lg"
                      onClick={handleStepAction}
                      className="w-full gap-2 button-ripple"
                    >
                      {isLastStep ? (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Concluir e Criar
                        </>
                      ) : (
                        <>
                          {step.action}
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </AnimatePresence>
              </CardContent>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t px-6 py-4 bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={isLastStep}
                  className="text-muted-foreground"
                >
                  Pular etapa
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
