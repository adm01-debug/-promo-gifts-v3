/**
 * Kit Builder Hook
 * Gerencia o estado completo do montador de kits.
 * Refatorado seguindo SOLID para melhor manutenibilidade.
 */
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  type KitBox,
  type KitItem,
  type KitType,
  type KitIdentity,
  type KitPersonalization,
  type KitItemPersonalization,
  type KitBuilderStep,
  type KitBuilderWizardState,
  type CompatibilityResult,
  checkItemFits,
} from '@/lib/kit-builder';
import { useKitBuilderQueries } from './useKitBuilderQueries';
import { useKitBuilderCalculations } from './useKitBuilderCalculations';

export function useKitBuilder() {
  // --- Estados de Dados ---
  const [kitName, setKitName] = useState('');
  const [kitType, setKitType] = useState<KitType>('montado');
  const [selectedBox, setSelectedBox] = useState<KitBox | null>(null);
  const [selectedItems, setSelectedItems] = useState<KitItem[]>([]);
  const [personalization, setPersonalization] = useState<KitPersonalization>({
    box: { enabled: false },
    items: {},
  });
  const [kitQuantity, setKitQuantity] = useState(1);
  const [identity, setIdentity] = useState<KitIdentity>({
    color: '#3B82F6',
    icon: 'Package',
    tag: '',
    description: '',
    isFavorite: false,
  });

  // --- Estado do Wizard ---
  const [currentStep, setCurrentStep] = useState<KitBuilderStep>('box');

  // --- Queries ---
  const {
    availableBoxes,
    availableItems,
    isLoadingBoxes,
    isLoadingItems,
    boxFilters,
    itemFilters,
    setBoxFilters,
    setItemFilters,
  } = useKitBuilderQueries();

  // --- Cálculos (SOLID: Responsabilidade isolada) ---
  const kitState = useKitBuilderCalculations(
    kitName,
    kitType,
    selectedBox,
    selectedItems,
    personalization,
    kitQuantity,
    identity
  );

  const wizardState = useMemo((): KitBuilderWizardState => {
    const completedSteps: KitBuilderStep[] = [];
    if (selectedBox) completedSteps.push('box');
    if (selectedItems.length > 0) completedSteps.push('items');
    if (Object.keys(personalization.items).length > 0 || personalization.box.enabled || currentStep === 'summary') {
      completedSteps.push('personalization');
    }

    let canProceed = false;
    switch (currentStep) {
      case 'box': canProceed = selectedBox !== null; break;
      case 'items': canProceed = selectedItems.length > 0 && kitState.volumeUsagePercent <= 100; break;
      case 'personalization': canProceed = true; break;
      case 'summary': canProceed = kitState.isValid; break;
    }

    return { currentStep, completedSteps, canProceed };
  }, [currentStep, selectedBox, selectedItems, personalization, kitState]);

  // --- Ações ---
  const selectBox = useCallback((box: KitBox) => setSelectedBox(box), []);
  const clearBox = useCallback(() => {
    setSelectedBox(null);
    setSelectedItems([]);
    setPersonalization({ box: { enabled: false }, items: {} });
  }, []);

  const addItem = useCallback((item: KitItem): CompatibilityResult => {
    if (!selectedBox) return { fits: false, reason: 'Selecione uma caixa primeiro' };
    
    const existingIndex = selectedItems.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      const updatedItems = [...selectedItems];
      const newQuantity = updatedItems[existingIndex].quantity + 1;
      const result = checkItemFits({ ...item, quantity: 1 }, selectedBox, selectedItems.filter((_, i) => i !== existingIndex), newQuantity);
      if (result.fits) {
        updatedItems[existingIndex] = { ...updatedItems[existingIndex], quantity: newQuantity };
        setSelectedItems(updatedItems);
      }
      return result;
    }

    const result = checkItemFits(item, selectedBox, selectedItems, 1);
    if (result.fits) setSelectedItems((prev) => [...prev, { ...item, quantity: 1 }]);
    return result;
  }, [selectedBox, selectedItems]);

  const removeItem = useCallback((itemId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
    setPersonalization((prev) => {
      const { [itemId]: _, ...rest } = prev.items;
      return { ...prev, items: rest };
    });
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(itemId);
    if (selectedBox) {
      const item = selectedItems.find((i) => i.id === itemId);
      if (item && quantity > item.quantity) {
        const result = checkItemFits(item, selectedBox, selectedItems.filter((i) => i.id !== itemId), quantity);
        if (!result.fits) {
          toast.warning('Volume excedido', { description: result.reason || 'Essa quantidade não cabe na caixa.' });
          return;
        }
      }
    }
    setSelectedItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)));
  }, [removeItem, selectedBox, selectedItems]);

  const updateItemVariant = useCallback((itemId: string, data: any) => {
    setSelectedItems((prev) => prev.map((item) => item.id === itemId ? {
      ...item,
      selectedColor: data.color,
      selectedSize: data.size,
      ...(data.sku && { sku: data.sku }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.price !== undefined && { price: data.price }),
    } : item));
  }, []);

  const updateItemColor = useCallback((itemId: string, color: any) => {
    setSelectedItems((prev) => prev.map((item) => item.id === itemId ? { ...item, selectedColor: color } : item));
  }, []);

  const toggleOptionalItem = useCallback((itemId: string, item?: KitItem) => {
    setSelectedItems((prev) => prev.find((i) => i.id === itemId) ? prev.filter((i) => i.id !== itemId) : item ? [...prev, { ...item, quantity: 1 }] : prev);
  }, []);

  const setItemPersonalization = useCallback((itemId: string, config: KitItemPersonalization) => {
    setPersonalization((prev) => ({ ...prev, items: { ...prev.items, [itemId]: config } }));
  }, []);

  const setBoxPersonalization = useCallback((config: KitItemPersonalization) => {
    setPersonalization((prev) => ({ ...prev, box: config }));
  }, []);

  const goToStep = useCallback((step: KitBuilderStep) => setCurrentStep(step), []);
  const nextStep = useCallback(() => {
    const steps: KitBuilderStep[] = ['box', 'items', 'personalization', 'summary'];
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) setCurrentStep(steps[idx + 1]);
  }, [currentStep]);

  const prevStep = useCallback(() => {
    const steps: KitBuilderStep[] = ['box', 'items', 'personalization', 'summary'];
    const idx = steps.indexOf(currentStep);
    if (idx > 0) setCurrentStep(steps[idx - 1]);
  }, [currentStep]);

  const reorderItems = useCallback((from: number, to: number) => {
    setSelectedItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const resetKit = useCallback(() => {
    setKitName(''); setKitType('montado'); setSelectedBox(null); setSelectedItems([]);
    setPersonalization({ box: { enabled: false }, items: {} }); setKitQuantity(1);
    setIdentity({ color: '#3B82F6', icon: 'Package', tag: '', description: '', isFavorite: false });
    setCurrentStep('box');
  }, []);

  const loadKit = useCallback((data: any) => {
    setKitName(data.name); setKitType(data.kitType); setSelectedBox(data.box);
    setSelectedItems(data.items); setPersonalization(data.personalization || { box: { enabled: false }, items: {} });
    setKitQuantity(data.kitQuantity || 1);
    if (data.identity) setIdentity({
      color: data.identity.color || '#3B82F6',
      icon: data.identity.icon || 'Package',
      tag: data.identity.tag || '',
      description: data.identity.description || '',
      isFavorite: data.identity.isFavorite ?? false,
    });
    setCurrentStep('summary');
  }, []);

  // --- Filtering ---
  const filteredItems = useMemo(() => {
    let items = availableItems.map(item => ({
      ...item,
      compatibility: selectedBox ? checkItemFits(item, selectedBox, selectedItems, 1) : null
    }));
    if (itemFilters.onlyFitting) items = items.filter(i => i.compatibility?.fits !== false);
    if (itemFilters.maxVolume) items = items.filter(i => i.volume <= (itemFilters.maxVolume || Infinity));
    if (itemFilters.category) items = items.filter(i => i.category?.toLowerCase().includes(itemFilters.category!.toLowerCase()));
    return items;
  }, [availableItems, selectedBox, selectedItems, itemFilters]);

  return {
    kitState, wizardState, kitQuantity, availableBoxes, availableItems: filteredItems,
    isLoadingBoxes, isLoadingItems, boxFilters, setBoxFilters, itemFilters, setItemFilters,
    setKitName, setKitType, selectBox, clearBox, addItem, removeItem, updateItemQuantity,
    updateItemColor, updateItemVariant, toggleOptionalItem, reorderItems, setItemPersonalization,
    setBoxPersonalization, setKitQuantity, setIdentity, goToStep, nextStep, prevStep, resetKit, loadKit,
  };
}

