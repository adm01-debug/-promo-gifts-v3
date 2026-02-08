/**
 * useSimulatorWizard v2 - Hook central do simulador
 * 
 * Novo fluxo: Produto → Local → Specs → Comparativo
 * Usa fn_get_customization_price_v2 com variantes para comparar técnicas.
 * 
 * FLUXO DE 3 PASSOS DO PREÇO:
 * 1. fn_get_product_print_areas → áreas com técnicas MESTRE
 * 2. category_area_techniques → variantes da técnica (ex: Plana vs Cilíndrica)
 * 3. fn_get_customization_price_v2(p_tecnica_variante_id) → preço final
 */

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  fetchPromobrindPrintAreas,
} from '@/lib/external-db';
import {
  fetchTecnicaVariants,
  calculateCustomizationPriceV2,
} from '@/hooks/useGravacaoPriceV2';
import type { TecnicaVariante } from '@/hooks/useGravacaoPriceV2';
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
// HELPER: Invocar RPC no banco externo
// ============================================

async function invokeExternalRpc<T>(
  rpcName: string,
  params: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      operation: 'rpc',
      rpcName,
      rpcParams: params,
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro na RPC');
  
  return data.data as T;
}

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
        // Limpar personalizações: preços ficam stale com nova quantidade
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
        // Reset specs com base no local selecionado
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
  // QUERIES - Locais de gravação
  // ============================================

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['wizard-locations-v2', state.selectedProduct?.id],
    queryFn: async () => {
      if (!state.selectedProduct?.id) return [];
      
      const printAreas = await fetchPromobrindPrintAreas(state.selectedProduct.id);
      
      if (!printAreas.length) {
        // Fallback: BD local
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
      }

      // Agrupar print areas por localização
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
              printAreaId: area.id, // ID da área para chamada RPC
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

  // Buscar preços comparativos para TODAS as técnicas do local
  // FLUXO v2: Para cada técnica mestre, buscar variantes → calcular preço com variante
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
      // Para cada técnica mestre:
      // 1. Buscar variantes (category_area_techniques)
      // 2. Para cada variante, calcular preço (fn_get_customization_price_v2)
      const allResults: TechniqueComparisonResult[] = [];

      const promises = techniques.map(async (tech) => {
        // Verificar se cores excedem o máximo
        if (tech.maxColors !== null && tech.maxColors > 0 && state.engravingSpecs.colors > tech.maxColors) {
          allResults.push({
            techniqueId: tech.techniqueId,
            techniqueName: tech.techniqueName,
            techniqueCode: tech.techniqueCode,
            printAreaId: tech.printAreaId,
            maxColors: tech.maxColors,
            isAvailable: false,
            unavailableReason: `Máximo ${tech.maxColors} ${tech.maxColors === 1 ? 'cor' : 'cores'}`,
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
          });
          return;
        }

        try {
          // PASSO 2: Buscar variantes da técnica para esta área
          const variants = await fetchTecnicaVariants({
            categoryPrintAreaId: tech.printAreaId,
            tecnicaGravacaoId: tech.techniqueId,
          });

          if (variants.length === 0) {
            // Fallback: tentar RPC antiga se não encontrar variantes
            try {
              const fallbackResult = await invokeExternalRpc<any>(
                'fn_get_customization_price',
                {
                  p_area_id: tech.printAreaId,
                  p_quantidade: state.quantity,
                  p_num_cores: state.engravingSpecs.colors,
                }
              );
              
              if (fallbackResult?.success) {
                allResults.push({
                  techniqueId: tech.techniqueId,
                  techniqueName: fallbackResult.technique || tech.techniqueName,
                  techniqueCode: tech.techniqueCode,
                  printAreaId: tech.printAreaId,
                  maxColors: tech.maxColors,
                  isAvailable: true,
                  unitPrice: fallbackResult.unit_price || 0,
                  setupPrice: fallbackResult.faturamento_minimo_gravacao || 0,
                  subtotal: fallbackResult.subtotal_pecas || 0,
                  totalPrice: fallbackResult.total_price || 0,
                  costPerUnit: state.quantity > 0 ? (fallbackResult.total_price || 0) / state.quantity : 0,
                  minimumApplied: fallbackResult.minimum_applied || false,
                  budgetCode: fallbackResult.codigo_orcamento || '',
                  productionDays: fallbackResult.prazo_dias ?? fallbackResult.production_days ?? null,
                  markupPercent: fallbackResult.markup_percent || 0,
                  marginPercent: fallbackResult.margin_percent || 0,
                  tierUsed: fallbackResult.faixa_utilizada ?? fallbackResult.tier_used ?? 0,
                  tierMinQty: fallbackResult.tier_min_qty || 0,
                  tierMaxQty: fallbackResult.tier_max_qty || 0,
                  rawData: fallbackResult,
                });
                return;
              }
            } catch {
              // Fallback também falhou
            }

            allResults.push({
              techniqueId: tech.techniqueId,
              techniqueName: tech.techniqueName,
              techniqueCode: tech.techniqueCode,
              printAreaId: tech.printAreaId,
              maxColors: tech.maxColors,
              isAvailable: false,
              unavailableReason: 'Sem variantes disponíveis',
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
            });
            return;
          }

          // PASSO 3: Para cada variante, calcular preço com fn_get_customization_price_v2
          // Verificar max_colors da variante
          const applicableVariants = variants.filter(v => {
            if (v.max_colors === 0) return true; // Full color, sem restrição
            if (v.max_colors === null) return true;
            return state.engravingSpecs.colors <= v.max_colors;
          });

          if (applicableVariants.length === 0) {
            // Nenhuma variante suporta o nº de cores
            allResults.push({
              techniqueId: tech.techniqueId,
              techniqueName: tech.techniqueName,
              techniqueCode: tech.techniqueCode,
              printAreaId: tech.printAreaId,
              maxColors: variants[0]?.max_colors ?? tech.maxColors,
              isAvailable: false,
              unavailableReason: `Nenhuma variante suporta ${state.engravingSpecs.colors} cores`,
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
            });
            return;
          }

          // Calcular preço para cada variante aplicável
          const variantPricePromises = applicableVariants.map(async (variant) => {
            try {
              const result = await calculateCustomizationPriceV2({
                tecnicaVarianteId: variant.tecnica_variante_id,
                quantidade: state.quantity,
                numCores: state.engravingSpecs.colors,
              });

              if (!result || !result.success) {
                return null;
              }

              return {
                variant,
                result,
              };
            } catch (err) {
              console.warn(`Erro v2 para variante ${variant.tecnica_gravacao_variante.nome}:`, err);
              return null;
            }
          });

          const variantResults = (await Promise.all(variantPricePromises)).filter(Boolean);

          if (variantResults.length === 0) {
            allResults.push({
              techniqueId: tech.techniqueId,
              techniqueName: tech.techniqueName,
              techniqueCode: tech.techniqueCode,
              printAreaId: tech.printAreaId,
              maxColors: tech.maxColors,
              isAvailable: false,
              unavailableReason: 'Erro ao calcular preço',
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
            });
            return;
          }

          // Adicionar cada variante como resultado separado
          for (const vr of variantResults) {
            if (!vr) continue;
            const { variant, result } = vr;
            
            allResults.push({
              techniqueId: tech.techniqueId,
              techniqueName: result.technique || variant.tecnica_gravacao_variante.nome,
              techniqueCode: variant.tecnica_gravacao_variante.codigo || tech.techniqueCode,
              printAreaId: tech.printAreaId,
              maxColors: variant.max_colors,
              variantId: variant.tecnica_variante_id,
              variantName: variant.tecnica_gravacao_variante.nome,
              variantCode: variant.tecnica_gravacao_variante.codigo,
              isAvailable: true,
              unitPrice: result.unit_price || 0,
              setupPrice: result.faturamento_minimo_gravacao || 0,
              subtotal: result.subtotal_pecas || 0,
              totalPrice: result.total_price || 0,
              costPerUnit: state.quantity > 0 ? (result.total_price || 0) / state.quantity : 0,
              minimumApplied: result.minimum_applied || false,
              budgetCode: result.codigo_orcamento || '',
              productionDays: result.prazo_dias ?? null,
              markupPercent: result.markup_percent || 0,
              marginPercent: 0,
              tierUsed: result.faixa_utilizada || 0,
              tierMinQty: 0,
              tierMaxQty: 0,
              rawData: result as unknown as Record<string, unknown>,
            });
          }
        } catch (err) {
          console.warn(`Erro ao buscar variantes para ${tech.techniqueName}:`, err);
          allResults.push({
            techniqueId: tech.techniqueId,
            techniqueName: tech.techniqueName,
            techniqueCode: tech.techniqueCode,
            printAreaId: tech.printAreaId,
            maxColors: tech.maxColors,
            isAvailable: false,
            unavailableReason: 'Erro ao calcular preço',
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
          });
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
            r.isCheapest = r.techniqueId === cheapest.techniqueId && r.variantId === cheapest.variantId;
            r.isFastest = r.techniqueId === fastest.techniqueId && r.variantId === fastest.variantId && available.length > 1;
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
      // Atualizar existente via action dedicada
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

  // Locais filtrados (exclui já personalizados)
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

  // Totais consolidados (produto + todas as personalizações)
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

  // Max cores disponível para o local selecionado
  const maxColorsForLocation = useMemo(() => {
    if (!state.selectedLocation) return 10;
    const maxColors = state.selectedLocation.availableTechniques
      .map(t => t.maxColors)
      .filter((c): c is number => c !== null);
    return maxColors.length > 0 ? Math.max(...maxColors) : 10;
  }, [state.selectedLocation]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    ...state,
    
    // Loading states
    locationsLoading,
    
    // Computed
    effectivePrice,
    stepProgress,
    canProceed,
    canGoBack,
    availableLocationsFiltered,
    hasAvailableLocations,
    totals,
    maxColorsForLocation,
    
    // Navigation
    setStep,
    nextStep,
    previousStep,
    
    // Product
    selectProduct,
    setQuantity,
    
    // Location
    selectLocation,
    
    // Specs
    updateSpecs,
    
    // Comparison
    fetchComparisonPrices,
    confirmTechnique,
    
    // Personalization Management
    removePersonalization,
    editPersonalization,
    startNewPersonalization,
    cancelPersonalization,
    
    // Reset
    resetWizard,
    
    // Helpers
    isStepComplete: (step: WizardStep) => isStepComplete(step, state),
    canNavigateToStep: (step: WizardStep) => canNavigateToStep(step, state),
  };
}

export type UseSimulatorWizardReturn = ReturnType<typeof useSimulatorWizard>;
