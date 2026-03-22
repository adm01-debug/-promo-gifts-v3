/**
 * Kit Builder Hook
 * Gerencia o estado completo do montador de kits
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import {
  type KitBox,
  type KitItem,
  type KitState,
  type KitPersonalization,
  type KitItemPersonalization,
  type KitBuilderStep,
  type KitBuilderWizardState,
  type BoxFilters,
  type ItemFilters,
  type ExternalProductForKit,
  type CompatibilityResult,
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
// QUERY KEYS
// ============================================

const KIT_BUILDER_KEYS = {
  boxes: ['kit-builder', 'boxes'] as const,
  items: ['kit-builder', 'items'] as const,
};

// ============================================
// TRANSFORMADORES
// ============================================

function transformToKitBox(product: ExternalProductForKit): KitBox | null {
  const dimensions = extractProductDimensions(product);
  
  // Se não tem dimensões, não pode ser usado como caixa
  if (!dimensions) return null;

  const volume = calculateVolume(dimensions.width, dimensions.height, dimensions.depth);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    imageUrl: product.primary_image_url || product.image_url || product.images?.[0] || null,
    price: product.sale_price || product.base_price || 0,
    internalWidth: dimensions.width,
    internalHeight: dimensions.height,
    internalDepth: dimensions.depth,
    internalVolume: volume,
  };
}

function transformToKitItem(product: ExternalProductForKit, category?: string): KitItem {
  const dimensions = extractProductDimensions(product) || estimateDefaultDimensions(category);
  const volume = calculateVolume(dimensions.width, dimensions.height, dimensions.depth);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    imageUrl: product.primary_image_url || product.image_url || product.images?.[0] || null,
    price: product.sale_price || product.base_price || 0,
    width: dimensions.width,
    height: dimensions.height,
    depth: dimensions.depth,
    volume,
    weight: product.weight_g ?? undefined,
    category,
    quantity: 1,
    allowsPersonalization: true,
  };
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useKitBuilder() {
  // Estado do kit
  const [kitName, setKitName] = useState('');
  const [selectedBox, setSelectedBox] = useState<KitBox | null>(null);
  const [selectedItems, setSelectedItems] = useState<KitItem[]>([]);
  const [personalization, setPersonalization] = useState<KitPersonalization>({
    box: { enabled: false },
    items: {},
  });
  const [kitQuantity, setKitQuantity] = useState(1);

  // Estado do wizard
  const [currentStep, setCurrentStep] = useState<KitBuilderStep>('box');

  // Estado de filtros
  const [boxFilters, setBoxFilters] = useState<BoxFilters>({});
  const [itemFilters, setItemFilters] = useState<ItemFilters>({});

  // ============================================
  // QUERIES
  // ============================================

  // Busca caixas/embalagens disponíveis
  // No banco externo, qualquer produto pode ser usado como embalagem.
  // Busca todos com dimensões válidas e o usuário filtra por nome (ex: "caixa", "maleta")
  const { data: availableBoxes = [], isLoading: isLoadingBoxes } = useQuery({
    queryKey: [...KIT_BUILDER_KEYS.boxes, boxFilters],
    queryFn: async () => {
      const result = await invokeExternalDb<ExternalProductForKit>({
        table: 'products',
        operation: 'select',
        filters: { 
          active: true,
          ...(boxFilters.search ? { name: boxFilters.search } : {}),
        },
        select: 'id, name, sku, sale_price, image_url, primary_image_url, dimensions, product_type, category_id',
        limit: 100,
        orderBy: { column: 'name', ascending: true },
        countMode: 'none',
      });

      // Transforma e filtra apenas produtos com dimensões válidas
      const boxes = result.records
        .map(p => transformToKitBox(p))
        .filter((box): box is KitBox => box !== null);

      // Aplica filtros de dimensão mínima
      return boxes.filter(box => {
        if (boxFilters.minWidth && box.internalWidth < boxFilters.minWidth) return false;
        if (boxFilters.minHeight && box.internalHeight < boxFilters.minHeight) return false;
        if (boxFilters.minDepth && box.internalDepth < boxFilters.minDepth) return false;
        return true;
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  // Busca itens disponíveis para o kit
  const { data: availableItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: [...KIT_BUILDER_KEYS.items, itemFilters],
    queryFn: async () => {
      const result = await invokeExternalDb<ExternalProductForKit>({
        table: 'products',
        operation: 'select',
        filters: { 
          active: true,
          product_type: 'product',
          ...(itemFilters.search ? { name: itemFilters.search } : {}),
        },
        select: 'id, name, sku, sale_price, image_url, primary_image_url, dimensions, product_type, category_id',
        limit: 200,
        orderBy: { column: 'name', ascending: true },
        countMode: 'none',
      });

      return result.records.map(p => transformToKitItem(p));
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
      box: selectedBox,
      items: selectedItems,
      personalization,
      totalItemsVolume,
      availableVolume,
      volumeUsagePercent,
      boxPrice: pricing.boxPrice,
      itemsPrice: pricing.itemsPrice,
      personalizationPrice: pricing.personalizationPrice,
      totalPrice: pricing.total,
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }, [kitName, selectedBox, selectedItems, personalization, kitQuantity]);

  const wizardState = useMemo((): KitBuilderWizardState => {
    const completedSteps: KitBuilderStep[] = [];
    
    if (selectedBox) completedSteps.push('box');
    if (selectedItems.length > 0) completedSteps.push('items');
    
    // Personalização é opcional, considera completa se foi revisada
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
        canProceed = true; // Sempre pode prosseguir (personalização é opcional)
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

    // Verifica se já existe
    const existingIndex = selectedItems.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      // Incrementa quantidade
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

    // Novo item
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

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const updateItemColor = useCallback((itemId: string, color: { name: string; hex?: string }) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, selectedColor: color } : item
      )
    );
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

    // Filtra apenas itens que cabem
    if (itemFilters.onlyFitting) {
      items = items.filter(item => item.compatibility?.fits !== false);
    }

    // Filtra por volume máximo
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

    // Filtros
    boxFilters,
    setBoxFilters,
    itemFilters,
    setItemFilters,

    // Ações - Kit Name
    setKitName,

    // Ações - Box
    selectBox,
    clearBox,

    // Ações - Items
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemColor,

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
