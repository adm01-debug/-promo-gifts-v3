/**
 * useCatalogFilters — State and sync logic for catalog filters
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { defaultFilters, type FilterState } from '@/components/filters/FilterPanel';
import { useDebounce } from '@/hooks/useDebounce';
import { useProductsByMaterial } from '@/hooks/useProductsByMaterial';
import { useProductsByCategory } from '@/hooks/useProductsByCategory';

export function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isInternalUpdateRef = useRef(false);
  
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [activePresetId, setActivePresetId] = useState<string | undefined>(
    searchParams.get('preset') || undefined
  );
  
  const searchQueryFromUrl = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(searchQueryFromUrl);

  const setFiltersWithPreset = useCallback(
    (newFilters: FilterState, presetId?: string) => {
      isInternalUpdateRef.current = true;
      setFilters(newFilters);
      setActivePresetId(presetId);

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (presetId) next.set('preset', presetId);
          else next.delete('preset');
          return next;
        },
        { replace: true }
      );

      try {
        const channel = new BroadcastChannel('catalog_preset_sync');
        channel.postMessage({ type: 'PRESET_APPLIED', presetId, filters: newFilters });
        channel.close();
      } catch { /* ignore */ }
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const presetFromUrl = searchParams.get('preset') || undefined;
    if (presetFromUrl !== activePresetId) {
      setActivePresetId(presetFromUrl);
    }
  }, [searchParams, activePresetId]);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel('catalog_preset_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'PRESET_APPLIED') {
          const { presetId, filters: newFilters } = event.data;
          isInternalUpdateRef.current = true;
          setFilters(newFilters);
          setActivePresetId(presetId);
        }
      };
      return () => channel.close();
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isInternalUpdateRef.current) {
      const timer = setTimeout(() => { isInternalUpdateRef.current = false; }, 100);
      return () => clearTimeout(timer);
    }

    const timeout = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (searchQuery) next.set('search', searchQuery);
          else next.delete('search');

          if (filters.colorGroups?.length) next.set('colors', filters.colorGroups.join(','));
          else if (!next.get('preset')) next.delete('colors');

          if (filters.categories?.length) next.set('cats', filters.categories.join(','));
          else if (!next.get('preset')) next.delete('cats');

          if (filters.stockStatus === 'in-stock') next.set('stock', 'true');
          else next.delete('stock');

          if (filters.isKit) next.set('kit', 'true');
          else next.delete('kit');

          if (next.toString() === prev.toString()) return prev;
          return next;
        },
        { replace: true }
      );
    }, 500);

    return () => clearTimeout(timeout);
  }, [filters, searchQuery, activePresetId, setSearchParams]);

  useEffect(() => {
    if (searchQueryFromUrl !== searchQuery) {
      setSearchQuery(searchQueryFromUrl);
    }
  }, [searchQueryFromUrl]);

  const activeFiltersCount = useMemo(() => {
    if (!filters) return 0;
    let count = 0;
    if (filters.colors?.length) count += filters.colors.length;
    if (filters.colorGroups?.length) count += filters.colorGroups.length;
    if (filters.colorVariations?.length) count += filters.colorVariations.length;
    if (filters.colorNuances?.length) count += filters.colorNuances.length;
    if (filters.categories?.length) count += filters.categories.length;
    if (filters.suppliers?.length) count += filters.suppliers.length;
    if (filters.publicoAlvo?.length) count += filters.publicoAlvo.length;
    if (filters.datasComemorativas?.length) count += filters.datasComemorativas.length;
    if (filters.endomarketing?.length) count += filters.endomarketing.length;
    if (filters.ramosAtividade?.length) count += filters.ramosAtividade.length;
    if (filters.segmentosAtividade?.length) count += filters.segmentosAtividade.length;
    if (filters.materialGroups?.length) count += filters.materialGroups.length;
    if (filters.materialTypes?.length) count += filters.materialTypes.length;
    if (filters.materials?.length) count += filters.materials.length;
    if (filters.priceRange?.[0] > 0 || filters.priceRange?.[1] < 9999) count += 1;
    if (filters.stockStatus !== 'all' || filters.minStock > 0) count += 1;
    if (filters.isKit) count += 1;
    if (filters.isFeatured) count += 1;
    if (filters.isNew) count += 1;
    if (filters.hasPersonalization) count += 1;
    if (filters.gender?.length) count += filters.gender.length;
    if (filters.sizes?.length) count += filters.sizes.length;
    return count;
  }, [filters]);

  const {
    productIds: materialFilteredProductIds,
    hasFilter: hasMaterialFilter,
    isLoading: isLoadingMaterialFilter,
  } = useProductsByMaterial({
    materialGroupSlugs: filters.materialGroups || [],
    materialTypeSlugs: filters.materialTypes || [],
  });

  const {
    productIds: categoryFilteredProductIds,
    hasFilter: hasCategoryFilter,
    isLoading: isLoadingCategoryFilter,
  } = useProductsByCategory({
    categoryIds: (filters.categories || []).map(String),
    includeDescendants: true,
  });

  return {
    filters,
    setFilters,
    setFiltersWithPreset,
    activePresetId,
    searchQuery,
    setSearchQuery,
    activeFiltersCount,
    materialFilteredProductIds,
    hasMaterialFilter,
    isLoadingMaterialFilter,
    categoryFilteredProductIds,
    hasCategoryFilter,
    isLoadingCategoryFilter,
  };
}
