/**
 * SimuladorWizard v2 - Produto → Local → Specs → Comparativo
 */

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSimulatorWizard } from "@/hooks/simulator/useSimulatorWizard";
import { 
  WizardStepIndicator, 
  StepProduct, 
  StepLocation, 
  StepSpecs,
  StepComparison,
  PersonalizationSummary,
  PersonalizationTabs,
} from "@/components/simulator/wizard";
import { MobilePersonalizationSummary } from "@/components/simulator/wizard/MobilePersonalizationSummary";
import { Calculator } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { SelectedProduct } from "@/types/domain/simulator-wizard";

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
  const navigate = useNavigate();
  const wizard = useSimulatorWizard();
  const hasProcessedPreSelection = useRef(false);

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

  const isInPersonalizationFlow = wizard.selectedProduct !== null && wizard.currentStep !== 'product';
  const showSidebar = isInPersonalizationFlow && wizard.personalizations.length > 0;

  const handleAddNewPersonalization = () => {
    wizard.startNewPersonalization();
  };

  const handleGenerateQuote = () => {
    const quoteData = {
      product: wizard.selectedProduct,
      quantity: wizard.quantity,
      personalizations: wizard.personalizations,
      totals: wizard.totals,
    };
    navigate('/orcamentos/novo', { state: { fromSimulator: true, simulationData: quoteData } });
    toast.success('Redirecionando para o orçamento...');
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-8rem)]">
        {/* Compact Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-6 px-1"
        >
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
            <Calculator className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              Simulador de Personalização
            </h1>
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

            {/* Tabs de Personalizações */}
            {isInPersonalizationFlow && wizard.personalizations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-6 max-w-5xl mx-auto"
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
              {wizard.currentStep === 'specs' && <StepSpecs wizard={wizard} />}
              {wizard.currentStep === 'comparison' && <StepComparison wizard={wizard} />}
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
                onGenerateQuote={handleGenerateQuote}
                showAddButton={!wizard.isEditingPersonalization}
              />
            </motion.aside>
          )}
        </div>

        {/* Mobile Summary Bottom Bar */}
        {showSidebar && (
          <MobilePersonalizationSummary
            wizard={wizard}
            onAddNew={handleAddNewPersonalization}
            onGenerateQuote={handleGenerateQuote}
          />
        )}
      </div>
    </MainLayout>
  );
}
