/**
 * Kit Builder Hook
 * Gerencia o estado completo do montador de kits
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProductImageUrl, getProductPrice, invokeExternalDb } from '@/lib/external-db';
import {
  type KitBox,
  type KitItem,
  type KitState,
  type KitType,
  type KitPersonalization,
  type KitItemPersonalization,
  type KitBuilderStep,
  type KitBuilderWizardState,
  type BoxFilters,
  type ItemFilters,
  type ExternalProductForKit,
  type CompatibilityResult,
  mmToCm,
  calculateVolume,
  calculateTotalItemsVolume,
  calculateVolumeUsagePercent,
  calculateUsableVolume,
  checkItemFits,
  calculateTotalKitPrice,
  extractProductDimensions,
  estimateDefaultDimensions,
} from '@/lib/kit-builder';

// ============================================

// ============================================
// TRANSFORMADORES
// ============================================

function resolveProductMaterial(product: ExternalProductForKit): string | undefined {
  if (product.material) return product.material;
  if (!Array.isArray(product.materials) || product.materials.length === 0) return undefined;

  const firstMaterial = product.materials[0];
  if (typeof firstMaterial === 'string') return firstMaterial;
  if (firstMaterial && typeof firstMaterial === 'object') {
    const candidate = (firstMaterial as { name?: string; material?: string }).name ?? (firstMaterial as { name?: string; material?: string }).material;
    return typeof candidate === 'string' && candidate.trim() ? candidate : undefined;
  }

  return undefined;
}

function transformToKitBox(product: ExternalProductForKit): KitBox | null {
  let dimensions: { width: number; height: number; depth: number } | null = null;

  const wMm = mmToCm(product.width_mm);
  const hMm = mmToCm(product.height_mm);
  const lMm = mmToCm(product.length_mm);
  if (wMm && hMm && lMm) {
    dimensions = { width: wMm, height: hMm, depth: lMm };
  }

  if (!dimensions) {
    dimensions = extractProductDimensions(product);
  }

  if (!dimensions) return null;

  // #9 FIX: Guard against zero dimensions
  if (dimensions.width <= 0 || dimensions.height <= 0 || dimensions.depth <= 0) return null;

  const volume = calculateVolume(dimensions.width, dimensions.height, dimensions.depth);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    imageUrl: getProductImageUrl(product),
    price: getProductPrice(product),
    internalWidth: dimensions.width,
    internalHeight: dimensions.height,
    internalDepth: dimensions.depth,
    internalVolume: volume,
    material: resolveProductMaterial(product),
    weight: product.weight_g ?? undefined,
  };
}

function transformToKitItem(product: ExternalProductForKit, category?: string): KitItem {
  let dimensions: { width: number; height: number; depth: number } | null = null;

  const wMm = mmToCm(product.width_mm);
  const hMm = mmToCm(product.height_mm);
  const lMm = mmToCm(product.length_mm);
  if (wMm && hMm && lMm) {
    dimensions = { width: wMm, height: hMm, depth: lMm };
  }

  if (!dimensions) {
    dimensions = extractProductDimensions(product) || estimateDefaultDimensions(category);
  }

  const volume = calculateVolume(dimensions.width, dimensions.height, dimensions.depth);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    imageUrl: getProductImageUrl(product),
    price: getProductPrice(product),
    width: dimensions.width,
    height: dimensions.height,
    depth: dimensions.depth,
    volume,
    weight: product.weight_g ?? undefined,
    material: resolveProductMaterial(product),
    category,
    quantity: 1,
    isOptional: false,
    isReplaceable: product.is_replaceable ?? false,
    allowsPersonalization: product.allows_personalization ?? true,
    allowedVariantIds: product.allowed_variant_ids ?? undefined,
  };
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useKitBuilder() {
  // Estado do kit
  const [kitName, setKitName] = useState('');
  const [kitType, setKitType] = useState<KitType>('montado');
  const [selectedBox, setSelectedBox] = useState<KitBox | null>(null);
  const [selectedItems, setSelectedItems] = useState<KitItem[]>([]);
  const [personalization, setPersonalization] = useState<KitPersonalization>({
    box: { enabled: false },
    items: {},
  });
  const [kitQuantity, setKitQuantity] = useState(1);

  // Estado do wizard
  const [currentStep, setCurrentStep] = useState<KitBuilderStep>('box');

  // Estado de filtros — input imediato, query debounced
  const [boxSearchInput, setBoxSearchInput] = useState('');
  const [itemSearchInput, setItemSearchInput] = useState('');
  const [boxFilters, setBoxFilters] = useState<BoxFilters>({});
  const [itemFilters, setItemFilters] = useState<ItemFilters>({});

  // Debounced search values for query keys (primitives only)
  const [debouncedBoxSearch, setDebouncedBoxSearch] = useState('');
  const [debouncedItemSearch, setDebouncedItemSearch] = useState('');

  // #1 FIX: Debounce with cleanup using useEffect
  const boxTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const itemTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (boxTimerRef.current) clearTimeout(boxTimerRef.current);
    boxTimerRef.current = setTimeout(() => {
      setDebouncedBoxSearch(boxSearchInput);
    }, 300);
    return () => { if (boxTimerRef.current) clearTimeout(boxTimerRef.current); };
  }, [boxSearchInput]);

  useEffect(() => {
    if (itemTimerRef.current) clearTimeout(itemTimerRef.current);
    itemTimerRef.current = setTimeout(() => {
      setDebouncedItemSearch(itemSearchInput);
    }, 300);
    return () => { if (itemTimerRef.current) clearTimeout(itemTimerRef.current); };
  }, [itemSearchInput]);

  const setBoxFiltersDebounced = useCallback((filters: BoxFilters) => {
    setBoxSearchInput(filters.search || '');
    setBoxFilters(prev => ({ ...prev, ...filters, search: filters.search }));
  }, []);

  const setItemFiltersDebounced = useCallback((filters: ItemFilters) => {
    setItemSearchInput(filters.search || '');
    setItemFilters(prev => ({ ...prev, ...filters, search: filters.search }));
  }, []);

  // ============================================
  // QUERIES — stable primitive query keys
  // ============================================

  // Busca caixas/embalagens
  const { data: availableBoxes = [], isLoading: isLoadingBoxes } = useQuery({
    queryKey: ['kit-builder', 'boxes', debouncedBoxSearch, boxFilters.minWidth ?? '', boxFilters.minHeight ?? '', boxFilters.minDepth ?? ''],
    queryFn: async () => {
      const filters: Record<string, unknown> = {
        active: true,
        packing_classification: 'embalagem',
      };
      if (debouncedBoxSearch) {
        filters._search = debouncedBoxSearch;
      }

      const result = await invokeExternalDb<ExternalProductForKit>({
        table: 'products',
        operation: 'select',
        filters,
        select: 'id, name, sku, sale_price, image_url, primary_image_url, images, dimensions, category_id, weight_g, materials, width_cm, height_cm, length_cm, internal_width_cm, internal_height_cm, internal_length_cm, packing_type, packing_classification',
        limit: 100,
        orderBy: { column: 'name', ascending: true },
        countMode: 'none',
      });

      const boxes = result.records
        .map(p => transformToKitBox(p))
        .filter((box): box is KitBox => box !== null);

      return boxes.filter(box => {
        if (boxFilters.minWidth && box.internalWidth < boxFilters.minWidth) return false;
        if (boxFilters.minHeight && box.internalHeight < boxFilters.minHeight) return false;
        if (boxFilters.minDepth && box.internalDepth < boxFilters.minDepth) return false;
        return true;
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  // Busca itens — exclui embalagens
  const { data: availableItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['kit-builder', 'items', debouncedItemSearch],
    queryFn: async () => {
      const filters: Record<string, unknown> = {
        active: true,
      };
      if (debouncedItemSearch) {
        filters._search = debouncedItemSearch;
      }

      const result = await invokeExternalDb<ExternalProductForKit>({
        table: 'products',
        operation: 'select',
        filters,
        select: 'id, name, sku, sale_price, image_url, primary_image_url, images, dimensions, category_id, weight_g, materials, width_cm, height_cm, length_cm, colors, packing_classification',
        limit: 200,
        orderBy: { column: 'name', ascending: true },
        countMode: 'none',
      });

      // Filter out packaging items on the client side
      return result.records
        .filter(p => p.packing_classification !== 'embalagem')
        .map(p => transformToKitItem(p));
    },
    staleTime: 5 * 60 * 1000,
  });

  // ============================================
  // CÁLCULOS DERIVADOS
  // ============================================

  const kitState = useMemo((): KitState => {
    const totalItemsVolume = calculateTotalItemsVolume(selectedItems);
    const boxVolume = selectedBox?.internalVolume || 0;
    const usableVolume = selectedBox ? calculateUsableVolume(selectedBox) : 0;
    const availableVolume = Math.max(0, usableVolume - totalItemsVolume);
    const volumeUsagePercent = calculateVolumeUsagePercent(totalItemsVolume, boxVolume);

    // Peso total (caixa + itens × quantidade)
    const boxWeight = selectedBox?.weight || 0;
    const itemsWeight = selectedItems.reduce(
      (sum, item) => sum + ((item.weight || 0) * item.quantity), 0
    );
    const totalWeight = boxWeight + itemsWeight;

    const pricing = calculateTotalKitPrice(
      selectedBox,
      selectedItems,
      personalization,
      kitQuantity
    );

    const validationErrors: string[] = [];
    if (!selectedBox) {
      validationErrors.push('Selecione uma caixa');
    }
    if (selectedItems.length === 0) {
      validationErrors.push('Adicione pelo menos um item ao kit');
    }
    if (volumeUsagePercent > 100) {
      validationErrors.push('Volume dos itens excede a capacidade da caixa');
    }

    return {
      name: kitName,
      kitType,
      box: selectedBox,
      items: selectedItems,
      personalization,
      totalItemsVolume,
      availableVolume,
      volumeUsagePercent,
      totalWeight,
      boxPrice: pricing.boxPrice,
      itemsPrice: pricing.itemsPrice,
      personalizationPrice: pricing.personalizationPrice,
      totalPrice: pricing.total,
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }, [kitName, kitType, selectedBox, selectedItems, personalization, kitQuantity]);

  const wizardState = useMemo((): KitBuilderWizardState => {
    const completedSteps: KitBuilderStep[] = [];
    
    if (selectedBox) completedSteps.push('box');
    if (selectedItems.length > 0) completedSteps.push('items');
    
    const hasPersonalizationConfig = Object.keys(personalization.items).length > 0 || personalization.box.enabled;
    if (hasPersonalizationConfig || currentStep === 'summary') {
      completedSteps.push('personalization');
    }

    let canProceed = false;
    switch (currentStep) {
      case 'box':
        canProceed = selectedBox !== null;
        break;
      case 'items':
        canProceed = selectedItems.length > 0 && kitState.volumeUsagePercent <= 100;
        break;
      case 'personalization':
        canProceed = true;
        break;
      case 'summary':
        canProceed = kitState.isValid;
        break;
    }

    return {
      currentStep,
      completedSteps,
      canProceed,
    };
  }, [currentStep, selectedBox, selectedItems, personalization, kitState]);

  // ============================================
  // AÇÕES
  // ============================================

  const selectBox = useCallback((box: KitBox) => {
    setSelectedBox(box);
  }, []);

  const clearBox = useCallback(() => {
    setSelectedBox(null);
    setSelectedItems([]);
    setPersonalization({ box: { enabled: false }, items: {} });
  }, []);

  const addItem = useCallback((item: KitItem): CompatibilityResult => {
    if (!selectedBox) {
      return { fits: false, reason: 'Selecione uma caixa primeiro' };
    }

    const existingIndex = selectedItems.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      const updatedItems = [...selectedItems];
      const newQuantity = updatedItems[existingIndex].quantity + 1;
      
      const result = checkItemFits(
        { ...item, quantity: 1 },
        selectedBox,
        selectedItems.filter((_, i) => i !== existingIndex),
        newQuantity
      );

      if (result.fits) {
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: newQuantity,
        };
        setSelectedItems(updatedItems);
      }

      return result;
    }

    const result = checkItemFits(item, selectedBox, selectedItems, 1);
    
    if (result.fits) {
      setSelectedItems(prev => [...prev, { ...item, quantity: 1 }]);
    }

    return result;
  }, [selectedBox, selectedItems]);

  const removeItem = useCallback((itemId: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== itemId));
    setPersonalization(prev => {
      const { [itemId]: _, ...rest } = prev.items;
      return { ...prev, items: rest };
    });
  }, []);

  // #5 FIX: Validate volume on quantity increment
  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    if (selectedBox) {
      const item = selectedItems.find(i => i.id === itemId);
      if (item && quantity > item.quantity) {
        const otherItems = selectedItems.filter(i => i.id !== itemId);
        const result = checkItemFits(item, selectedBox, otherItems, quantity);
        if (!result.fits) {
          return; // Silently prevent overflow
        }
      }
    }

    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, [removeItem, selectedBox, selectedItems]);

  // #4 FIX: Update variant data (price, image, SKU, color)
  const updateItemVariant = useCallback((itemId: string, variantData: {
    color: { name: string; hex?: string };
    sku?: string;
    imageUrl?: string | null;
    price?: number;
  }) => {
    setSelectedItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          selectedColor: variantData.color,
          ...(variantData.sku && { sku: variantData.sku }),
          ...(variantData.imageUrl !== undefined && { imageUrl: variantData.imageUrl }),
          ...(variantData.price !== undefined && { price: variantData.price }),
        };
      })
    );
  }, []);

  const updateItemColor = useCallback((itemId: string, color: { name: string; hex?: string }) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, selectedColor: color } : item
      )
    );
  }, []);

  /** Toggle optional item inclusion (G10) */
  // #6 FIX: Accept full item for re-add
  const toggleOptionalItem = useCallback((itemId: string, item?: KitItem) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === itemId);
      if (exists) {
        return prev.filter(i => i.id !== itemId);
      }
      if (item) {
        return [...prev, { ...item, quantity: 1 }];
      }
      return prev;
    });
  }, []);

  const setItemPersonalization = useCallback((itemId: string, config: KitItemPersonalization) => {
    setPersonalization(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [itemId]: config,
      },
    }));
  }, []);

  const setBoxPersonalization = useCallback((config: KitItemPersonalization) => {
    setPersonalization(prev => ({
      ...prev,
      box: config,
    }));
  }, []);

  const goToStep = useCallback((step: KitBuilderStep) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    const steps: KitBuilderStep[] = ['box', 'items', 'personalization', 'summary'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    const steps: KitBuilderStep[] = ['box', 'items', 'personalization', 'summary'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep]);

  const resetKit = useCallback(() => {
    setKitName('');
    setKitType('montado');
    setSelectedBox(null);
    setSelectedItems([]);
    setPersonalization({ box: { enabled: false }, items: {} });
    setKitQuantity(1);
    setCurrentStep('box');
  }, []);

  // ============================================
  // FILTROS COM COMPATIBILIDADE
  // ============================================

  const itemsWithCompatibility = useMemo(() => {
    if (!selectedBox) return availableItems.map(item => ({ ...item, compatibility: null as CompatibilityResult | null }));

    return availableItems.map(item => {
      const compatibility = checkItemFits(item, selectedBox, selectedItems, 1);
      return { ...item, compatibility };
    });
  }, [availableItems, selectedBox, selectedItems]);

  const filteredItems = useMemo(() => {
    let items = itemsWithCompatibility;

    if (itemFilters.onlyFitting) {
      items = items.filter(item => item.compatibility?.fits !== false);
    }

    if (itemFilters.maxVolume) {
      items = items.filter(item => item.volume <= (itemFilters.maxVolume || Infinity));
    }

    return items;
  }, [itemsWithCompatibility, itemFilters]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // Estado
    kitState,
    wizardState,
    kitQuantity,
    
    // Dados disponíveis
    availableBoxes,
    availableItems: filteredItems,
    isLoadingBoxes,
    isLoadingItems,

    // Filtros (with debounce)
    boxFilters,
    setBoxFilters: setBoxFiltersDebounced,
    itemFilters,
    setItemFilters: setItemFiltersDebounced,

    // Ações - Kit
    setKitName,
    setKitType,

    // Ações - Box
    selectBox,
    clearBox,

    // Ações - Items
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemColor,
    updateItemVariant,
    toggleOptionalItem,

    // Ações - Personalização
    setItemPersonalization,
    setBoxPersonalization,

    // Ações - Quantity
    setKitQuantity,

    // Ações - Wizard
    goToStep,
    nextStep,
    prevStep,
    resetKit,
  };
}
