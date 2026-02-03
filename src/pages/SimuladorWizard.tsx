/**
 * SimuladorWizard - Página do Simulador com layout premium e arejado
 * 
 * Suporta MÚLTIPLAS PERSONALIZAÇÕES por produto.
 * Fluxo: Produto → (Local → Técnica → Config) × N → Resultado
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
  StepResult,
  PersonalizationSummary,
  PersonalizationTabs,
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
      
      const product: SelectedProduct = {
        id: preSelectedProduct.id,
        name: preSelectedProduct.name,
        sku: preSelectedProduct.sku,
        price: preSelectedProduct.price,
        imageUrl: preSelectedProduct.imageUrl,
        categoryName: preSelectedProduct.categoryName,
      };
      
      wizard.selectProduct(product);
      
      toast.success(`${preSelectedProduct.name} selecionado`, {
        description: "Continue configurando a personalização",
        duration: 3000,
      });
    }
  }, [location.state, wizard.selectProduct]);

  // Verificar se está em fluxo de personalização (após selecionar produto)
  const isInPersonalizationFlow = wizard.selectedProduct !== null && wizard.currentStep !== 'product';
  const showSidebar = isInPersonalizationFlow && wizard.currentStep !== 'result';

  const handleAddNewPersonalization = () => {
    wizard.startNewPersonalization();
  };

  const handleFinalizeSimulation = async () => {
    // Se há personalização em andamento, confirmar primeiro
    if (wizard.selectedLocation && wizard.selectedTechnique) {
      await wizard.confirmPersonalization();
    }
    await wizard.calculateResult();
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-8rem)]">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -top-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
          </div>

          <div className="text-center py-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="inline-flex items-center gap-3 mb-3"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                  <Calculator className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <div className="text-left">
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  Simulador
                </h1>
                <p className="text-primary font-medium text-sm flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Personalização
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Layout com Sidebar */}
        <div className={`flex gap-6 ${showSidebar ? 'lg:pr-80' : ''}`}>
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Step Indicator */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <WizardStepIndicator wizard={wizard} />
            </motion.div>

            {/* Tabs de Personalizações (só mostra quando há produto selecionado) */}
            {isInPersonalizationFlow && wizard.currentStep !== 'result' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-6 max-w-4xl mx-auto"
              >
                <PersonalizationTabs 
                  wizard={wizard} 
                  onAddNew={handleAddNewPersonalization}
                />
              </motion.div>
            )}

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

          {/* Sidebar - Resumo */}
          {showSidebar && (
            <motion.aside
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="hidden lg:block fixed right-4 top-32 bottom-8 w-72 rounded-2xl border bg-card shadow-xl overflow-hidden"
            >
              <PersonalizationSummary
                wizard={wizard}
                onAddNew={handleAddNewPersonalization}
                onFinalize={handleFinalizeSimulation}
                showAddButton={wizard.personalizations.length > 0 && !wizard.isEditingPersonalization}
              />
            </motion.aside>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
