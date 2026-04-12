/**
 * useCatalogFiltering — Filtering and sorting logic extracted from useCatalogState
 */
import { useMemo } from "react";
import type { Product } from "@/hooks/useProducts";
import type { FilterState } from "@/components/filters/FilterPanel";
import type { SortOption } from "./useCatalogState";
import { sortProducts } from "@/utils/product-sorting";

interface CatalogFilteringOptions {
  realProducts: Product[];
  filters: FilterState;
  sortBy: SortOption;
  hasFuzzySearch: boolean;
  fuzzySearchResults: Product[];
  hasMaterialFilter: boolean;
  materialFilteredProductIds: Set<string>;
  isLoadingMaterialFilter: boolean;
  hasCategoryFilter: boolean;
  categoryFilteredProductIds: Set<string>;
  isLoadingCategoryFilter: boolean;
  promoSalesMap?: Map<string, number>;
  supplierSalesMap?: Map<string, number>;
}

export function useCatalogFiltering({
  realProducts, filters, sortBy, hasFuzzySearch, fuzzySearchResults,
  hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter,
  hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter,
  promoSalesMap, supplierSalesMap,
}: CatalogFilteringOptions): Product[] {
  return useMemo(() => {
    let result = hasFuzzySearch ? [...fuzzySearchResults] : [...realProducts];

    if (hasCategoryFilter && categoryFilteredProductIds.size > 0) {
      result = result.filter((p) => categoryFilteredProductIds.has(p.id));
    } else if (hasCategoryFilter && categoryFilteredProductIds.size === 0 && !isLoadingCategoryFilter) {
      result = [];
    }

    if (filters.colors.length) {
      result = result.filter((p) =>
        p.colors?.some((c: Record<string, string>) => filters.colors.includes(c.name)) || false
      );
    }

    if (filters.colorGroups?.length) {
      result = result.filter((p) =>
        p.colors?.some((c: Record<string, string>) => {
          const colorGroupSlug = c.groupSlug || '';
          const colorGroup = (c.group || '').toLowerCase().trim();
          const colorName = (c.name || '').toLowerCase().trim();
          return filters.colorGroups.some(slug => {
            const slugLower = slug.toLowerCase().trim();
            if (colorGroupSlug === slugLower) return true;
            if (colorGroup === slugLower) return true;
            if (colorGroup.includes(slugLower) || slugLower.includes(colorGroup)) return true;
            if (colorName.includes(slugLower) || slugLower.includes(colorName.split(/[\s-]/)[0])) return true;
            return false;
          });
        }) || false
      );
    }

    if (filters.colorVariations?.length) {
      result = result.filter((p) =>
        p.colors?.some((c: Record<string, string>) => {
          const colorVariationSlug = c.variationSlug || '';
          const colorName = (c.name || '').toLowerCase().trim();
          return filters.colorVariations.some(slug => {
            const slugLower = slug.toLowerCase().trim();
            if (colorVariationSlug === slugLower) return true;
            const slugWords = slugLower.split('-');
            return slugWords.every(word => colorName.includes(word));
          });
        }) || false
      );
    }

    if (filters.categories.length) {
      result = result.filter((p) =>
        filters.categories.includes(parseInt(p.category_id || '0')) ||
        filters.categories.map(String).includes(p.category_id || '')
      );
    }

    if (filters.suppliers.length) {
      result = result.filter((p) =>
        filters.suppliers.includes(p.brand || '') ||
        filters.suppliers.includes(p.supplier_reference || '')
      );
    }

    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) {
      result = result.filter((p) => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]);
    }

    if (filters.inStock) {
      result = result.filter((p) => (p.stock || 0) > 0);
    }

    if (filters.gender?.length) {
      const genderFilter = filters.gender;
      result = result.filter((p) => {
        const productGender = (p.gender || '').toLowerCase().trim();
        if (!productGender) return false;
        return genderFilter.some(g => productGender === g.toLowerCase());
      });
    }

    if (hasMaterialFilter && materialFilteredProductIds.size > 0) {
      result = result.filter((p) => materialFilteredProductIds.has(p.id));
    } else if (hasMaterialFilter && materialFilteredProductIds.size === 0 && !isLoadingMaterialFilter) {
      result = [];
    }

    if (!hasMaterialFilter && filters.materiais.length) {
      result = result.filter((p) => {
        const materialsStr = Array.isArray(p.materials) ? p.materials.join(' ').toLowerCase() : (p.materials || '').toLowerCase();
        return filters.materiais.some((m) => materialsStr.includes(m.toLowerCase()));
      });
    }

    // ⚠️ REGRA DE NEGÓCIO — NÃO ALTERAR
    const skipSort = hasFuzzySearch && sortBy === 'name';
    sortProducts(result, sortBy, { promoSalesMap, supplierSalesMap, skipSort });

    return result;
  }, [filters, sortBy, hasFuzzySearch, fuzzySearchResults, realProducts, hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter, hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter, promoSalesMap, supplierSalesMap]);
}
