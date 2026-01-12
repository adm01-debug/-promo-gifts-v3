import { useMemo } from "react";
import { Product } from "@/hooks/useProducts";
import { PRODUCTS } from "@/data/mockData";

interface SupplierProduct {
  product: Product;
  priceDiff: number;
  priceDiffPercent: number;
  stockAdvantage: boolean;
  isLowestPrice: boolean;
  isBestStock: boolean;
}

interface SupplierComparisonResult {
  baseProduct: Product;
  alternatives: SupplierProduct[];
  lowestPrice: number;
  highestStock: number;
  priceRange: { min: number; max: number };
}

export function useSupplierComparison(productId: string | undefined) {
  const result = useMemo((): SupplierComparisonResult | null => {
    if (!productId) return null;

    const baseProduct = PRODUCTS.find((p) => p.id === productId);
    if (!baseProduct) return null;

    // Find similar products from different suppliers
    // Match by: similar name, same category, or similar SKU pattern
    const similarProducts = PRODUCTS.filter((p) => {
      if (p.id === productId) return false;
      if (p.supplier.id === baseProduct.supplier.id) return false;

      // Check similarity criteria
      const nameSimilarity = calculateNameSimilarity(baseProduct.name, p.name);
      const sameCategory = p.category.id === baseProduct.category.id;
      const sameSubcategory = p.subcategory === baseProduct.subcategory;
      const similarMaterials = baseProduct.materials.some((m) =>
        p.materials.includes(m)
      );

      // Product is considered similar if:
      // - Name similarity > 40% AND same category, OR
      // - Same subcategory AND similar materials
      return (
        (nameSimilarity > 0.4 && sameCategory) ||
        (sameSubcategory && similarMaterials)
      );
    });

    if (similarProducts.length === 0) return null;

    // Calculate metrics
    const allProducts = [baseProduct, ...similarProducts];
    const lowestPrice = Math.min(...allProducts.map((p) => p.price));
    const highestStock = Math.max(...allProducts.map((p) => p.stock));
    const priceRange = {
      min: lowestPrice,
      max: Math.max(...allProducts.map((p) => p.price)),
    };

    const alternatives: SupplierProduct[] = similarProducts.map((product) => {
      const priceDiff = product.price - baseProduct.price;
      const priceDiffPercent = (priceDiff / baseProduct.price) * 100;

      return {
        product,
        priceDiff,
        priceDiffPercent,
        stockAdvantage: product.stock > baseProduct.stock,
        isLowestPrice: product.price === lowestPrice,
        isBestStock: product.stock === highestStock,
      };
    });

    // Sort by price difference (cheapest first)
    alternatives.sort((a, b) => a.product.price - b.product.price);

    return {
      baseProduct,
      alternatives,
      lowestPrice,
      highestStock,
      priceRange,
    };
  }, [productId]);

  return result;
}

// Simple name similarity using word matching
function calculateNameSimilarity(name1: string, name2: string): number {
  const words1 = name1.toLowerCase().split(/\s+/);
  const words2 = name2.toLowerCase().split(/\s+/);

  const commonWords = words1.filter((word) =>
    words2.some(
      (w) => w.includes(word) || word.includes(w) || levenshteinDistance(w, word) <= 2
    )
  );

  return commonWords.length / Math.max(words1.length, words2.length);
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

// Get all products grouped by supplier for a given category/subcategory
export function getSupplierProductsInCategory(
  categoryId: number,
  subcategory?: string
): Map<string, Product[]> {
  const supplierMap = new Map<string, Product[]>();

  PRODUCTS.forEach((product) => {
    if (product.category.id !== categoryId) return;
    if (subcategory && product.subcategory !== subcategory) return;

    const supplierId = product.supplier.id;
    if (!supplierMap.has(supplierId)) {
      supplierMap.set(supplierId, []);
    }
    supplierMap.get(supplierId)!.push(product);
  });

  return supplierMap;
}
