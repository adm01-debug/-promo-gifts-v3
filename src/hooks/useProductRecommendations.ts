import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProductRecommendation {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: string[] | string | null;
  category_id: string | null; // Schema Promobrind não tem category_name
  score: number;
  reason: string;
}

interface ProductCount {
  sku: string | null;
  name: string;
  image: string | null;
  price: number;
  count: number;
}

interface ProductStat {
  sku: string | null;
  name: string;
  image: string | null;
  totalQuantity: number;
  totalValue: number;
  orderCount: number;
}

interface ProductInsight {
  totalViews: number;
  totalQuotes: number;
  totalOrders: number;
  conversionRate: number;
  averageQuantity: number;
  topSegments: Array<{
    segment: string;
    count: number;
  }>;
  recentActivity: Array<{
    type: 'view' | 'quote' | 'order';
    date: string;
    details: string;
  }>;
}

interface FrequentlyBoughtTogether {
  productId: string;
  productName: string;
  productSku: string;
  productImage: string | null;
  timesOrderedTogether: number;
  price: number;
}

// Hook para obter recomendações baseadas em histórico
export function useProductRecommendations(productId?: string, productSku?: string) {
  const { user } = useAuth();

  // Produtos frequentemente comprados juntos
  const frequentlyBoughtTogether = useQuery({
    queryKey: ['product-frequently-bought', productSku],
    queryFn: async (): Promise<FrequentlyBoughtTogether[]> => {
      if (!productSku) return [];

      // Buscar pedidos que contém este produto
      const { data: ordersWithProduct, error: ordersError } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('product_sku', productSku);

      if (ordersError || !ordersWithProduct?.length) return [];

      const orderIds = ordersWithProduct.map(o => o.order_id);

      // Buscar outros produtos nesses mesmos pedidos
      const { data: relatedItems, error: relatedError } = await supabase
        .from('order_items')
        .select('product_id, product_sku, product_name, product_image_url, unit_price')
        .in('order_id', orderIds)
        .neq('product_sku', productSku);

      if (relatedError || !relatedItems?.length) return [];

      // Contar frequência de cada produto
      const productCounts = relatedItems.reduce((acc, item) => {
        const key = item.product_sku || item.product_id;
        if (!key) return acc;
        
        if (!acc[key]) {
          acc[key] = {
            productId: item.product_id || '',
            productName: item.product_name,
            productSku: item.product_sku || '',
            productImage: item.product_image_url,
            timesOrderedTogether: 0,
            price: item.unit_price || 0
          };
        }
        acc[key].timesOrderedTogether++;
        return acc;
      }, {} as Record<string, FrequentlyBoughtTogether>);

      return Object.values(productCounts)
        .sort((a, b) => b.timesOrderedTogether - a.timesOrderedTogether)
        .slice(0, 5);
    },
    enabled: !!productSku,
    staleTime: 10 * 60 * 1000,
  });

  // Produtos mais vistos pelo vendedor (personalizado)
  const personalizedRecommendations = useQuery({
    queryKey: ['product-personalized', user?.id],
    queryFn: async (): Promise<ProductRecommendation[]> => {
      if (!user?.id) return [];

      // Buscar visualizações recentes do vendedor
      const { data: recentViews, error: viewsError } = await supabase
        .from('product_views')
        .select('product_id, product_sku, product_name')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (viewsError) return [];

      // Buscar categorias mais visualizadas
      const viewedSkus = recentViews?.map(v => v.product_sku).filter(Boolean) || [];
      
      // Buscar produtos do Promobrind para recomendações
      try {
        const { fetchPromobrindProducts, getProductPrice, getProductImageUrl } = await import('@/lib/external-db');
        const productsData = await fetchPromobrindProducts({ limit: 100 });
        
        if (viewedSkus.length === 0) {
          // Retornar primeiros produtos se não há histórico
          return productsData.slice(0, 6).map(p => {
            const imageUrl = getProductImageUrl(p);
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              price: getProductPrice(p),
              images: imageUrl ? [imageUrl] : p.images,
              category_id: p.category_id || p.main_category_id,
              score: 50,
              reason: 'Produto em destaque'
            };
          });
        }
        
        // Filtrar por categorias visualizadas (usando category_id)
        const viewedCategories = [...new Set(viewedSkus.map(sku => {
          const product = productsData.find(p => p.sku === sku);
          return product?.category_id || product?.main_category_id;
        }).filter(Boolean))];

        if (viewedCategories.length === 0) {
          // Retornar produtos aleatórios se não há categorias
          return productsData.slice(0, 6).map(p => {
            const imageUrl = getProductImageUrl(p);
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              price: getProductPrice(p),
              images: imageUrl ? [imageUrl] : p.images,
              category_id: p.category_id || p.main_category_id,
              score: 60,
              reason: 'Sugestão'
            };
          });
        }

        // Filtrar produtos das mesmas categorias (exceto os já vistos)
        const recommendations = productsData
          .filter(p => {
            const catId = p.category_id || p.main_category_id;
            return catId && viewedCategories.includes(catId) && !viewedSkus.includes(p.sku);
          })
          .slice(0, 6)
          .map(p => {
            const imageUrl = getProductImageUrl(p);
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              price: getProductPrice(p),
              images: imageUrl ? [imageUrl] : p.images,
              category_id: p.category_id || p.main_category_id,
              score: 80,
              reason: 'Baseado no seu histórico'
            };
          });

        return recommendations;
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Produtos em alta (mais cotados recentemente)
  const trendingProducts = useQuery({
    queryKey: ['product-trending'],
    queryFn: async (): Promise<ProductRecommendation[]> => {
      // Buscar produtos mais cotados nos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentQuoteItems, error } = await supabase
        .from('quote_items')
        .select('product_sku, product_name, product_image_url, unit_price')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error || !recentQuoteItems?.length) return [];

      // Contar frequência
      const productCounts = recentQuoteItems.reduce((acc, item) => {
        const key = item.product_sku || item.product_name;
        if (!acc[key]) {
          acc[key] = {
            sku: item.product_sku,
            name: item.product_name,
            image: item.product_image_url,
            price: item.unit_price,
            count: 0
          };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, ProductCount>);

      const sorted = Object.values(productCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Buscar dados completos dos produtos do Promobrind
      const skus = sorted.map((p) => p.sku).filter(Boolean) as string[];
      
      if (skus.length === 0) return [];

      try {
        const { fetchPromobrindProducts, getProductPrice, getProductImageUrl } = await import('@/lib/external-db');
        const productsData = await fetchPromobrindProducts({ limit: 500 });
        
        // Filtrar pelos SKUs encontrados nas cotações
        const matchedProducts = productsData.filter(p => skus.includes(p.sku));
        
        return matchedProducts.map(p => {
          const imageUrl = getProductImageUrl(p);
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: getProductPrice(p),
            images: imageUrl ? [imageUrl] : p.images,
            category_id: p.category_id || p.main_category_id,
            score: 90,
            reason: 'Em alta nas cotações'
          };
        });
      } catch (error) {
        console.error("Error fetching trending products:", error);
        return [];
      }
    },
    staleTime: 15 * 60 * 1000,
  });

  return {
    frequentlyBoughtTogether,
    personalizedRecommendations,
    trendingProducts,
    isLoading: frequentlyBoughtTogether.isLoading || 
               personalizedRecommendations.isLoading || 
               trendingProducts.isLoading,
  };
}

// Hook para insights do produto
export function useProductInsights(productId?: string, productSku?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['product-insights', productSku],
    queryFn: async (): Promise<ProductInsight> => {
      if (!productSku) {
        return {
          totalViews: 0,
          totalQuotes: 0,
          totalOrders: 0,
          conversionRate: 0,
          averageQuantity: 0,
          topSegments: [],
          recentActivity: []
        };
      }

      // Buscar visualizações
      const { count: viewsCount } = await supabase
        .from('product_views')
        .select('*', { count: 'exact', head: true })
        .eq('product_sku', productSku);

      // Buscar cotações
      const { data: quoteItems, count: quotesCount } = await supabase
        .from('quote_items')
        .select('quantity, quote_id', { count: 'exact' })
        .eq('product_sku', productSku);

      // Buscar pedidos
      const { data: orderItems, count: ordersCount } = await supabase
        .from('order_items')
        .select('quantity, order_id', { count: 'exact' })
        .eq('product_sku', productSku);

      // Calcular quantidade média
      const allQuantities = [
        ...(quoteItems || []).map(q => q.quantity),
        ...(orderItems || []).map(o => o.quantity)
      ];
      const averageQuantity = allQuantities.length > 0
        ? allQuantities.reduce((a, b) => a + b, 0) / allQuantities.length
        : 0;

      // Taxa de conversão (pedidos / cotações)
      const conversionRate = quotesCount && quotesCount > 0
        ? ((ordersCount || 0) / quotesCount) * 100
        : 0;

      // Top segmentos/nichos que compraram este produto
      const orderIds = (orderItems || []).map(o => o.order_id);
      let topSegments: ProductInsight['topSegments'] = [];
      
      if (orderIds.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('client_id')
          .in('id', orderIds);

        const clientIds = [...new Set((orders || []).map(o => o.client_id).filter(Boolean))];
        
        if (clientIds.length > 0) {
          const { selectCrm } = await import("@/lib/crm-db");
          const clients = await selectCrm<any>("companies", {
            select: "id, ramo_atividade",
            filters: { id: { in: clientIds } },
          });

          // Contar pedidos por segmento
          const clientSegmentMap: Record<string, string> = {};
          (clients || []).forEach((c: { id?: string; ramo_atividade?: string }) => {
            if (c.ramo_atividade) clientSegmentMap[c.id] = c.ramo_atividade;
          });

          const segmentCounts: Record<string, number> = {};
          (orders || []).forEach(order => {
            const segment = order.client_id ? clientSegmentMap[order.client_id] : null;
            if (segment) {
              segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
            }
          });

          topSegments = Object.entries(segmentCounts)
            .map(([segment, count]) => ({ segment, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        }
      }

      // Atividade recente
      const recentActivity: ProductInsight['recentActivity'] = [];

      // Visualizações recentes
      const { data: recentViews } = await supabase
        .from('product_views')
        .select('created_at, seller_id')
        .eq('product_sku', productSku)
        .order('created_at', { ascending: false })
        .limit(3);

      (recentViews || []).forEach(v => {
        recentActivity.push({
          type: 'view',
          date: v.created_at,
          details: 'Visualizado por um vendedor'
        });
      });

      // Cotações recentes
      const { data: recentQuotes } = await supabase
        .from('quote_items')
        .select('created_at, quantity')
        .eq('product_sku', productSku)
        .order('created_at', { ascending: false })
        .limit(3);

      (recentQuotes || []).forEach(q => {
        recentActivity.push({
          type: 'quote',
          date: q.created_at,
          details: `Adicionado em cotação (${q.quantity} un.)`
        });
      });

      // Ordenar por data
      recentActivity.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return {
        totalViews: viewsCount || 0,
        totalQuotes: quotesCount || 0,
        totalOrders: ordersCount || 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
        averageQuantity: Math.round(averageQuantity),
        topSegments,
        recentActivity: recentActivity.slice(0, 5)
      };
    },
    enabled: !!productSku,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook para produtos mais vendidos por cliente
export function useClientTopProducts(clientId?: string) {
  return useQuery({
    queryKey: ['client-top-products', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // Buscar pedidos do cliente
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('client_id', clientId);

      if (!orders?.length) return [];

      const orderIds = orders.map(o => o.id);

      // Buscar itens desses pedidos
      const { data: items } = await supabase
        .from('order_items')
        .select('product_sku, product_name, product_image_url, quantity, unit_price')
        .in('order_id', orderIds);

      if (!items?.length) return [];

      // Agrupar por produto
      const productStats = items.reduce((acc, item) => {
        const key = item.product_sku || item.product_name;
        if (!acc[key]) {
          acc[key] = {
            sku: item.product_sku,
            name: item.product_name,
            image: item.product_image_url,
            totalQuantity: 0,
            totalValue: 0,
            orderCount: 0
          };
        }
        acc[key].totalQuantity += item.quantity;
        acc[key].totalValue += (item.quantity * item.unit_price);
        acc[key].orderCount++;
        return acc;
      }, {} as Record<string, ProductStat>);

      return Object.values(productStats)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
  });
}
