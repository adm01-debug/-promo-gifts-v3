import { useMemo } from "react";
import { Product } from "@/hooks/useProducts";
import { useProductsContext } from "@/contexts/ProductsContext";

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
  const { products } = useProductsContext();

  const result = useMemo((): SupplierComparisonResult | null => {
    if (!productId || products.length === 0) return null;

    const baseProduct = products.find((p) => p.id === productId);
    if (!baseProduct) return null;

    // Find similar products from different suppliers
    const similarProducts = products.filter((p) => {
      if (p.id === productId) return false;
      if (p.supplier.id === baseProduct.supplier.id) return false;

      const nameSimilarity = calculateNameSimilarity(baseProduct.name, p.name);
      const sameCategory = p.category.id === baseProduct.category.id;

      return nameSimilarity > 0.4 && sameCategory;
    });

    if (similarProducts.length === 0) return null;

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

    alternatives.sort((a, b) => a.product.price - b.product.price);

    return {
      baseProduct,
      alternatives,
      lowestPrice,
      highestStock,
      priceRange,
    };
  }, [productId, products]);

  return result;
}

function calculateNameSimilarity(name1: string, name2: string): number {
  const words1 = name1.toLowerCase().split(/\s+/);
  const words2 = name2.toLowerCase().split(/\s+/);

  const commonWords = words1.filter((word) =>
    words2.some((w) => w.includes(word) || word.includes(w))
  );

  return commonWords.length / Math.max(words1.length, words2.length);
}

export function getSupplierProductsInCategory(
  products: Product[],
  categoryId: number
): Map<string, Product[]> {
  const supplierMap = new Map<string, Product[]>();

  products.forEach((product) => {
    if (product.category.id !== categoryId) return;

    const supplierId = product.supplier.id;
    if (!supplierMap.has(supplierId)) {
      supplierMap.set(supplierId, []);
    }
    supplierMap.get(supplierId)!.push(product);
  });

  return supplierMap;
}
