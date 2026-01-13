/**
 * SimuladorWizard - Nova página do Simulador com layout arejado
 */

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
import { Calculator } from "lucide-react";

export default function SimuladorWizard() {
  const wizard = useSimulatorWizard();

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-8rem)] animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Simulador de Personalização</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Configure e compare custos de gravação em poucos passos
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-10">
          <WizardStepIndicator wizard={wizard} />
        </div>

        {/* Step Content */}
        <div className="pb-12">
          {wizard.currentStep === 'product' && <StepProduct wizard={wizard} />}
          {wizard.currentStep === 'location' && <StepLocation wizard={wizard} />}
          {wizard.currentStep === 'technique' && <StepTechnique wizard={wizard} />}
          {wizard.currentStep === 'options' && <StepOptions wizard={wizard} />}
          {wizard.currentStep === 'result' && <StepResult wizard={wizard} />}
        </div>
      </div>
    </MainLayout>
  );
}
