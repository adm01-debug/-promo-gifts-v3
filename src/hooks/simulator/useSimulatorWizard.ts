/**
 * useSimulatorWizard - Hook central para orquestração do simulador
 * 
 * Gerencia o estado do wizard e coordena as transições entre passos:
 * Produto → Local de Gravação → Técnica → Opções → Resultado
 */

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  SimulatorWizardState,
  WizardAction,
  WizardStep,
  SelectedProduct,
  EngravingLocation,
  SelectedTechnique,
  EngravingOptions,
  SimulationPriceResult,
} from '@/types/domain/simulator-wizard';
import {
  WIZARD_STEPS,
  getStepIndex,
  getNextStep,
  getPreviousStep,
  isStepComplete,
  canNavigateToStep,
} from '@/types/domain/simulator-wizard';

// ============================================
// ESTADO INICIAL
// ============================================

const initialState: SimulatorWizardState = {
  currentStep: 'product',
  completedSteps: [],
  selectedProduct: null,
  quantity: 100,
  useNegotiatedPrice: false,
  negotiatedPrice: null,
  availableLocations: [],
  selectedLocation: null,
  availableTechniques: [],
  selectedTechnique: null,
  engravingOptions: {
    colors: 1,
    width: 10,
    height: 10,
    positions: 1,
  },
  result: null,
  isCalculating: false,
  error: null,
};

// ============================================
// REDUCER
// ============================================

