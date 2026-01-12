import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Palette,
  Calculator,
  FileText,
  Users,
  Sparkles,
  ArrowRight,
  X,
  Rocket,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface WelcomeModalProps {
  open?: boolean;
  onClose?: () => void;
  onStartTour?: () => void;
}

const WELCOME_STORAGE_KEY = "onboarding_welcome_seen";

const features = [
  {
    icon: Package,
    title: "Catálogo Inteligente",
    description: "Explore milhares de produtos com filtros avançados e busca inteligente",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Palette,
    title: "Mockups Personalizados",
    description: "Crie visualizações profissionais com logos e cores do cliente",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Calculator,
    title: "Simulador de Preços",
    description: "Calcule custos de personalização em tempo real com precisão",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: FileText,
    title: "Orçamentos Rápidos",
    description: "Gere propostas profissionais em minutos, não horas",
    color: "from-emerald-500 to-teal-500",
  },
];

const quickStats = [
  { value: "5000+", label: "Produtos", icon: Package },
  { value: "50+", label: "Fornecedores", icon: Users },
  { value: "100+", label: "Técnicas", icon: Palette },
];

export function WelcomeModal({ open, onClose, onStartTour }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if this is a controlled component
    if (open !== undefined) {
      setIsOpen(open);
      return;
    }

    // Check if user has seen welcome modal
    const hasSeen = localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!hasSeen) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleClose = () => {
    localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    setIsOpen(false);
    onClose?.();
  };

  const handleStartTour = () => {
    localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    setIsOpen(false);
    onStartTour?.();
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const progress = ((currentStep + 1) / 3) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0 bg-gradient-to-br from-background via-background to-muted/20">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-50 h-8 w-8 rounded-full"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25"
                >
                  <Rocket className="h-10 w-10 text-primary-foreground" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
                >
                  Bem-vindo ao Catálogo Pro! 🎉
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground mt-2"
                >
                  Sua plataforma completa para brindes corporativos
                </motion.p>
              </div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-3 gap-4 mb-8"
              >
                {quickStats.map((stat, index) => (
                  <div
                    key={index}
                    className="text-center p-4 rounded-xl bg-muted/50 border border-border/50"
                  >
                    <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-3"
              >
                <Button size="lg" className="w-full gap-2" onClick={handleNext}>
                  Conhecer Recursos
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
                  Pular introdução
                </Button>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Recursos Principais</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ferramentas poderosas para seu dia a dia
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="group p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-all cursor-default"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3 shadow-sm",
                        feature.color
                      )}
                    >
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handlePrev}>
                  Voltar
                </Button>
                <Button className="flex-1 gap-2" onClick={handleNext}>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg"
                >
                  <Zap className="h-8 w-8 text-white" />
                </motion.div>
                <h2 className="text-xl font-bold">Pronto para Começar!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha como você quer explorar a plataforma
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={handleStartTour}
                  className="w-full p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        Tour Guiado
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Deixe-me mostrar os recursos principais em 2 minutos
                      </p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={handleClose}
                  className="w-full p-4 rounded-xl border border-border hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-semibold">Explorar Sozinho</div>
                      <p className="text-sm text-muted-foreground">
                        Já conheço plataformas similares, quero explorar
                      </p>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Back button */}
              <Button variant="ghost" className="w-full" onClick={handlePrev}>
                Voltar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="px-8 pb-6">
          <Progress value={progress} className="h-1" />
          <div className="flex justify-center gap-1 mt-3">
            {[0, 1, 2].map((step) => (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  step === currentStep
                    ? "bg-primary w-6"
                    : step < currentStep
                    ? "bg-primary/50"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to control welcome modal
export function useWelcomeModal() {
  const [showWelcome, setShowWelcome] = useState(false);

  const openWelcome = () => setShowWelcome(true);
  const closeWelcome = () => setShowWelcome(false);
  const resetWelcome = () => {
    localStorage.removeItem(WELCOME_STORAGE_KEY);
    setShowWelcome(true);
  };

  return {
    showWelcome,
    openWelcome,
    closeWelcome,
    resetWelcome,
  };
}
