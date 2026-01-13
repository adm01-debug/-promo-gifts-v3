/**
 * Domain Types: Simulator Wizard Architecture
 * 
 * Arquitetura modular para o fluxo do simulador:
 * Produto → Local de Gravação → Técnica → Opções (Cores/Tamanho) → Resultado
 * 
 * Fontes de dados:
 * - Regras de Grupo: product_groups → product_group_components → product_group_locations → product_group_location_techniques
 * - Regras de Produto: product_components → product_component_locations → product_component_location_techniques
 * - Técnicas: personalization_techniques (CRUD principal)
 * 
 * Hierarquia de prioridade: Produto > Grupo > Global
 */

// ============================================
// STEPS DO WIZARD
// ============================================

export type WizardStep = 
  | 'product'      // Passo 1: Selecionar produto + quantidade
  | 'location'     // Passo 2: Selecionar local de gravação
  | 'technique'    // Passo 3: Selecionar técnica de personalização
  | 'options'      // Passo 4: Configurar opções (cores, tamanho)
  | 'result';      // Passo 5: Ver resultado

export const WIZARD_STEPS: WizardStep[] = [
  'product',
  'location', 
  'technique',
  'options',
  'result'
];

export interface WizardStepConfig {
  step: WizardStep;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const WIZARD_STEP_CONFIG: Record<WizardStep, WizardStepConfig> = {
  product: {
    step: 'product',
    label: 'Selecionar Produto',
    shortLabel: 'Produto',
    icon: 'Package',
    description: 'Escolha o produto e quantidade'
  },
  location: {
    step: 'location',
    label: 'Local de Gravação',
    shortLabel: 'Local',
    icon: 'MapPin',
    description: 'Selecione onde será aplicada a personalização'
  },
  technique: {
    step: 'technique',
    label: 'Técnica de Gravação',
    shortLabel: 'Técnica',
    icon: 'Palette',
    description: 'Escolha a técnica de personalização'
  },
  options: {
    step: 'options',
    label: 'Configurar Opções',
    shortLabel: 'Opções',
    icon: 'Settings',
    description: 'Configure cores, tamanho e posições'
  },
  result: {
    step: 'result',
    label: 'Ver Resultado',
    shortLabel: 'Resultado',
    icon: 'Calculator',
    description: 'Visualize o cálculo final'
  }
};

// ============================================
// PRODUTO SELECIONADO
// ============================================

export interface SelectedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  customPrice?: number; // Preço negociado
  imageUrl?: string | null;
  categoryName?: string | null;
  brand?: string | null;
}

// ============================================
// LOCAL DE GRAVAÇÃO
// ============================================

export interface EngravingLocation {
  id: string;
  componentId: string;
  componentCode: string;
  componentName: string;
  locationCode: string;
  locationName: string;
  maxWidthCm: number | null;
  maxHeightCm: number | null;
  maxAreaCm2: number | null;
  areaImageUrl: string | null;
  isFromGroup: boolean; // true se veio de regras de grupo
  availableTechniques: AvailableTechnique[];
}

export interface AvailableTechnique {
  id: string;
  techniqueId: string;
  techniqueName: string;
  techniqueCode: string;
  maxColors: number | null;
  isDefault: boolean;
  isCurved?: boolean;
}

// ============================================
// TÉCNICA SELECIONADA
// ============================================

export interface SelectedTechnique {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unitCost: number;
  setupCost: number;
  estimatedDays: number;
  minQuantity: number;
  // Limites do local de gravação
  maxColors: number | null;
  maxWidth: number | null;
  maxHeight: number | null;
  maxArea: number | null;
  // Flags de configuração necessária
  requiresColorSelection: boolean;
  requiresSizeSelection: boolean;
}

// ============================================
// OPÇÕES DE CONFIGURAÇÃO
// ============================================

export interface EngravingOptions {
  colors: number;
  width: number;
  height: number;
  positions: number;
  sizeOption?: string; // Código da opção de tamanho (ex: "pequeno", "medio", "grande")
  colorOption?: string; // Código da opção de cor
  tableCode?: string; // Código da tabela de preço usada
}

// ============================================
// RESULTADO DA SIMULAÇÃO
// ============================================

export interface SimulationPriceResult {
  // Identificação
  id: string;
  timestamp: number;
  
  // Produto
  product: {
    id: string;
    name: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  };
  