function wizardReducer(state: SimulatorWizardState, action: WizardAction): SimulatorWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SELECT_PRODUCT':
      return {
        ...state,
        selectedProduct: action.payload,
        // Reset passos seguintes ao mudar produto
        selectedLocation: null,
        selectedTechnique: null,
        availableLocations: [],
        availableTechniques: [],
        result: null,
      };
    
    case 'SET_QUANTITY':
      return { 
        ...state, 
        quantity: action.payload,
        result: null, // Recalcular ao mudar quantidade
      };
    
    case 'SET_NEGOTIATED_PRICE':
      return {
        ...state,
        useNegotiatedPrice: action.payload.enabled,
        negotiatedPrice: action.payload.price,
        result: null,
      };
    
    case 'SET_AVAILABLE_LOCATIONS':
      return { ...state, availableLocations: action.payload };
    
    case 'SELECT_LOCATION':
      return {
        ...state,
        selectedLocation: action.payload,
        // Reset passos seguintes ao mudar local
        selectedTechnique: null,
        availableTechniques: [],
        result: null,
      };
    
    case 'SET_AVAILABLE_TECHNIQUES':
      return { ...state, availableTechniques: action.payload };
    
    case 'SELECT_TECHNIQUE':
      return {
        ...state,
        selectedTechnique: action.payload,
        // Reset opções com valores do técnica selecionada
        engravingOptions: action.payload ? {
          colors: 1,
          width: Math.min(10, action.payload.maxWidth || 50),
          height: Math.min(10, action.payload.maxHeight || 50),
          positions: 1,
        } : state.engravingOptions,
        result: null,
      };
    
    case 'UPDATE_OPTIONS':
      return {
        ...state,
        engravingOptions: { ...state.engravingOptions, ...action.payload },
        result: null,
      };
    
    case 'SET_RESULT':
      return { 
        ...state, 
        result: action.payload,
        completedSteps: action.payload ? [...new Set([...state.completedSteps, 'result' as WizardStep])] : state.completedSteps,
      };
    
    case 'SET_CALCULATING':
      return { ...state, isCalculating: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'RESET_WIZARD':
      return initialState;
    
    case 'RESET_FROM_STEP': {
      const stepIndex = getStepIndex(action.payload);
      const stepsToKeep = WIZARD_STEPS.slice(0, stepIndex + 1);
      return {
        ...state,
        currentStep: action.payload,
        completedSteps: state.completedSteps.filter(s => stepsToKeep.includes(s)),
        // Reset dados dos passos seguintes
        ...(stepIndex <= 0 && { selectedProduct: null }),
        ...(stepIndex <= 1 && { selectedLocation: null, availableLocations: [] }),
        ...(stepIndex <= 2 && { selectedTechnique: null, availableTechniques: [] }),
        ...(stepIndex <= 3 && { engravingOptions: initialState.engravingOptions }),
        result: null,
      };
    }
    
    default:
      return state;
  }
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useSimulatorWizard() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  // ============================================
  // QUERIES - Busca dados dinâmicos
  // ============================================

  // Buscar locais de gravação quando produto é selecionado
  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['wizard-locations', state.selectedProduct?.id],
    queryFn: async () => {
      if (!state.selectedProduct?.id) return [];
      
      // Buscar regras específicas do produto
      const { data: productLocations, error: prodError } = await supabase
        .from('product_components')
        .select(`
          id,
          component_code,
          component_name,
          product_component_locations (
            id,
            location_code,
            location_name,
            max_width_cm,
            max_height_cm,
            max_area_cm2,
            area_image_url,
            product_component_location_techniques (
              id,
              technique_id,
              max_colors,
              is_default,
              personalization_techniques (id, name, code)
            )
          )
        `)
        .eq('product_id', state.selectedProduct.id)
        .eq('is_active', true)
        .eq('is_personalizable', true);

      if (prodError) throw prodError;

      // Transformar em EngravingLocation[]
      const locations: EngravingLocation[] = [];
      productLocations?.forEach(comp => {
        comp.product_component_locations?.forEach((loc: any) => {
          locations.push({
            id: loc.id,
            componentId: comp.id,
            componentCode: comp.component_code,
            componentName: comp.component_name,
            locationCode: loc.location_code,
            locationName: loc.location_name,
            maxWidthCm: loc.max_width_cm,
            maxHeightCm: loc.max_height_cm,
            maxAreaCm2: loc.max_area_cm2,
            areaImageUrl: loc.area_image_url,
            isFromGroup: false,
            availableTechniques: loc.product_component_location_techniques?.map((lt: any) => ({
              id: lt.id,
              techniqueId: lt.personalization_techniques?.id || lt.technique_id,
              techniqueName: lt.personalization_techniques?.name || 'Técnica',
              techniqueCode: lt.personalization_techniques?.code || '',
              maxColors: lt.max_colors,
              isDefault: lt.is_default || false,
            })) || [],
          });
        });
      });

      return locations;
    },
    enabled: !!state.selectedProduct?.id,
    staleTime: 10 * 60 * 1000,
  });

  // Atualizar locais disponíveis quando query completar
  useEffect(() => {
    if (locationsData) {
      dispatch({ type: 'SET_AVAILABLE_LOCATIONS', payload: locationsData });
    }
  }, [locationsData]);

  // Buscar detalhes das técnicas disponíveis para o local selecionado
  const { data: techniquesData, isLoading: techniquesLoading } = useQuery({
    queryKey: ['wizard-techniques', state.selectedLocation?.id],
    queryFn: async () => {
      if (!state.selectedLocation) return [];

      const techniqueIds = state.selectedLocation.availableTechniques.map(t => t.techniqueId);
      if (techniqueIds.length === 0) return [];

      const { data, error } = await supabase
        .from('personalization_techniques')
        .select('*')
        .in('id', techniqueIds)
        .eq('is_active', true);

      if (error) throw error;

      // Combinar com dados do local de gravação
      return data?.map(tech => {
        const locationTech = state.selectedLocation!.availableTechniques.find(
          t => t.techniqueId === tech.id
        );
        
        // Determinar se precisa de seleção de cores/tamanho baseado no código
        const code = tech.code?.toUpperCase() || '';
        const requiresColor = code.includes('SILK') || code.includes('SERIGRAFIA') || 
                              code.includes('BORD') || code.includes('EMBROID');
        const requiresSize = code.includes('DTF') || code.includes('SUB') || 
                             code.includes('TRANSFER') || code.includes('LASER') ||
                             code.includes('BORD') || code.includes('EMBROID');

        return {
          id: tech.id,
          code: tech.code || '',
          name: tech.name,
          description: tech.description,
          unitCost: tech.unit_cost || 0,
          setupCost: tech.setup_cost || 0,
          estimatedDays: tech.estimated_days || 5,
          minQuantity: tech.min_quantity || 1,
          maxColors: locationTech?.maxColors || null,
          maxWidth: state.selectedLocation!.maxWidthCm,
          maxHeight: state.selectedLocation!.maxHeightCm,
          maxArea: state.selectedLocation!.maxAreaCm2,
          requiresColorSelection: requiresColor,
          requiresSizeSelection: requiresSize,
        } as SelectedTechnique;
      }) || [];
    },
    enabled: !!state.selectedLocation?.id,
    staleTime: 10 * 60 * 1000,
  });

  // Atualizar técnicas disponíveis quando query completar
  useEffect(() => {
    if (techniquesData) {
      dispatch({ type: 'SET_AVAILABLE_TECHNIQUES', payload: techniquesData });
    }
  }, [techniquesData]);

  // ============================================
  // ACTIONS
  // ============================================

  const setStep = useCallback((step: WizardStep) => {
    if (canNavigateToStep(step, state)) {
      dispatch({ type: 'SET_STEP', payload: step });
    } else {
      toast.warning('Complete os passos anteriores primeiro');
    }
  }, [state]);

  const nextStep = useCallback(() => {
    const next = getNextStep(state.currentStep);
    if (next && isStepComplete(state.currentStep, state)) {
      dispatch({ type: 'SET_STEP', payload: next });
    }
  }, [state]);

  const previousStep = useCallback(() => {
    const prev = getPreviousStep(state.currentStep);
    if (prev) {
      dispatch({ type: 'SET_STEP', payload: prev });
    }
  }, [state.currentStep]);

  const selectProduct = useCallback((product: SelectedProduct | null) => {
    dispatch({ type: 'SELECT_PRODUCT', payload: product });
    if (product) {
      // Auto-avançar para próximo passo
      dispatch({ type: 'SET_STEP', payload: 'location' });
    }
  }, []);

  const setQuantity = useCallback((quantity: number) => {
    dispatch({ type: 'SET_QUANTITY', payload: Math.max(1, quantity) });
  }, []);

  const setNegotiatedPrice = useCallback((enabled: boolean, price: number | null = null) => {
    dispatch({ type: 'SET_NEGOTIATED_PRICE', payload: { enabled, price } });
  }, []);

  const selectLocation = useCallback((location: EngravingLocation | null) => {
    dispatch({ type: 'SELECT_LOCATION', payload: location });
    if (location) {
      dispatch({ type: 'SET_STEP', payload: 'technique' });
    }
  }, []);

  const selectTechnique = useCallback((technique: SelectedTechnique | null) => {
    dispatch({ type: 'SELECT_TECHNIQUE', payload: technique });
    if (technique) {
      dispatch({ type: 'SET_STEP', payload: 'options' });
    }
  }, []);

  const updateOptions = useCallback((options: Partial<EngravingOptions>) => {
    dispatch({ type: 'UPDATE_OPTIONS', payload: options });
  }, []);

  const calculateResult = useCallback(async () => {
    if (!state.selectedProduct || !state.selectedLocation || !state.selectedTechnique) {
      toast.error('Complete todas as seleções antes de calcular');
      return null;
    }

    dispatch({ type: 'SET_CALCULATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const { engravingOptions, selectedProduct, selectedLocation, selectedTechnique, quantity } = state;
      
      // Calcular custo de personalização
      const area = engravingOptions.width * engravingOptions.height;
      let unitCostMultiplier = 1;
      
      const codeUpper = selectedTechnique.code.toUpperCase();
      
      if (codeUpper.includes('SILK') || codeUpper.includes('SERIGRAFIA')) {
        unitCostMultiplier = engravingOptions.colors;
      } else if (codeUpper.includes('DTF') || codeUpper.includes('SUB') || codeUpper.includes('TRANSFER')) {
        unitCostMultiplier = Math.max(1, area / 100);
      } else if (codeUpper.includes('BORD') || codeUpper.includes('EMBROID')) {
        unitCostMultiplier = Math.max(1, (area / 50) * Math.max(1, engravingOptions.colors * 0.5));
      } else if (codeUpper.includes('LASER')) {
        unitCostMultiplier = Math.max(1, area / 100);
      }

      const unitCost = selectedTechnique.unitCost * unitCostMultiplier * engravingOptions.positions;
      const setupCost = selectedTechnique.setupCost * engravingOptions.positions * 
        (codeUpper.includes('SILK') ? engravingOptions.colors : 1);
      const totalCustomizationCost = (unitCost * quantity) + setupCost;
      const costPerUnit = totalCustomizationCost / quantity;

      const productPrice = state.useNegotiatedPrice && state.negotiatedPrice 
        ? state.negotiatedPrice 
        : selectedProduct.price;
      const productTotal = productPrice * quantity;
      const grandTotal = productTotal + totalCustomizationCost;
      const grandTotalPerUnit = grandTotal / quantity;

      const result: SimulationPriceResult = {
        id: `sim-${Date.now()}`,
        timestamp: Date.now(),
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          sku: selectedProduct.sku,
          unitPrice: productPrice,
          quantity,
          totalPrice: productTotal,
        },
        location: {
          componentName: selectedLocation.componentName,
          locationName: selectedLocation.locationName,
          maxDimensions: `${selectedLocation.maxWidthCm || '–'}×${selectedLocation.maxHeightCm || '–'}cm`,
        },
        technique: {
          id: selectedTechnique.id,
          code: selectedTechnique.code,
          name: selectedTechnique.name,
          estimatedDays: selectedTechnique.estimatedDays,
        },
        options: {
          colors: engravingOptions.colors,
          width: engravingOptions.width,
          height: engravingOptions.height,
          positions: engravingOptions.positions,
          area,
        },
        customization: {
          unitCost,
          setupCost,
          totalCost: totalCustomizationCost,
          costPerUnit,
        },
        totals: {
          productTotal,
          customizationTotal: totalCustomizationCost,
          grandTotal,
          grandTotalPerUnit,
        },
      };

      dispatch({ type: 'SET_RESULT', payload: result });
      dispatch({ type: 'SET_STEP', payload: 'result' });
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao calcular simulação';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return null;
    } finally {
      dispatch({ type: 'SET_CALCULATING', payload: false });
    }
  }, [state]);

  const resetWizard = useCallback(() => {
    dispatch({ type: 'RESET_WIZARD' });
  }, []);

  const resetFromStep = useCallback((step: WizardStep) => {
    dispatch({ type: 'RESET_FROM_STEP', payload: step });
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const effectivePrice = useMemo(() => {
    if (state.useNegotiatedPrice && state.negotiatedPrice) {
      return state.negotiatedPrice;
    }
    return state.selectedProduct?.price || 0;
  }, [state.selectedProduct, state.useNegotiatedPrice, state.negotiatedPrice]);

  const stepProgress = useMemo(() => {
    const currentIndex = getStepIndex(state.currentStep);
    return ((currentIndex + 1) / WIZARD_STEPS.length) * 100;
  }, [state.currentStep]);

  const canProceed = useMemo(() => {
    return isStepComplete(state.currentStep, state);
  }, [state]);

  const canGoBack = useMemo(() => {
    return getStepIndex(state.currentStep) > 0;
  }, [state.currentStep]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    ...state,
    
    // Loading states
    locationsLoading,
    techniquesLoading,
    
    // Computed
    effectivePrice,
    stepProgress,
    canProceed,
    canGoBack,
    
    // Navigation
    setStep,
    nextStep,
    previousStep,
    
    // Actions
    selectProduct,
    setQuantity,
    setNegotiatedPrice,
    selectLocation,
    selectTechnique,
    updateOptions,
    calculateResult,
    resetWizard,
    resetFromStep,
    
    // Helpers
    isStepComplete: (step: WizardStep) => isStepComplete(step, state),
    canNavigateToStep: (step: WizardStep) => canNavigateToStep(step, state),
  };
}

export type UseSimulatorWizardReturn = ReturnType<typeof useSimulatorWizard>;
