/**
 * useSimulatorWizard v6 - Hook central do simulador (refatorado)
 * 
 * Delegações:
 * - useWizardPricing: comparação de preços e recálculo
 * - useWizardPersistence: localStorage session
 * - useWizardDrafts: database drafts (usado externamente)
 * 
 * Usa tipos de src/types/customization.ts como fonte de dados v6.
 */

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { invokeExternalRpc } from '@/lib/external-rpc';
import type { CustomizationOptionsResponse, TechniqueOption, GravacaoLocation } from '@/types/customization';
import type {
  SimulatorWizardState,
  WizardAction,
  WizardStep,
  SelectedProduct,
  EngravingLocation,
  EngravingSpecs,
  Personalization,
  AvailableTechnique,
} from '@/types/domain/simulator-wizard';
import {
  WIZARD_STEPS,
  getStepIndex,
  getNextStep,
  getPreviousStep,
  isStepComplete,
  canNavigateToStep,
} from '@/types/domain/simulator-wizard';
import { useWizardPricing } from './useWizardPricing';
import { useWizardPersistence, loadSession, clearSession } from './useWizardPersistence';
import { useUndoableReducer } from './useUndoRedo';
import { logger } from "@/lib/logger";

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
  engravingSpecs: { colors: 1, width: 5, height: 5 },
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
        personalizations: state.personalizations.map(p => ({
          ...p,
          pricing: { ...p.pricing, _needsRecalc: true } as any,
        })),
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
      return { ...state, personalizations: newPersonalizations };
    }

    case 'REMOVE_ALL_PERSONALIZATIONS': {
      return { ...state, personalizations: [] };
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

    case 'RECALC_PERSONALIZATION_PRICING': {
      const { personalizationId, pricing } = action.payload;
      return {
        ...state,
        personalizations: state.personalizations.map(p =>
          p.id === personalizationId ? { ...p, pricing } : p
        ),
      };
    }

    case 'DUPLICATE_PERSONALIZATION': {
      const { sourceId, targetLocation } = action.payload;
      const source = state.personalizations.find(p => p.id === sourceId);
      if (!source) return state;
      const newPers = {
        ...source,
        id: `pers-${Date.now()}`,
        index: state.personalizations.length + 1,
        location: targetLocation,
        pricing: { ...source.pricing, _needsRecalc: true } as any,
      };
      return {
        ...state,
        personalizations: [...state.personalizations, newPers],
        currentStep: 'comparison' as const,
      };
    }

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
  const savedSession = useRef(loadSession());
  const { state, dispatch, undo, redo, canUndo, canRedo } = useUndoableReducer(
    wizardReducer,
    initialState,
    (init) => savedSession.current ? { ...init, ...savedSession.current } : init
  );

  // ============================================
  // QUERY: Buscar áreas + técnicas (v6)
  // ============================================

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['wizard-locations-v6', state.selectedProduct?.id],
    queryFn: async (): Promise<EngravingLocation[]> => {
      if (!state.selectedProduct?.id) return [];

      try {
        const result = await invokeExternalRpc<CustomizationOptionsResponse>(
          'fn_get_product_customization_options',
          { p_product_id: state.selectedProduct.id }
        );

        if (result?.locations?.length) {
          return mapV6LocationsToWizard(result.locations);
        }
      } catch (err) {
        logger.warn('Falha ao buscar opções de personalização v6:', err);
      }

      // Sem dados do DB externo — retornar vazio
      return [];
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
  // SUB-HOOKS
  // ============================================

  const { fetchComparisonPrices, confirmTechnique } = useWizardPricing({ state, dispatch });
  useWizardPersistence(state);

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
    if (prev) dispatch({ type: 'SET_STEP', payload: prev });
  }, [state.currentStep]);

  const selectProduct = useCallback((product: SelectedProduct | null) => {
    dispatch({ type: 'SELECT_PRODUCT', payload: product });
    if (product) dispatch({ type: 'SET_STEP', payload: 'location' });
  }, []);

  const setQuantity = useCallback((quantity: number) => {
    const newQty = Math.max(1, quantity);
    const hasPersonalizations = state.personalizations.length > 0;
    dispatch({ type: 'SET_QUANTITY', payload: newQty });
    if (hasPersonalizations && newQty !== state.quantity) {
      toast.info('Recalculando preços para nova tiragem...', { duration: 2000 });
    }
  }, [state.personalizations.length, state.quantity]);

  const selectLocation = useCallback((location: EngravingLocation | null) => {
    dispatch({ type: 'SELECT_LOCATION', payload: location });
    if (location) dispatch({ type: 'SET_STEP', payload: 'specs' });
  }, []);

  const updateSpecs = useCallback((specs: Partial<EngravingSpecs>) => {
    dispatch({ type: 'UPDATE_SPECS', payload: specs });
  }, []);

  const removePersonalization = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PERSONALIZATION', payload: id });
    toast.info('Gravação removida');
  }, []);

  const removeAllPersonalizations = useCallback(() => {
    dispatch({ type: 'REMOVE_ALL_PERSONALIZATIONS' });
    toast.info('Todas as gravações removidas');
  }, []);

  const editPersonalization = useCallback((index: number) => {
    dispatch({ type: 'EDIT_PERSONALIZATION', payload: index });
  }, []);

  const startNewPersonalization = useCallback(() => {
    const usedLocationIds = new Set(state.personalizations.map(p => p.location.id));
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

  const duplicatePersonalization = useCallback((sourceId: string, targetLocationId: string) => {
    const targetLocation = state.availableLocations.find(loc => loc.id === targetLocationId);
    if (!targetLocation) {
      toast.error('Local de destino não encontrado');
      return;
    }
    const usedLocationIds = new Set(state.personalizations.map(p => p.location.id));
    if (usedLocationIds.has(targetLocationId)) {
      toast.warning('Este local já possui uma personalização');
      return;
    }
    dispatch({ type: 'DUPLICATE_PERSONALIZATION', payload: { sourceId, targetLocation } });
    toast.success(`Personalização duplicada para ${targetLocation.locationName}`);
  }, [state.availableLocations, state.personalizations]);

  const resetWizard = useCallback(() => {
    dispatch({ type: 'RESET_WIZARD' });
    clearSession();
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const effectivePrice = useMemo(() => state.selectedProduct?.price || 0, [state.selectedProduct]);

  const stepProgress = useMemo(() => {
    return ((getStepIndex(state.currentStep) + 1) / WIZARD_STEPS.length) * 100;
  }, [state.currentStep]);

  const canProceed = useMemo(() => isStepComplete(state.currentStep, state), [state]);
  const canGoBack = useMemo(() => getStepIndex(state.currentStep) > 0, [state.currentStep]);

  const availableLocationsFiltered = useMemo(() => {
    const usedLocationIds = new Set(state.personalizations.map(p => p.location.id));
    if (state.isEditingPersonalization && state.personalizations[state.currentPersonalizationIndex]) {
      const currentLocationId = state.personalizations[state.currentPersonalizationIndex].location.id;
      return state.availableLocations.filter(
        loc => !usedLocationIds.has(loc.id) || loc.id === currentLocationId
      );
    }
    return state.availableLocations.filter(loc => !usedLocationIds.has(loc.id));
  }, [state.availableLocations, state.personalizations, state.isEditingPersonalization, state.currentPersonalizationIndex]);

  const hasAvailableLocations = useMemo(() => {
    const usedLocationIds = new Set(state.personalizations.map(p => p.location.id));
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
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
    // Actions
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
    removeAllPersonalizations,
    editPersonalization,
    startNewPersonalization,
    cancelPersonalization,
    duplicatePersonalization,
    resetWizard,
    isStepComplete: (step: WizardStep) => isStepComplete(step, state),
    canNavigateToStep: (step: WizardStep) => canNavigateToStep(step, state),
  };
}

export type UseSimulatorWizardReturn = ReturnType<typeof useSimulatorWizard>;

// ============================================
// v6 MAPPER: GravacaoLocation[] → EngravingLocation[]
// ============================================

function mapV6LocationsToWizard(locations: GravacaoLocation[]): EngravingLocation[] {
  return locations
    .sort((a, b) => a.location_order - b.location_order)
    .map((loc) => {
      const maxWidth = Math.max(...loc.options.map(t => t.efetiva_largura_max || t.max_width || 0));
      const maxHeight = Math.max(...loc.options.map(t => t.efetiva_altura_max || t.max_height || 0));

      const availableTechniques: AvailableTechnique[] = loc.options.map((t) => ({
        id: t.technique_id,
        printAreaId: t.technique_id,
        techniqueId: t.technique_id,
        techniqueName: t.tecnica_nome,
        techniqueCode: t.codigo_tabela,
        maxColors: t.max_cores,
        isDefault: false,
        isCurved: t.is_curved,
        hasPricing: true,
        areaMaxWidth: t.efetiva_largura_max,
        areaMaxHeight: t.efetiva_altura_max,
        grupoTecnica: t.grupo_tecnica,
        cobraPorCor: t.cobra_por_cor,
        usaDimensao: t.usa_dimensao,
        efetivaLarguraMax: t.efetiva_largura_max,
        efetivaAlturaMax: t.efetiva_altura_max,
        variacaoLabel: t.variacao_label,
        shape: t.shape,
      }));

      return {
        id: loc.location_code,
        componentId: loc.location_code,
        componentCode: loc.location_code,
        componentName: loc.location_name,
        locationCode: loc.location_code,
        locationName: loc.location_name,
        maxWidthCm: maxWidth,
        maxHeightCm: maxHeight,
        maxAreaCm2: null,
        areaImageUrl: null,
        isFromGroup: false,
        availableTechniques,
      };
    });
}
