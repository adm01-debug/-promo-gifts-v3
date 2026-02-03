/**
 * Domain Types: Simulator Wizard Architecture
 * 
 * Arquitetura modular para o fluxo do simulador com MÚLTIPLAS PERSONALIZAÇÕES:
 * Produto → (Local → Técnica → Configuração) × N → Resultado
 * 
 * Cada produto pode ter múltiplas gravações (ex: capa + contra-capa)
 * O sistema soma os custos de todas as personalizações no resultado final
 */

// ============================================
// STEPS DO WIZARD
// ============================================

export type WizardStep = 
  | 'product'        // Passo 1: Selecionar produto + quantidade
  | 'location'       // Passo 2: Selecionar local de gravação
  | 'technique'      // Passo 3: Selecionar técnica de personalização
  | 'configuration'  // Passo 4: Configurar opções (cores, tamanho)
  | 'result';        // Passo 5: Ver resultado

export const WIZARD_STEPS: WizardStep[] = [
  'product',
  'location', 
  'technique',
  'configuration',
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
  configuration: {
    step: 'configuration',
    label: 'Configurações',
    shortLabel: 'Configuração',
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
  sizeOption?: string;
  colorOption?: string;
  tableCode?: string;
}

// ============================================
// PERSONALIZAÇÃO INDIVIDUAL (GRAVAÇÃO)
// ============================================

export interface Personalization {
  id: string;
  index: number; // 1, 2, 3...
  location: EngravingLocation;
  technique: SelectedTechnique;
  options: EngravingOptions;
  // Custos calculados
  unitCost: number;
  setupCost: number;
  totalCost: number;
  costPerUnit: number;
  estimatedDays: number;
  // Metadata
  priceTableUsed?: string;
  tierApplied?: string;
}

// ============================================
// RESULTADO DA SIMULAÇÃO (COM MÚLTIPLAS GRAVAÇÕES)
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
  
  // Todas as personalizações
  personalizations: PersonalizationResult[];
  
  // Totais
  totals: {
    productTotal: number;
    customizationTotal: number;
    grandTotal: number;
    grandTotalPerUnit: number;
  };
  
  // Maior prazo entre todas as personalizações
  maxEstimatedDays: number;
}

export interface PersonalizationResult {
  id: string;
  index: number;
  location: {
    componentName: string;
    locationName: string;
    maxDimensions: string;
  };
  technique: {
    id: string;
    code: string;
    name: string;
    estimatedDays: number;
  };
  options: {
    colors: number;
    width: number;
    height: number;
    positions: number;
    area: number;
  };
  customization: {
    unitCost: number;
    setupCost: number;
    totalCost: number;
    costPerUnit: number;
  };
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
  
  // Personalizações confirmadas (gravações já adicionadas)
  personalizations: Personalization[];
  
  // Personalização atual em edição
  currentPersonalizationIndex: number; // 0 = primeira, 1 = segunda...
  isEditingPersonalization: boolean;
  
  // Passo 2: Local (personalização atual)
  availableLocations: EngravingLocation[];
  selectedLocation: EngravingLocation | null;
  
  // Passo 3: Técnica (personalização atual)
  availableTechniques: SelectedTechnique[];
  selectedTechnique: SelectedTechnique | null;
  
  // Passo 4: Opções (personalização atual)
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
  | { type: 'ADD_PERSONALIZATION'; payload: Personalization }
  | { type: 'REMOVE_PERSONALIZATION'; payload: string } // id
  | { type: 'EDIT_PERSONALIZATION'; payload: number } // index
  | { type: 'START_NEW_PERSONALIZATION' }
  | { type: 'CANCEL_PERSONALIZATION' }
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
    case 'configuration':
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

// ============================================
// HELPERS PARA CÁLCULO DE CUSTO
// ============================================

export const calculatePersonalizationCost = (
  technique: SelectedTechnique,
  options: EngravingOptions,
  quantity: number
): { unitCost: number; setupCost: number; totalCost: number; costPerUnit: number } => {
  const area = options.width * options.height;
  const codeUpper = technique.code.toUpperCase();
  
  let unitCostMultiplier = 1;
  
  if (codeUpper.includes('SILK') || codeUpper.includes('SERIGRAFIA') || codeUpper.includes('TAMPOGRAFIA')) {
    unitCostMultiplier = options.colors;
  } else if (codeUpper.includes('DTF') || codeUpper.includes('SUB') || codeUpper.includes('SUBLIM')) {
    unitCostMultiplier = Math.max(1, area / 100);
  } else if (codeUpper.includes('BORD') || codeUpper.includes('EMBROID')) {
    unitCostMultiplier = Math.max(1, (area / 50) * Math.max(1, options.colors * 0.5));
  } else if (codeUpper.includes('LASER')) {
    unitCostMultiplier = Math.max(1, area / 100);
  } else if (codeUpper.includes('TRANSFER')) {
    unitCostMultiplier = Math.max(1, area / 80);
  } else if (codeUpper.includes('HOT') || codeUpper.includes('STAMP')) {
    unitCostMultiplier = Math.max(1, area / 50);
  } else if (codeUpper.includes('UV') || codeUpper.includes('DIGITAL')) {
    unitCostMultiplier = Math.max(1, area / 100) * Math.max(1, options.colors * 0.3);
  }

  const finalUnitCost = technique.unitCost * unitCostMultiplier * options.positions;
  const finalSetupCost = technique.setupCost * options.positions * 
    ((codeUpper.includes('SILK') || codeUpper.includes('SERIGRAFIA')) ? options.colors : 1);
  const totalCost = (finalUnitCost * quantity) + finalSetupCost;
  const costPerUnit = totalCost / quantity;

  return {
    unitCost: finalUnitCost,
    setupCost: finalSetupCost,
    totalCost,
    costPerUnit,
  };
};