  // Local de gravação
  location: {
    componentName: string;
    locationName: string;
    maxDimensions: string;
  };
  
  // Técnica
  technique: {
    id: string;
    code: string;
    name: string;
    estimatedDays: number;
  };
  
  // Opções aplicadas
  options: {
    colors: number;
    width: number;
    height: number;
    positions: number;
    area: number;
  };
  
  // Custos de personalização
  customization: {
    unitCost: number;
    setupCost: number;
    totalCost: number;
    costPerUnit: number;
  };
  
  // Totais
  totals: {
    productTotal: number;
    customizationTotal: number;
    grandTotal: number;
    grandTotalPerUnit: number;
  };
  
  // Metadata para cálculo
  priceTableUsed?: string;
  tierApplied?: string;
}

// ============================================
// ESTADO COMPLETO DO WIZARD
// ============================================

export interface SimulatorWizardState {
  // Navegação
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  
  // Passo 1: Produto
  selectedProduct: SelectedProduct | null;
  quantity: number;
  useNegotiatedPrice: boolean;
  negotiatedPrice: number | null;
  
  // Passo 2: Local
  availableLocations: EngravingLocation[];
  selectedLocation: EngravingLocation | null;
  
  // Passo 3: Técnica
  availableTechniques: SelectedTechnique[];
  selectedTechnique: SelectedTechnique | null;
  
  // Passo 4: Opções
  engravingOptions: EngravingOptions;
  
  // Passo 5: Resultado
  result: SimulationPriceResult | null;
  
  // UI State
  isCalculating: boolean;
  error: string | null;
}

// ============================================
// ACTIONS DO WIZARD
// ============================================

export type WizardAction =
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'SELECT_PRODUCT'; payload: SelectedProduct | null }
  | { type: 'SET_QUANTITY'; payload: number }
  | { type: 'SET_NEGOTIATED_PRICE'; payload: { enabled: boolean; price: number | null } }
  | { type: 'SET_AVAILABLE_LOCATIONS'; payload: EngravingLocation[] }
  | { type: 'SELECT_LOCATION'; payload: EngravingLocation | null }
  | { type: 'SET_AVAILABLE_TECHNIQUES'; payload: SelectedTechnique[] }
  | { type: 'SELECT_TECHNIQUE'; payload: SelectedTechnique | null }
  | { type: 'UPDATE_OPTIONS'; payload: Partial<EngravingOptions> }
  | { type: 'SET_RESULT'; payload: SimulationPriceResult | null }
  | { type: 'SET_CALCULATING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_WIZARD' }
  | { type: 'RESET_FROM_STEP'; payload: WizardStep };

// ============================================
// HELPERS
// ============================================

export const getStepIndex = (step: WizardStep): number => {
  return WIZARD_STEPS.indexOf(step);
};

export const getNextStep = (currentStep: WizardStep): WizardStep | null => {
  const index = getStepIndex(currentStep);
  if (index < WIZARD_STEPS.length - 1) {
    return WIZARD_STEPS[index + 1];
  }
  return null;
};

export const getPreviousStep = (currentStep: WizardStep): WizardStep | null => {
  const index = getStepIndex(currentStep);
  if (index > 0) {
    return WIZARD_STEPS[index - 1];
  }
  return null;
};

export const isStepComplete = (step: WizardStep, state: SimulatorWizardState): boolean => {
  switch (step) {
    case 'product':
      return state.selectedProduct !== null && state.quantity > 0;
    case 'location':
      return state.selectedLocation !== null;
    case 'technique':
      return state.selectedTechnique !== null;
    case 'options':
      return state.engravingOptions.colors > 0 && 
             state.engravingOptions.width > 0 && 
             state.engravingOptions.height > 0;
    case 'result':
      return state.result !== null;
    default:
      return false;
  }
};

export const canNavigateToStep = (targetStep: WizardStep, state: SimulatorWizardState): boolean => {
  const targetIndex = getStepIndex(targetStep);
  
  // Sempre pode ir para passos anteriores
  const currentIndex = getStepIndex(state.currentStep);
  if (targetIndex <= currentIndex) return true;
  
  // Para ir para frente, todos os passos anteriores devem estar completos
  for (let i = 0; i < targetIndex; i++) {
    if (!isStepComplete(WIZARD_STEPS[i], state)) {
      return false;
    }
  }
  
  return true;
};
