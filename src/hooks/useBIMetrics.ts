import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ColorInfo {
  name?: string;
  hex?: string;
  color_name?: string;
  color_hex?: string;
}

export interface ProductBIMetrics {
  totalProducts: number;
  totalActiveProducts: number;
  totalKits: number;
  averagePrice: number;
  productsByCategory: Array<{
    category: string;
    count: number;
  }>;
  productsBySubcategory: Array<{
    subcategory: string;
    count: number;
  }>;
  productsByColor: Array<{
    color: string;
    hex: string;
    count: number;
  }>;
  productsByMaterial: Array<{
    material: string;
    count: number;
  }>;
  productsBySupplier: Array<{
    supplier: string;
    count: number;
  }>;
  productsByStockStatus: Array<{
    status: string;
    count: number;
  }>;
  productsByGroup: Array<{
    groupName: string;
    count: number;
  }>;
  priceRanges: Array<{
    range: string;
    count: number;
  }>;
  recentProducts: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    category_name: string | null;
    created_at: string;
  }>;
  featuredCount: number;
  newArrivalCount: number;
  onSaleCount: number;
}

export function useBIMetrics() {
  return useQuery({
    queryKey: ["product-bi-metrics-promobrind"],
    queryFn: async (): Promise<ProductBIMetrics> => {
      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      
      // Fetch products from Promobrind and groups from local
      const [productsData, groupMembersResult, groupsResult] = await Promise.all([
        fetchPromobrindProducts({ limit: 1000 }),
        supabase.from("product_group_members").select("product_id, product_group_id"),
        supabase.from("product_groups").select("id, group_name"),
      ]);

      const products = productsData;
      const groupMembers = groupMembersResult.data || [];
      const groups = groupsResult.data || [];

      // Basic counts
      const totalProducts = products.length;
      const totalActiveProducts = products.filter((p) => p.is_active).length;
      const totalKits = 0; // Promobrind não tem is_kit
      const featuredCount = 0;
      const newArrivalCount = 0;
      const onSaleCount = 0;

      // Average price
      const totalPrice = products.reduce((sum, p) => sum + (p.base_price || 0), 0);
      const averagePrice = totalProducts > 0 ? totalPrice / totalProducts : 0;

      // Products by category
      const categoryMap = new Map<string, number>();
      products.forEach((p) => {
        const category = p.category_name || "Sem categoria";
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
      const productsByCategory = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Products by subcategory
      const subcategoryMap = new Map<string, number>();
      products.forEach((p) => {
        if (p.subcategory) {
          subcategoryMap.set(p.subcategory, (subcategoryMap.get(p.subcategory) || 0) + 1);
        }
      });
      const productsBySubcategory = Array.from(subcategoryMap.entries())
        .map(([subcategory, count]) => ({ subcategory, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Products by color
      const colorMap = new Map<string, { hex: string; count: number }>();
      products.forEach((p) => {
        if (p.colors && Array.isArray(p.colors)) {
          (p.colors as ColorInfo[]).forEach((color) => {
            const colorName = color.name || color.color_name || "Desconhecida";
            const colorHex = color.hex || color.color_hex || "#CCCCCC";
            const existing = colorMap.get(colorName) || { hex: colorHex, count: 0 };
            existing.count += 1;
            colorMap.set(colorName, existing);
          });
        }
      });
      const productsByColor = Array.from(colorMap.entries())
        .map(([color, data]) => ({ color, hex: data.hex, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // Products by material
      const materialMap = new Map<string, number>();
      products.forEach((p) => {
        if (p.materials && Array.isArray(p.materials)) {
          p.materials.forEach((material: string) => {
            materialMap.set(material, (materialMap.get(material) || 0) + 1);
          });
        }
      });
      const productsByMaterial = Array.from(materialMap.entries())
        .map(([material, count]) => ({ material, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Products by supplier
      const supplierMap = new Map<string, number>();
      products.forEach((p) => {
        const supplier = p.supplier_name || "Sem fornecedor";
        supplierMap.set(supplier, (supplierMap.get(supplier) || 0) + 1);
      });
      const productsBySupplier = Array.from(supplierMap.entries())
        .map(([supplier, count]) => ({ supplier, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Products by stock status
      const stockStatusMap = new Map<string, number>();
      products.forEach((p) => {
        const status = p.stock_status || "in-stock";
        stockStatusMap.set(status, (stockStatusMap.get(status) || 0) + 1);
      });
      const productsByStockStatus = Array.from(stockStatusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // Products by group
      const groupIdToName = new Map<string, string>();
      groups.forEach((g) => {
        groupIdToName.set(g.id, g.group_name);
      });

      const groupCountMap = new Map<string, number>();
      groupMembers.forEach((gm) => {
        const groupName = groupIdToName.get(gm.product_group_id) || "Desconhecido";
        groupCountMap.set(groupName, (groupCountMap.get(groupName) || 0) + 1);
      });
      const productsByGroup = Array.from(groupCountMap.entries())
        .map(([groupName, count]) => ({ groupName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Price ranges
      const priceRangesConfig = [
        { label: "R$ 0-10", min: 0, max: 10 },
        { label: "R$ 10-25", min: 10, max: 25 },
        { label: "R$ 25-50", min: 25, max: 50 },
        { label: "R$ 50-100", min: 50, max: 100 },
        { label: "R$ 100-200", min: 100, max: 200 },
        { label: "R$ 200+", min: 200, max: Infinity },
      ];

      const priceRanges = priceRangesConfig.map((range) => ({
        range: range.label,
        count: products.filter((p) => p.price >= range.min && p.price < range.max).length,
      }));

      // Recent products
      const recentProducts = [...products]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          category_name: p.category_name,
          created_at: p.created_at,
        }));

      return {
        totalProducts,
        totalActiveProducts,
        totalKits,
        averagePrice,
        productsByCategory,
        productsBySubcategory,
        productsByColor,
        productsByMaterial,
        productsBySupplier,
        productsByStockStatus,
        productsByGroup,
        priceRanges,
        recentProducts,
        featuredCount,
        newArrivalCount,
        onSaleCount,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
