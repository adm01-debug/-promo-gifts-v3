/**
 * Smoke tests para hooks de catálogo complexos (deps de muitos contextos).
 */
import "../components/render-helpers";
import { vi } from "vitest";

vi.mock("@/contexts/ProductsContext", () => ({
  useProductsContext: () => ({ products: [], isLoading: false, refetch: vi.fn() }),
  ProductsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({ currentOrg: null, organizations: [], isLoading: false }),
}));

import { useCatalogFiltering } from "@/hooks/useCatalogFiltering";
import { useComparisonSync } from "@/hooks/useComparisonSync";
import { smokeHook } from "./_helpers/smoke-template";

smokeHook("useCatalogFiltering (vazio)", () =>
  useCatalogFiltering({
    realProducts: [],
    filters: {
      colors: [], colorGroups: [], colorVariations: [], categories: [],
      materials: [], suppliers: [], priceRange: [0, 1000], minQuantityRange: [0, 10000],
      stock: "all", stockStatus: [], search: "", brands: [], tags: [],
      verifiedOnly: false, hasImage: false, sustainableOnly: false,
      certifications: [],
    } as never,
    sortBy: "name",
    hasFuzzySearch: false,
    fuzzySearchResults: [],
    hasMaterialFilter: false,
    materialFilteredProductIds: new Set(),
    isLoadingMaterialFilter: false,
    hasCategoryFilter: false,
    categoryFilteredProductIds: new Set(),
    isLoadingCategoryFilter: false,
  }),
);

smokeHook("useComparisonSync", () => useComparisonSync());
