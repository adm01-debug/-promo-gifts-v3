import type { Product } from "@/hooks/useProducts";

/**
 * Centralized product sorting logic.
 * Used by both the Catalog (Index) and Super Filter (FiltersPage).
 */
export function sortProducts(
  products: Product[],
  sortBy: string,
  options?: {
    promoSalesMap?: Map<string, number>;
    skipSort?: boolean;
  }
): Product[] {
  if (options?.skipSort) return products;

  switch (sortBy) {
    case "name":
      products.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "price-asc":
      products.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      products.sort((a, b) => b.price - a.price);
      break;
    case "stock":
      products.sort((a, b) => (b.stock || 0) - (a.stock || 0));
      break;
    case "newest":
      products.sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      break;
    case "best-seller-supplier":
      products.sort((a, b) => {
        const aScore = (a.featured ? 2 : 0) + (a.newArrival ? 1 : 0);
        const bScore = (b.featured ? 2 : 0) + (b.newArrival ? 1 : 0);
        if (bScore !== aScore) return bScore - aScore;
        return (b.stock || 0) - (a.stock || 0);
      });
      break;
    case "best-seller-promo":
      products.sort((a, b) => {
        const map = options?.promoSalesMap;
        const aCount = map?.get(a.id) || 0;
        const bCount = map?.get(b.id) || 0;
        if (bCount !== aCount) return bCount - aCount;
        return a.name.localeCompare(b.name);
      });
      break;
  }

  return products;
}
