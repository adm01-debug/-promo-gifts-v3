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
      const totalActiveProducts = products.filter((p) => p.is_active || p.active).length;
      const totalKits = 0; // Promobrind não tem is_kit
      const featuredCount = 0;
      const newArrivalCount = 0;
      const onSaleCount = 0;

      // Average price (usando getProductPrice)
      const { getProductPrice } = await import('@/lib/external-db');
      const totalPrice = products.reduce((sum, p) => sum + getProductPrice(p), 0);
      const averagePrice = totalProducts > 0 ? totalPrice / totalProducts : 0;

      // Products by category (usando category_id que existe no schema)
      const categoryMap = new Map<string, number>();
      products.forEach((p) => {
        const category = p.category_id || p.main_category_id || "Sem categoria";
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
      const productsByCategory = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Products by subcategory (schema não tem - vazio)
      const productsBySubcategory: { subcategory: string; count: number }[] = [];

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

      // Products by material (materials é string no schema, não array)
      const materialMap = new Map<string, number>();
      products.forEach((p) => {
        if (p.materials) {
          // materials é uma string no schema Promobrind
          const material = typeof p.materials === 'string' ? p.materials : 'Desconhecido';
          materialMap.set(material, (materialMap.get(material) || 0) + 1);
        }
      });
      const productsByMaterial = Array.from(materialMap.entries())
        .map(([material, count]) => ({ material, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Products by supplier (schema não tem supplier_name, temos supplier_reference)
      const supplierMap = new Map<string, number>();
      products.forEach((p) => {
        const supplier = p.supplier_reference || "Sem fornecedor";
        supplierMap.set(supplier, (supplierMap.get(supplier) || 0) + 1);
      });
      const productsBySupplier = Array.from(supplierMap.entries())
        .map(([supplier, count]) => ({ supplier, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Products by stock status (usando stock_quantity)
      const { getProductStock } = await import('@/lib/external-db');
      const stockStatusMap = new Map<string, number>();
      products.forEach((p) => {
        const stock = getProductStock(p);
        const status = stock > 0 ? "in-stock" : "out-of-stock";
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
        count: products.filter((p) => {
          const price = getProductPrice(p);
          return price >= range.min && price < range.max;
        }).length,
      }));

      // Recent products (schema não tem created_at confiável)
      const recentProducts = products
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: getProductPrice(p),
          category_name: p.category_id || p.main_category_id || null,
          created_at: '',
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
