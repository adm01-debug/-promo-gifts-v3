/**
 * useSimulatorWizard v4 - Hook central do simulador
 * 
 * ARQUITETURA DEFINITIVA (v5.9):
 * 1. Buscar áreas via product_print_areas + tabela_preco_gravacao_oficial
 * 2. Calcular preço via fn_get_customization_price com p_area_id
 * 
 * NÃO usa mais fn_get_customization_price_v2 (eliminada).
 * NÃO usa mais conceito de variantes (tecnica_variante_id eliminado).
 */

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchProductPrintAreasV2 } from '@/hooks/useGravacaoPriceV2';
import { invokeExternalRpc } from '@/lib/external-rpc';
import { groupPrintAreasToLocations } from '@/lib/print-area-grouping';
import type { CustomizationPriceResponse, CustomizationPriceFlat } from '@/hooks/useGravacaoPriceV2';
import { mapPriceResponseToFlat } from '@/hooks/useGravacaoPriceV2';
import type {
  SimulatorWizardState,
  WizardAction,
  WizardStep,
  SelectedProduct,
  EngravingLocation,
  EngravingSpecs,
  TechniqueComparisonResult,
  Personalization,
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
  selectedProduct: null,
  quantity: 100,
  personalizations: [],
  currentPersonalizationIndex: 0,
  isEditingPersonalization: false,
  availableLocations: [],
  selectedLocation: null,
  engravingSpecs: {
    colors: 1,
    width: 5,
    height: 5,
  },
  comparisonResults: [],
  selectedComparison: null,
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
        personalizations: [],
        currentPersonalizationIndex: 0,
        isEditingPersonalization: false,
        selectedLocation: null,
        availableLocations: [],
        comparisonResults: [],
        selectedComparison: null,
      };
    
    case 'SET_QUANTITY':
      return { 
        ...state, 
        quantity: action.payload,
        comparisonResults: [],
        selectedComparison: null,
        personalizations: [],
        currentPersonalizationIndex: 0,
        isEditingPersonalization: false,
      };
    
    case 'SET_AVAILABLE_LOCATIONS':
      return { ...state, availableLocations: action.payload };
    
    case 'SELECT_LOCATION':
      return {
        ...state,
        selectedLocation: action.payload,
        comparisonResults: [],
        selectedComparison: null,
        engravingSpecs: {
          colors: 1,
          width: Math.min(5, action.payload?.maxWidthCm || 50),
          height: Math.min(5, action.payload?.maxHeightCm || 50),
        },
      };
    
    case 'UPDATE_SPECS':
      return {
        ...state,
        engravingSpecs: { ...state.engravingSpecs, ...action.payload },
        comparisonResults: [],
        selectedComparison: null,
      };
    
    case 'SET_COMPARISON_RESULTS':
      return { ...state, comparisonResults: action.payload };
    
    case 'SELECT_COMPARISON':
      return { ...state, selectedComparison: action.payload };

    case 'ADD_PERSONALIZATION':
      return {
        ...state,
        personalizations: [...state.personalizations, action.payload],
        currentPersonalizationIndex: state.personalizations.length,
        isEditingPersonalization: false,
        selectedLocation: null,
        selectedComparison: null,
        comparisonResults: [],
        engravingSpecs: { colors: 1, width: 5, height: 5 },
        currentStep: 'comparison',
      };

    case 'REMOVE_PERSONALIZATION': {
      const newPersonalizations = state.personalizations
        .filter(p => p.id !== action.payload)
        .map((p, idx) => ({ ...p, index: idx + 1 }));
      return {
        ...state,
        personalizations: newPersonalizations,
      };
    }

    case 'UPDATE_PERSONALIZATION': {
      const { index: editIndex, personalization: updatedPers } = action.payload;
      const updatedPersonalizations = [...state.personalizations];
      updatedPersonalizations[editIndex] = updatedPers;
      return {
        ...state,
        personalizations: updatedPersonalizations.map((p, idx) => ({ ...p, index: idx + 1 })),
        isEditingPersonalization: false,
        selectedLocation: null,
        selectedComparison: null,
        comparisonResults: [],
        engravingSpecs: { colors: 1, width: 5, height: 5 },
        currentStep: 'comparison',
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
        engravingSpecs: pers.specs,
        comparisonResults: [],
        selectedComparison: null,
        currentStep: 'location',
      };
    }

    case 'START_NEW_PERSONALIZATION':
      return {
        ...state,
        currentPersonalizationIndex: state.personalizations.length,
        isEditingPersonalization: false,
        selectedLocation: null,
        selectedComparison: null,
        comparisonResults: [],
        engravingSpecs: { colors: 1, width: 5, height: 5 },
        currentStep: 'location',
      };

    case 'CANCEL_PERSONALIZATION':
      return {
        ...state,
        isEditingPersonalization: false,
        selectedLocation: null,
        selectedComparison: null,
        currentStep: state.personalizations.length > 0 ? 'comparison' : 'product',
      };
    
    case 'SET_CALCULATING':
      return { ...state, isCalculating: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'RESET_WIZARD':
      return initialState;
    
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
  // QUERY: Buscar áreas + técnicas
  // ============================================

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['wizard-locations-v4', state.selectedProduct?.id],
    queryFn: async () => {
      if (!state.selectedProduct?.id) return [];
      
      try {
        const areas = await fetchProductPrintAreasV2(state.selectedProduct.id);
        
        if (areas.length > 0) {
          return groupPrintAreasToLocations(areas);
        }
      } catch (err) {
        console.warn('Falha ao buscar áreas do Promobrind:', err);
      }

      // Fallback: BD local (para produtos sem dados no Promobrind)
      const { data: productLocations, error: prodError } = await supabase
        .from('product_components')
        .select(`
          id, component_code, component_name,
          product_component_locations (
            id, location_code, location_name, max_width_cm, max_height_cm, max_area_cm2, area_image_url,
            product_component_location_techniques (
              id, technique_id, max_colors, is_default, composed_code,
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
              printAreaId: loc.id,
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

  useEffect(() => {
    if (locationsData) {
      dispatch({ type: 'SET_AVAILABLE_LOCATIONS', payload: locationsData });
    }
  }, [locationsData]);

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
    const newQty = Math.max(1, quantity);
    if (state.personalizations.length > 0 && newQty !== state.quantity) {
      toast.warning('Quantidade alterada — gravações recalculadas', {
        description: 'As personalizações anteriores foram removidas pois os preços mudam com a tiragem.',
      });
    }
    dispatch({ type: 'SET_QUANTITY', payload: newQty });
  }, [state.personalizations.length, state.quantity]);

  const selectLocation = useCallback((location: EngravingLocation | null) => {
    dispatch({ type: 'SELECT_LOCATION', payload: location });
    if (location) {
      dispatch({ type: 'SET_STEP', payload: 'specs' });
    }
  }, []);

  const updateSpecs = useCallback((specs: Partial<EngravingSpecs>) => {
    dispatch({ type: 'UPDATE_SPECS', payload: specs });
  }, []);

  // ============================================
  // COMPARAÇÃO DE PREÇOS
  // Usa fn_get_customization_price com p_area_id
  // ============================================

  const fetchComparisonPrices = useCallback(async () => {
    if (!state.selectedLocation) {
      toast.error('Selecione um local primeiro');
      return;
    }

    const techniques = state.selectedLocation.availableTechniques;
    if (techniques.length === 0) {
      toast.warning('Nenhuma técnica disponível para este local');
      return;
    }

    dispatch({ type: 'SET_CALCULATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const allResults: TechniqueComparisonResult[] = [];

      const promises = techniques.map(async (tech) => {
        // Técnica sem pricing → "Preço sob consulta"
        if (tech.hasPricing === false) {
          allResults.push(createUnavailableResult(tech, 'Preço sob consulta'));
          return;
        }

        // Verificar se cores excedem o máximo da técnica
        if (tech.maxColors !== null && tech.maxColors > 0 && state.engravingSpecs.colors > tech.maxColors) {
          allResults.push(createUnavailableResult(
            tech,
            `Máximo ${tech.maxColors} ${tech.maxColors === 1 ? 'cor' : 'cores'}`
          ));
          return;
        }

        // Cores efetivas
        const effectiveColors = (tech.maxColors === 0 || tech.maxColors === 1) 
          ? 1 
          : state.engravingSpecs.colors;

        try {
          // ★ Usar fn_get_customization_price com p_area_id
          const result = await invokeExternalRpc<CustomizationPriceResponse>(
            'fn_get_customization_price',
            {
              p_area_id: tech.printAreaId,
              p_quantidade: state.quantity,
              p_num_cores: effectiveColors,
              p_largura_cm: state.engravingSpecs.width || null,
              p_altura_cm: state.engravingSpecs.height || null,
            }
          );

          if (!result || !result.success) {
            allResults.push(createUnavailableResult(tech, 'Erro no cálculo de preço'));
            return;
          }

          const flat = mapPriceResponseToFlat(result);

          allResults.push({
            techniqueId: tech.techniqueId,
            techniqueName: flat.technique || tech.techniqueName,
            techniqueCode: flat.tabela_codigo_curto || tech.techniqueCode,
            printAreaId: tech.printAreaId,
            maxColors: flat.max_cores ?? tech.maxColors,
            isAvailable: true,
            unitPrice: flat.unit_price,
            setupPrice: flat.faturamento_minimo_gravacao,
            subtotal: flat.subtotal_pecas,
            totalPrice: flat.total_price,
            costPerUnit: state.quantity > 0 ? flat.total_price / state.quantity : 0,
            minimumApplied: flat.minimum_applied,
            budgetCode: flat.codigo_orcamento,
            productionDays: flat.production_days,
            markupPercent: flat.markup_percent,
            marginPercent: flat.margin_percent,
            tierUsed: flat.tier_used,
            tierMinQty: flat.tier_min_qty,
            tierMaxQty: flat.tier_max_qty,
            rawData: result as unknown as Record<string, unknown>,
          });
        } catch (err) {
          console.warn(`Erro ao calcular preço para ${tech.techniqueName}:`, err);
          allResults.push(createUnavailableResult(tech, 'Erro ao calcular preço'));
        }
      });

      await Promise.all(promises);
      
      // Encontrar mais barato e mais rápido entre os disponíveis
      const available = allResults.filter(r => r.isAvailable);
      if (available.length > 0) {
        const cheapest = [...available].sort((a, b) => a.totalPrice - b.totalPrice)[0];
        const fastest = [...available].sort((a, b) => 
          (a.productionDays || 999) - (b.productionDays || 999)
        )[0];
        
        allResults.forEach(r => {
          if (r.isAvailable) {
            r.isCheapest = r.printAreaId === cheapest.printAreaId;
            r.isFastest = r.printAreaId === fastest.printAreaId && available.length > 1;
          }
        });
      }

      // Ordenar: disponíveis primeiro (por preço), depois indisponíveis
      const sorted = [
        ...available.sort((a, b) => a.totalPrice - b.totalPrice),
        ...allResults.filter(r => !r.isAvailable),
      ];

      dispatch({ type: 'SET_COMPARISON_RESULTS', payload: sorted });
      dispatch({ type: 'SET_STEP', payload: 'comparison' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao comparar técnicas';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
    } finally {
      dispatch({ type: 'SET_CALCULATING', payload: false });
    }
  }, [state.selectedLocation, state.quantity, state.engravingSpecs]);

  // Confirmar técnica selecionada → cria personalização
  const confirmTechnique = useCallback((comparison: TechniqueComparisonResult) => {
    if (!state.selectedLocation || !comparison.isAvailable) return;

    dispatch({ type: 'SELECT_COMPARISON', payload: comparison });

    const personalization: Personalization = {
      id: `pers-${Date.now()}`,
      index: state.isEditingPersonalization 
        ? state.currentPersonalizationIndex + 1 
        : state.personalizations.length + 1,
      location: state.selectedLocation,
      technique: {
        id: comparison.techniqueId,
        code: comparison.techniqueCode,
        name: comparison.techniqueName,
      },
      specs: { ...state.engravingSpecs },
      pricing: {
        unitPrice: comparison.unitPrice,
        setupPrice: comparison.setupPrice,
        subtotal: comparison.subtotal,
        totalPrice: comparison.totalPrice,
        costPerUnit: comparison.costPerUnit,
        budgetCode: comparison.budgetCode,
        productionDays: comparison.productionDays,
      },
    };

    if (state.isEditingPersonalization) {
      dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { index: state.currentPersonalizationIndex, personalization } });
      toast.success(`Gravação ${personalization.index} atualizada`);
    } else {
      dispatch({ type: 'ADD_PERSONALIZATION', payload: personalization });
      toast.success(`${comparison.techniqueName} adicionada`);
    }
  }, [state]);

  const removePersonalization = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PERSONALIZATION', payload: id });
    toast.info('Gravação removida');
  }, []);

  const editPersonalization = useCallback((index: number) => {
    dispatch({ type: 'EDIT_PERSONALIZATION', payload: index });
  }, []);

  const startNewPersonalization = useCallback(() => {
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

  const resetWizard = useCallback(() => {
    dispatch({ type: 'RESET_WIZARD' });
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const effectivePrice = useMemo(() => {
    return state.selectedProduct?.price || 0;
  }, [state.selectedProduct]);

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

  const availableLocationsFiltered = useMemo(() => {
    const usedLocationIds = new Set(
      state.personalizations.map(p => p.location.id)
    );
    
    if (state.isEditingPersonalization && state.personalizations[state.currentPersonalizationIndex]) {
      const currentLocationId = state.personalizations[state.currentPersonalizationIndex].location.id;
      return state.availableLocations.filter(
        loc => !usedLocationIds.has(loc.id) || loc.id === currentLocationId
      );
    }
    
    return state.availableLocations.filter(loc => !usedLocationIds.has(loc.id));
  }, [state.availableLocations, state.personalizations, state.isEditingPersonalization, state.currentPersonalizationIndex]);

  const hasAvailableLocations = useMemo(() => {
    const usedLocationIds = new Set(
      state.personalizations.map(p => p.location.id)
    );
    return state.availableLocations.filter(loc => !usedLocationIds.has(loc.id)).length > 0;
  }, [state.availableLocations, state.personalizations]);

  const totals = useMemo(() => {
    const productTotal = effectivePrice * state.quantity;
    const customizationTotal = state.personalizations.reduce((sum, p) => sum + p.pricing.totalPrice, 0);
    const grandTotal = productTotal + customizationTotal;
    const grandTotalPerUnit = state.quantity > 0 ? grandTotal / state.quantity : 0;
    const maxDays = state.personalizations.length > 0
      ? Math.max(...state.personalizations.map(p => p.pricing.productionDays || 0))
      : 0;
    
    return { productTotal, customizationTotal, grandTotal, grandTotalPerUnit, maxDays };
  }, [effectivePrice, state.quantity, state.personalizations]);

  const maxColorsForLocation = useMemo(() => {
    if (!state.selectedLocation) return 4;
    const maxColors = state.selectedLocation.availableTechniques
      .map(t => t.maxColors)
      .filter((c): c is number => c !== null && c > 0);
    return maxColors.length > 0 ? Math.max(...maxColors) : 4;
  }, [state.selectedLocation]);

  // ============================================
  // RETURN
  // ============================================

  return {
    ...state,
    locationsLoading,
    effectivePrice,
    stepProgress,
    canProceed,
    canGoBack,
    availableLocationsFiltered,
    hasAvailableLocations,
    totals,
    maxColorsForLocation,
    setStep,
    nextStep,
    previousStep,
    selectProduct,
    setQuantity,
    selectLocation,
    updateSpecs,
    fetchComparisonPrices,
    confirmTechnique,
    removePersonalization,
    editPersonalization,
    startNewPersonalization,
    cancelPersonalization,
    resetWizard,
    isStepComplete: (step: WizardStep) => isStepComplete(step, state),
    canNavigateToStep: (step: WizardStep) => canNavigateToStep(step, state),
  };
}

// ============================================
// HELPERS
// ============================================

function createUnavailableResult(
  tech: {
    techniqueId: string;
    techniqueName: string;
    techniqueCode: string;
    printAreaId: string;
    maxColors: number | null;
  },
  reason: string
): TechniqueComparisonResult {
  return {
    techniqueId: tech.techniqueId,
    techniqueName: tech.techniqueName,
    techniqueCode: tech.techniqueCode,
    printAreaId: tech.printAreaId,
    maxColors: tech.maxColors,
    isAvailable: false,
    unavailableReason: reason,
    unitPrice: 0,
    setupPrice: 0,
    subtotal: 0,
    totalPrice: 0,
    costPerUnit: 0,
    minimumApplied: false,
    budgetCode: '',
    productionDays: null,
    markupPercent: 0,
    marginPercent: 0,
    tierUsed: 0,
    tierMinQty: 0,
    tierMaxQty: 0,
  };
}

export type UseSimulatorWizardReturn = ReturnType<typeof useSimulatorWizard>;
