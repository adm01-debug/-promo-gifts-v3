import { useMemo } from 'react';
import {
  calculateTotalItemsVolume,
  calculateVolumeUsagePercent,
  calculateUsableVolume,
  calculateTotalKitPrice,
  type KitBox,
  type KitItem,
  type KitPersonalization,
  type KitIdentity,
  type KitType,
  type KitState,
} from '@/lib/kit-builder';

export function useKitBuilderCalculations(
  kitName: string,
  kitType: KitType,
  selectedBox: KitBox | null,
  selectedItems: KitItem[],
  personalization: KitPersonalization,
  kitQuantity: number,
  identity: KitIdentity,
) {
  return useMemo((): KitState => {
    const totalItemsVolume = calculateTotalItemsVolume(selectedItems);
    const boxVolume = selectedBox?.internalVolume || 0;
    const usableVolume = selectedBox ? calculateUsableVolume(selectedBox) : 0;
    const availableVolume = Math.max(0, usableVolume - totalItemsVolume);
    const volumeUsagePercent = calculateVolumeUsagePercent(totalItemsVolume, boxVolume);

    const boxWeight = selectedBox?.weight || 0;
    const itemsWeight = selectedItems.reduce(
      (sum, item) => sum + (item.weight || 0) * item.quantity,
      0,
    );
    const totalWeight = boxWeight + itemsWeight;

    const pricing = calculateTotalKitPrice(
      selectedBox,
      selectedItems,
      personalization,
      kitQuantity,
    );

    const validationErrors: string[] = [];
    if (!selectedBox) validationErrors.push('Selecione uma caixa');
    if (selectedItems.length === 0) validationErrors.push('Adicione pelo menos um item ao kit');
    if (volumeUsagePercent > 100)
      validationErrors.push('Volume dos itens excede a capacidade da caixa');

    if (selectedBox?.maxWeight && itemsWeight > selectedBox.maxWeight) {
      validationErrors.push(
        `Peso dos itens (${(itemsWeight / 1000).toFixed(1)}kg) excede o limite da caixa (${(selectedBox.maxWeight / 1000).toFixed(1)}kg)`,
      );
    }

    return {
      name: kitName,
      kitType,
      box: selectedBox,
      items: selectedItems,
      personalization,
      identity,
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
  }, [kitName, kitType, selectedBox, selectedItems, personalization, kitQuantity, identity]);
}
