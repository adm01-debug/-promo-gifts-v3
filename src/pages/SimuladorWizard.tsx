/**
 * SimuladorWizard - Página do Simulador com layout premium e arejado
 * 
 * Suporta receber produto pré-selecionado via location.state.preSelectedProduct
 */

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSimulatorWizard } from "@/hooks/simulator/useSimulatorWizard";
import { 
  WizardStepIndicator, 
  StepProduct, 
  StepLocation, 
  StepTechnique, 
  StepOptions, 
  StepResult 
} from "@/components/simulator/wizard";
import { Calculator, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { SelectedProduct } from "@/types/domain/simulator-wizard";

// Interface para dados do produto vindos via state
interface PreSelectedProductState {
  id: string;
  name: string;
  sku: string;
  price: number;
  imageUrl?: string | null;
  categoryName?: string | null;
}

export default function SimuladorWizard() {
  const location = useLocation();
  const wizard = useSimulatorWizard();
  const hasProcessedPreSelection = useRef(false);

  // Processar produto pré-selecionado via state (vindo do ProductDetail)
  useEffect(() => {
    if (hasProcessedPreSelection.current) return;
    
    const preSelectedProduct = (location.state as { preSelectedProduct?: PreSelectedProductState })?.preSelectedProduct;
    
    if (preSelectedProduct?.id) {
      hasProcessedPreSelection.current = true;
      
      // Converter para SelectedProduct
      const product: SelectedProduct = {
        id: preSelectedProduct.id,
        name: preSelectedProduct.name,
        sku: preSelectedProduct.sku,
        price: preSelectedProduct.price,
        imageUrl: preSelectedProduct.imageUrl,
        categoryName: preSelectedProduct.categoryName,
      };
      
      // Selecionar o produto automaticamente
      wizard.selectProduct(product);
      
      toast.success(`${preSelectedProduct.name} selecionado`, {
        description: "Continue configurando a personalização",
        duration: 3000,
      });
    }
  }, [location.state, wizard.selectProduct]);

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-8rem)]">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mb-10"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -top-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
          </div>

          <div className="text-center py-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="inline-flex items-center gap-3 mb-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                  <Calculator className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
              <div className="text-left">
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  Simulador
                </h1>
                <p className="text-primary font-medium text-sm flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Personalização
                </p>
              </div>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground max-w-md mx-auto"
            >
              Configure e compare custos de gravação em poucos passos simples
            </motion.p>
          </div>
        </motion.div>

        {/* Step Indicator */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <WizardStepIndicator wizard={wizard} />
        </motion.div>

        {/* Step Content */}
        <motion.div 
          key={wizard.currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="pb-16"
        >
          {wizard.currentStep === 'product' && <StepProduct wizard={wizard} />}
          {wizard.currentStep === 'location' && <StepLocation wizard={wizard} />}
          {wizard.currentStep === 'technique' && <StepTechnique wizard={wizard} />}
          {wizard.currentStep === 'configuration' && <StepOptions wizard={wizard} />}
          {wizard.currentStep === 'result' && <StepResult wizard={wizard} />}
        </motion.div>
      </div>
    </MainLayout>
  );
}
