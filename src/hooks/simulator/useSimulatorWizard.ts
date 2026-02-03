/**
 * useSimulatorWizard - Hook central para orquestração do simulador
 * 
 * Gerencia o estado do wizard com suporte a MÚLTIPLAS PERSONALIZAÇÕES:
 * Produto → (Local → Técnica → Configuração) × N → Resultado
 */

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  fetchPromobrindPrintAreas,
  fetchPromobrindTechniques,
  findBestPriceTable,
  type PromobrindPrintArea,
  type PromobrindTechnique,
} from '@/lib/external-db';
import type {
  SimulatorWizardState,
  WizardAction,
  WizardStep,
  SelectedProduct,
  EngravingLocation,
  SelectedTechnique,
  EngravingOptions,
  SimulationPriceResult,
  Personalization,
  PersonalizationResult,
} from '@/types/domain/simulator-wizard';
import {
  WIZARD_STEPS,
  getStepIndex,
  getNextStep,
  getPreviousStep,
  isStepComplete,
  canNavigateToStep,
  calculatePersonalizationCost,
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
  personalizations: [],
  currentPersonalizationIndex: 0,
  isEditingPersonalization: false,
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
        // Reset tudo ao mudar produto
        personalizations: [],
        currentPersonalizationIndex: 0,
        isEditingPersonalization: false,
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
        result: null,
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

    case 'ADD_PERSONALIZATION':
      return {
        ...state,
        personalizations: [...state.personalizations, action.payload],
        currentPersonalizationIndex: state.personalizations.length,
        isEditingPersonalization: false,
        // Reset estado da personalização atual para nova gravação
        selectedLocation: null,
        selectedTechnique: null,
        engravingOptions: {
          colors: 1,
          width: 10,
          height: 10,
          positions: 1,
        },
        // IMPORTANTE: Vai para 'location' para adicionar nova gravação ou continuar
        currentStep: 'location' as WizardStep,
        result: null,
      };

    case 'REMOVE_PERSONALIZATION': {
      const newPersonalizations = state.personalizations.filter(p => p.id !== action.payload);
      return {
        ...state,
        personalizations: newPersonalizations.map((p, idx) => ({ ...p, index: idx + 1 })),
        result: null,
      };
    }

    case 'EDIT_PERSONALIZATION': {
      const pers = state.personalizations[action.payload];
      if (!pers) return state;
      
      return {
        ...state,
        currentPersonalizationIndex: action.payload,
        isEditingPersonalization: true,
        selectedLocation: pers.location,
        selectedTechnique: pers.technique,
        engravingOptions: pers.options,
        currentStep: 'location',
      };
    }

    case 'START_NEW_PERSONALIZATION':
      return {
        ...state,
        currentPersonalizationIndex: state.personalizations.length,
        isEditingPersonalization: false,
        selectedLocation: null,
        selectedTechnique: null,
        engravingOptions: {
          colors: 1,
          width: 10,
          height: 10,
          positions: 1,
        },
        currentStep: 'location',
      };

    case 'CANCEL_PERSONALIZATION':
      return {
        ...state,
        isEditingPersonalization: false,
        selectedLocation: null,
        selectedTechnique: null,
        currentStep: state.personalizations.length > 0 ? 'result' : 'product',
      };
    
    case 'SET_RESULT':
      return { 
        ...state, 
        result: action.payload,
        completedSteps: action.payload 
          ? [...new Set([...state.completedSteps, 'result' as WizardStep])] 
          : state.completedSteps,
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
        ...(stepIndex <= 0 && { selectedProduct: null, personalizations: [] }),
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
  // QUERIES
  // ============================================

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['wizard-locations-promobrind', state.selectedProduct?.id],
    queryFn: async () => {
      if (!state.selectedProduct?.id) return [];
      
      const printAreas = await fetchPromobrindPrintAreas(state.selectedProduct.id);
      
      if (!printAreas.length) {
        console.log('Nenhuma área no Promobrind, tentando BD local...');
        const { data: productLocations, error: prodError } = await supabase
          .from('product_components')
          .select(`
            id, component_code, component_name,
            product_component_locations (
              id, location_code, location_name, max_width_cm, max_height_cm, max_area_cm2, area_image_url,
              product_component_location_techniques (
                id, technique_id, max_colors, is_default,
                personalization_techniques (id, name, code)
              )
            )
          `)
          .eq('product_id', state.selectedProduct.id)
          .eq('is_active', true)
          .eq('is_personalizable', true);

        if (prodError) throw prodError;

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
      }

      const locationMap = new Map<string, EngravingLocation>();
      
      for (const area of printAreas) {
        const key = `${area.component_name || 'Componente'}-${area.location_name || area.area_name}`;
        
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            id: area.id,
            componentId: area.id,
            componentCode: area.area_code,
            componentName: area.component_name || 'Componente Principal',
            locationCode: area.area_code,
            locationName: area.location_name || area.area_name,
            maxWidthCm: area.max_width_cm,
            maxHeightCm: area.max_height_cm,
            maxAreaCm2: area.max_area_cm2,
            areaImageUrl: area.area_image_url,
            isFromGroup: false,
            availableTechniques: [],
          });
        }
        
        if (area.technique_id && area.technique_name) {
          const location = locationMap.get(key)!;
          const existingTech = location.availableTechniques.find(
            t => t.techniqueId === area.technique_id
          );
          
          if (!existingTech) {
            location.availableTechniques.push({
              id: `${area.id}-${area.technique_id}`,
              techniqueId: area.technique_id,
              techniqueName: area.technique_name,
              techniqueCode: area.technique_code || '',
              maxColors: area.max_colors,
              isDefault: area.is_default,
              isCurved: area.is_curved,
            });
          }
        }
      }

      return Array.from(locationMap.values());
    },
    enabled: !!state.selectedProduct?.id,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (locationsData) {
      dispatch({ type: 'SET_AVAILABLE_LOCATIONS', payload: locationsData });
    }
  }, [locationsData]);

  const { data: techniquesData, isLoading: techniquesLoading } = useQuery({
    queryKey: ['wizard-techniques-promobrind', state.selectedLocation?.id],
    queryFn: async () => {
      if (!state.selectedLocation) return [];

      const techniqueIds = state.selectedLocation.availableTechniques.map(t => t.techniqueId);
      if (techniqueIds.length === 0) return [];

      let techniques: PromobrindTechnique[] = [];
      try {
        techniques = await fetchPromobrindTechniques({ ids: techniqueIds });
      } catch (error) {
        console.log('Erro ao buscar técnicas do Promobrind, tentando BD local...', error);
        const { data, error: localError } = await supabase
          .from('personalization_techniques')
          .select('*')
          .in('id', techniqueIds)
          .eq('is_active', true);

        if (localError) throw localError;
        
        techniques = (data || []).map(t => ({
          id: t.id,
          code: t.code || '',
          name: t.name,
          description: t.description,
          category: null,
          unit_cost: t.unit_cost,
          setup_cost: t.setup_cost,
          min_quantity: t.min_quantity,
          estimated_days: t.estimated_days,
          max_colors: null,
          max_width_cm: null,
          max_height_cm: null,
          is_active: t.is_active ?? true,
        }));
      }

      return techniques.map(tech => {
        const locationTech = state.selectedLocation!.availableTechniques.find(
          t => t.techniqueId === tech.id
        );
        
        const code = tech.code?.toUpperCase() || '';
        const requiresColor = code.includes('SILK') || code.includes('SERIGRAFIA') || 
                              code.includes('BORD') || code.includes('EMBROID') ||
                              code.includes('TAMPOGRAFIA') || code.includes('TRANSFER');
        const requiresSize = code.includes('DTF') || code.includes('SUB') || 
                             code.includes('TRANSFER') || code.includes('LASER') ||
                             code.includes('BORD') || code.includes('EMBROID') ||
                             code.includes('SILK') || code.includes('SERIGRAFIA');

        return {
          id: tech.id,
          code: tech.code || '',
          name: tech.name,
          description: tech.description,
          unitCost: tech.unit_cost || 0,
          setupCost: tech.setup_cost || 0,
          estimatedDays: tech.estimated_days || 5,
          minQuantity: tech.min_quantity || 1,
          maxColors: locationTech?.maxColors || tech.max_colors || null,
          maxWidth: state.selectedLocation!.maxWidthCm || tech.max_width_cm,
          maxHeight: state.selectedLocation!.maxHeightCm || tech.max_height_cm,
          maxArea: state.selectedLocation!.maxAreaCm2,
          requiresColorSelection: requiresColor,
          requiresSizeSelection: requiresSize,
        } as SelectedTechnique;
      });
    },
    enabled: !!state.selectedLocation?.id,
    staleTime: 10 * 60 * 1000,
  });

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
      dispatch({ type: 'SET_STEP', payload: 'configuration' });
    }
  }, []);

  const updateOptions = useCallback((options: Partial<EngravingOptions>) => {
    dispatch({ type: 'UPDATE_OPTIONS', payload: options });
  }, []);

  // Adicionar/confirmar personalização atual
  const confirmPersonalization = useCallback(async () => {
    if (!state.selectedLocation || !state.selectedTechnique) {
      toast.error('Selecione local e técnica');
      return null;
    }

    const costs = calculatePersonalizationCost(
      state.selectedTechnique,
      state.engravingOptions,
      state.quantity
    );

    // Buscar tabela de preço do Promobrind
    let priceTableUsed: string | undefined;
    let tierApplied: string | undefined;
    
    try {
      const priceTable = await findBestPriceTable({
        techniqueName: state.selectedTechnique.name,
        techniqueCode: state.selectedTechnique.code,
        quantity: state.quantity,
        colors: state.engravingOptions.colors,
        width: state.engravingOptions.width,
        height: state.engravingOptions.height,
      });
      
      if (priceTable) {
        costs.unitCost = priceTable.unit_price;
        costs.setupCost = priceTable.setup_price || 0;
        costs.totalCost = (costs.unitCost * state.quantity) + costs.setupCost;
        costs.costPerUnit = costs.totalCost / state.quantity;
        priceTableUsed = priceTable.code_option;
        tierApplied = `${priceTable.min_quantity}-${priceTable.max_quantity || '∞'}`;
      }
    } catch (e) {
      console.log('Tabela de preço não encontrada, usando valores da técnica');
    }

    const personalization: Personalization = {
      id: `pers-${Date.now()}`,
      index: state.isEditingPersonalization 
        ? state.currentPersonalizationIndex + 1 
        : state.personalizations.length + 1,
      location: state.selectedLocation,
      technique: state.selectedTechnique,
      options: { ...state.engravingOptions },
      ...costs,
      estimatedDays: state.selectedTechnique.estimatedDays,
      priceTableUsed,
      tierApplied,
    };

    if (state.isEditingPersonalization) {
      // Atualizar personalização existente
      const newPersonalizations = [...state.personalizations];
      newPersonalizations[state.currentPersonalizationIndex] = personalization;
      dispatch({ type: 'RESET_WIZARD' });
      // Restaurar estado
      if (state.selectedProduct) {
        dispatch({ type: 'SELECT_PRODUCT', payload: state.selectedProduct });
      }
      newPersonalizations.forEach(p => {
        dispatch({ type: 'ADD_PERSONALIZATION', payload: p });
      });
    } else {
      dispatch({ type: 'ADD_PERSONALIZATION', payload: personalization });
    }

    toast.success(`Gravação ${personalization.index} adicionada`);
    return personalization;
  }, [state]);

  const removePersonalization = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PERSONALIZATION', payload: id });
    toast.info('Gravação removida');
  }, []);

  const editPersonalization = useCallback((index: number) => {
    dispatch({ type: 'EDIT_PERSONALIZATION', payload: index });
  }, []);

  // GAP FIX #3: Valida se há locais disponíveis antes de iniciar nova personalização
  const startNewPersonalization = useCallback(() => {
    // Recalcula locais disponíveis
    const usedLocationIds = new Set(
      state.personalizations.map(p => p.location.id)
    );
    const availableCount = state.availableLocations.filter(loc => !usedLocationIds.has(loc.id)).length;
    
    if (availableCount === 0) {
      toast.warning('Todos os locais já foram personalizados');
      return;
    }
    
    dispatch({ type: 'START_NEW_PERSONALIZATION' });
  }, [state.personalizations, state.availableLocations]);

  const cancelPersonalization = useCallback(() => {
    dispatch({ type: 'CANCEL_PERSONALIZATION' });
  }, []);

  // Calcular resultado final (soma todas as personalizações)
  const calculateResult = useCallback(async () => {
    if (!state.selectedProduct || state.personalizations.length === 0) {
      toast.error('Adicione pelo menos uma personalização');
      return null;
    }

    dispatch({ type: 'SET_CALCULATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const productPrice = state.useNegotiatedPrice && state.negotiatedPrice 
        ? state.negotiatedPrice 
        : state.selectedProduct.price;
      const productTotal = productPrice * state.quantity;

      const personalizationResults: PersonalizationResult[] = state.personalizations.map(p => ({
        id: p.id,
        index: p.index,
        location: {
          componentName: p.location.componentName,
          locationName: p.location.locationName,
          maxDimensions: `${p.location.maxWidthCm || '–'}×${p.location.maxHeightCm || '–'}cm`,
        },
        technique: {
          id: p.technique.id,
          code: p.technique.code,
          name: p.technique.name,
          estimatedDays: p.estimatedDays,
        },
        options: {
          colors: p.options.colors,
          width: p.options.width,
          height: p.options.height,
          positions: p.options.positions,
          area: p.options.width * p.options.height,
        },
        customization: {
          unitCost: p.unitCost,
          setupCost: p.setupCost,
          totalCost: p.totalCost,
          costPerUnit: p.costPerUnit,
        },
        priceTableUsed: p.priceTableUsed,
        tierApplied: p.tierApplied,
      }));

      const customizationTotal = state.personalizations.reduce((sum, p) => sum + p.totalCost, 0);
      const grandTotal = productTotal + customizationTotal;
      const grandTotalPerUnit = grandTotal / state.quantity;
      const maxEstimatedDays = Math.max(...state.personalizations.map(p => p.estimatedDays));

      const result: SimulationPriceResult = {
        id: `sim-${Date.now()}`,
        timestamp: Date.now(),
        product: {
          id: state.selectedProduct.id,
          name: state.selectedProduct.name,
          sku: state.selectedProduct.sku,
          unitPrice: productPrice,
          quantity: state.quantity,
          totalPrice: productTotal,
        },
        personalizations: personalizationResults,
        totals: {
          productTotal,
          customizationTotal,
          grandTotal,
          grandTotalPerUnit,
        },
        maxEstimatedDays,
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

  // Locais disponíveis (filtra os que já têm personalizações confirmadas)
  // GAP FIX #1: Ao editar, mostra o local da personalização atual + locais não usados
  const availableLocationsFiltered = useMemo(() => {
    // IDs dos locais já usados em personalizações confirmadas
    const usedLocationIds = new Set(
      state.personalizations.map(p => p.location.id)
    );
    
    // Se estamos editando, permitir o local da personalização atual
    if (state.isEditingPersonalization && state.personalizations[state.currentPersonalizationIndex]) {
      const currentLocationId = state.personalizations[state.currentPersonalizationIndex].location.id;
      // Retorna locais não usados + o local da personalização sendo editada
      return state.availableLocations.filter(
        loc => !usedLocationIds.has(loc.id) || loc.id === currentLocationId
      );
    }
    
    // Retorna apenas locais não usados
    return state.availableLocations.filter(loc => !usedLocationIds.has(loc.id));
  }, [state.availableLocations, state.personalizations, state.isEditingPersonalization, state.currentPersonalizationIndex]);

  // Verifica se ainda há locais disponíveis para novas personalizações
  // GAP FIX #2: Considera locais após remoção de personalização
  const hasAvailableLocations = useMemo(() => {
    // Recalcula excluindo todos os locais usados (não edição)
    const usedLocationIds = new Set(
      state.personalizations.map(p => p.location.id)
    );
    const availableCount = state.availableLocations.filter(loc => !usedLocationIds.has(loc.id)).length;
    return availableCount > 0;
  }, [state.availableLocations, state.personalizations]);

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
    availableLocationsFiltered,
    hasAvailableLocations,
    
    // Navigation
    setStep,
    nextStep,
    previousStep,
    
    // Product Actions
    selectProduct,
    setQuantity,
    setNegotiatedPrice,
    
    // Personalization Flow
    selectLocation,
    selectTechnique,
    updateOptions,
    confirmPersonalization,
    removePersonalization,
    editPersonalization,
    startNewPersonalization,
    cancelPersonalization,
    
    // Final
    calculateResult,
    resetWizard,
    resetFromStep,
    
    // Helpers
    isStepComplete: (step: WizardStep) => isStepComplete(step, state),
    canNavigateToStep: (step: WizardStep) => canNavigateToStep(step, state),
  };
}

export type UseSimulatorWizardReturn = ReturnType<typeof useSimulatorWizard>;
