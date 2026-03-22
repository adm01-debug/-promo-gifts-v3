/**
 * Kit Builder Queries Hook
 * Isolates React Query calls to prevent "Should have a queue" React bug
 * caused by too many hooks in a single component/hook.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import {
  type KitBox,
  type KitItem,
  type BoxFilters,
  type ItemFilters,
  type ExternalProductForKit,
} from '@/lib/kit-builder';

// Import transformers from the main hook file
import { transformToKitBox, transformToKitItem } from './useKitBuilderTransformers';

export function useKitBuilderQueries() {
  // Debounced search state
  const [boxSearchInput, setBoxSearchInput] = useState('');
  const [itemSearchInput, setItemSearchInput] = useState('');
  const [debouncedBoxSearch, setDebouncedBoxSearch] = useState('');
  const [debouncedItemSearch, setDebouncedItemSearch] = useState('');
  const [boxDimFilters, setBoxDimFilters] = useState<Omit<BoxFilters, 'search'>>({});
  const [itemExtraFilters, setItemExtraFilters] = useState<Omit<ItemFilters, 'search'>>({});

  // Debounce with cleanup
  const boxTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const itemTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (boxTimerRef.current) clearTimeout(boxTimerRef.current);
    boxTimerRef.current = setTimeout(() => setDebouncedBoxSearch(boxSearchInput), 300);
    return () => { if (boxTimerRef.current) clearTimeout(boxTimerRef.current); };
  }, [boxSearchInput]);

  useEffect(() => {
    if (itemTimerRef.current) clearTimeout(itemTimerRef.current);
    itemTimerRef.current = setTimeout(() => setDebouncedItemSearch(itemSearchInput), 300);
    return () => { if (itemTimerRef.current) clearTimeout(itemTimerRef.current); };
  }, [itemSearchInput]);

  const setBoxFilters = useCallback((filters: BoxFilters) => {
    setBoxSearchInput(filters.search || '');
    const { search, ...rest } = filters;
    setBoxDimFilters(rest);
  }, []);

  const setItemFilters = useCallback((filters: ItemFilters) => {
    setItemSearchInput(filters.search || '');
    const { search, ...rest } = filters;
    setItemExtraFilters(rest);
  }, []);

  // Query: boxes — products that have packing_type containing "Caixa" or similar packaging terms
  const { data: availableBoxes = [], isLoading: isLoadingBoxes } = useQuery({
    queryKey: ['kit-builder', 'boxes', debouncedBoxSearch, boxDimFilters.minWidth ?? '', boxDimFilters.minHeight ?? '', boxDimFilters.minDepth ?? ''],
    queryFn: async () => {
      const filters: Record<string, unknown> = {
        active: true,
      };
      if (debouncedBoxSearch) {
        filters._search = debouncedBoxSearch;
      }

      const result = await invokeExternalDb<ExternalProductForKit>({
        table: 'products',
        operation: 'select',
        filters,
        select: 'id, name, sku, sale_price, image_url, primary_image_url, images, dimensions, category_id, weight_g, materials, width_cm, height_cm, length_cm, internal_width_cm, internal_height_cm, internal_length_cm, packing_type, packing_classification',
        limit: 200,
        orderBy: { column: 'name', ascending: true },
        countMode: 'none',
      });

      // Filter products that can serve as boxes:
      // - packing_type contains "Caixa" (case-insensitive)
      // - OR packing_classification is "commercial" and has dimensions
      const boxes = result.records
        .filter(p => {
          const pt = (p.packing_type || '').toLowerCase();
          return pt.includes('caixa') || pt.includes('embalagem') || pt.includes('box');
        })
        .map(p => transformToKitBox(p))
        .filter((box): box is KitBox => box !== null);

      return boxes.filter(box => {
        if (boxDimFilters.minWidth && box.internalWidth < boxDimFilters.minWidth) return false;
        if (boxDimFilters.minHeight && box.internalHeight < boxDimFilters.minHeight) return false;
        if (boxDimFilters.minDepth && box.internalDepth < boxDimFilters.minDepth) return false;
        return true;
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  // Query: items
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

      return result.records
        .filter(p => p.packing_classification !== 'embalagem')
        .map(p => transformToKitItem(p));
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    availableBoxes,
    availableItems,
    isLoadingBoxes,
    isLoadingItems,
    boxFilters: { search: boxSearchInput, ...boxDimFilters } as BoxFilters,
    itemFilters: { search: itemSearchInput, ...itemExtraFilters } as ItemFilters,
    setBoxFilters,
    setItemFilters,
  };
}
