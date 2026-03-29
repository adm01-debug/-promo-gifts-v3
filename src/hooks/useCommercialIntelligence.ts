/**
 * useCommercialIntelligence — Hook agregador para o módulo de Inteligência Comercial
 * Consolida dados de orders, quotes, product_views e external-db
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface IntelligenceKPI {
  totalQuotes: number;
  totalOrders: number;
  conversionRate: number;
  totalRevenue: number;
  averageTicket: number;
  quotesThisMonth: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
}

export interface TrendingProduct {
  productId: string;
  productSku: string | null;
  productName: string;
  productImage: string | null;
  orderCount: number;
  totalQuantity: number;
  totalRevenue: number;
  quoteCount: number;
  conversionRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SegmentData {
  segment: string;
  orderCount: number;
  revenue: number;
  averageTicket: number;
}

export interface OpportunityProduct {
  productId: string;
  productSku: string | null;
  productName: string;
  productImage: string | null;
  quoteCount: number;
  orderCount: number;
  conversionRate: number;
  opportunityScore: number;
  reason: string;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
  quotes: number;
}

export function useCommercialKPIs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commercial-intelligence-kpis', user?.id],
    queryFn: async (): Promise<IntelligenceKPI> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [quotesRes, ordersRes, quotesMonthRes, ordersMonthRes] = await Promise.all([
        supabase.from('quotes').select('id, total, status, created_at'),
        supabase.from('orders').select('id, total, status, created_at'),
        supabase.from('quotes').select('id, total').gte('created_at', startOfMonth),
        supabase.from('orders').select('id, total').gte('created_at', startOfMonth),
      ]);

      const quotes = quotesRes.data || [];
      const orders = ordersRes.data || [];
      const quotesMonth = quotesMonthRes.data || [];
      const ordersMonth = ordersMonthRes.data || [];

      const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
      const totalOrders = orders.length;
      const totalQuotes = quotes.length;
      const conversionRate = totalQuotes > 0 ? Math.round((totalOrders / totalQuotes) * 100) : 0;
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        totalQuotes,
        totalOrders,
        conversionRate,
        totalRevenue,
        averageTicket,
        quotesThisMonth: quotesMonth.length,
        ordersThisMonth: ordersMonth.length,
        revenueThisMonth: ordersMonth.reduce((sum, o) => sum + (o.total ?? 0), 0),
      };
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });
}

export function useTrendingProducts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commercial-trending-products', user?.id],
    queryFn: async (): Promise<TrendingProduct[]> => {
      // Get order items grouped by product
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, product_sku, product_name, product_image_url, quantity, unit_price, order_id');

      const { data: quoteItems } = await supabase
        .from('quote_items')
        .select('product_id, product_sku, product_name, product_image_url, quantity, unit_price');

      if (!orderItems?.length) return [];

      // Aggregate by product
      const productMap = new Map<string, TrendingProduct>();

      orderItems.forEach(item => {
        const key = item.product_sku || item.product_id || item.product_name;
        if (!key) return;
        const existing = productMap.get(key) || {
          productId: item.product_id || '',
          productSku: item.product_sku,
          productName: item.product_name || 'Produto',
          productImage: item.product_image_url,
          orderCount: 0,
          totalQuantity: 0,
          totalRevenue: 0,
          quoteCount: 0,
          conversionRate: 0,
          trend: 'stable' as const,
        };
        existing.orderCount += 1;
        existing.totalQuantity += (item.quantity ?? 0);
        existing.totalRevenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
        productMap.set(key, existing);
      });

      // Count quotes per product
      quoteItems?.forEach(item => {
        const key = item.product_sku || item.product_id || item.product_name;
        if (!key || !productMap.has(key)) return;
        const existing = productMap.get(key)!;
        existing.quoteCount += 1;
        productMap.set(key, existing);
      });

      // Calculate conversion and sort
      const products = Array.from(productMap.values()).map(p => ({
        ...p,
        conversionRate: p.quoteCount > 0 ? Math.round((p.orderCount / p.quoteCount) * 100) : 100,
        trend: (p.totalRevenue > 1000 ? 'up' : p.totalRevenue > 200 ? 'stable' : 'down') as 'up' | 'down' | 'stable',
      }));

      return products.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });
}

export function useSegmentAnalysis() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commercial-segments', user?.id],
    queryFn: async (): Promise<SegmentData[]> => {
      const { data: orders } = await supabase
        .from('orders')
        .select('client_company, total');

      if (!orders?.length) return [];

      const segmentMap = new Map<string, { count: number; revenue: number }>();
      orders.forEach(order => {
        const segment = order.client_company || 'Não identificado';
        const existing = segmentMap.get(segment) || { count: 0, revenue: 0 };
        existing.count += 1;
        existing.revenue += (order.total ?? 0);
        segmentMap.set(segment, existing);
      });

      return Array.from(segmentMap.entries())
        .map(([segment, data]) => ({
          segment,
          orderCount: data.count,
          revenue: data.revenue,
          averageTicket: data.count > 0 ? data.revenue / data.count : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });
}

export function useOpportunities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commercial-opportunities', user?.id],
    queryFn: async (): Promise<OpportunityProduct[]> => {
      const [{ data: quoteItems }, { data: orderItems }] = await Promise.all([
        supabase.from('quote_items').select('product_id, product_sku, product_name, product_image_url, quantity'),
        supabase.from('order_items').select('product_id, product_sku, product_name'),
      ]);

      if (!quoteItems?.length) return [];

      // Count quotes per product
      const quoteMap = new Map<string, { count: number; name: string; sku: string | null; image: string | null; id: string }>();
      quoteItems.forEach(item => {
        const key = item.product_sku || item.product_id || '';
        if (!key) return;
        const existing = quoteMap.get(key) || { count: 0, name: item.product_name || '', sku: item.product_sku, image: item.product_image_url, id: item.product_id || '' };
        existing.count += 1;
        quoteMap.set(key, existing);
      });

      // Count orders per product
      const orderCountMap = new Map<string, number>();
      orderItems?.forEach(item => {
        const key = item.product_sku || item.product_id || '';
        if (!key) return;
        orderCountMap.set(key, (orderCountMap.get(key) || 0) + 1);
      });

      // Find opportunities: high quotes, low orders
      const opportunities: OpportunityProduct[] = [];
      quoteMap.forEach((data, key) => {
        const orderCount = orderCountMap.get(key) || 0;
        const conversionRate = data.count > 0 ? Math.round((orderCount / data.count) * 100) : 0;
        const opportunityScore = Math.max(0, 100 - conversionRate) * Math.min(data.count / 3, 1);

        if (data.count >= 2 && conversionRate < 60) {
          opportunities.push({
            productId: data.id,
            productSku: data.sku,
            productName: data.name,
            productImage: data.image,
            quoteCount: data.count,
            orderCount,
            conversionRate,
            opportunityScore,
            reason: conversionRate === 0
              ? 'Cotado mas nunca vendido'
              : conversionRate < 20
                ? 'Conversão muito baixa'
                : 'Conversão abaixo da média',
          });
        }
      });

      return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });
}

export function useRevenueTrend(days = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commercial-revenue-trend', user?.id, days],
    queryFn: async (): Promise<RevenuePoint[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [{ data: orders }, { data: quotes }] = await Promise.all([
        supabase.from('orders').select('total, created_at').gte('created_at', since.toISOString()).order('created_at'),
        supabase.from('quotes').select('total, created_at').gte('created_at', since.toISOString()).order('created_at'),
      ]);

      // Group by date
      const dateMap = new Map<string, RevenuePoint>();
      
      // Initialize all dates
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split('T')[0];
        dateMap.set(key, { date: key, revenue: 0, orders: 0, quotes: 0 });
      }

      orders?.forEach(o => {
        const key = new Date(o.created_at).toISOString().split('T')[0];
        const existing = dateMap.get(key);
        if (existing) {
          existing.revenue += (o.total ?? 0);
          existing.orders += 1;
        }
      });

      quotes?.forEach(q => {
        const key = new Date(q.created_at).toISOString().split('T')[0];
        const existing = dateMap.get(key);
        if (existing) {
          existing.quotes += 1;
        }
      });

      return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });
}

export function useMostViewedProducts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commercial-most-viewed', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_views')
        .select('product_id, product_sku, product_name');

      if (!data?.length) return [];

      const viewMap = new Map<string, { name: string; sku: string | null; count: number }>();
      data.forEach(v => {
        const key = v.product_sku || v.product_id || '';
        if (!key) return;
        const existing = viewMap.get(key) || { name: v.product_name || '', sku: v.product_sku, count: 0 };
        existing.count += 1;
        viewMap.set(key, existing);
      });

      return Array.from(viewMap.entries())
        .map(([id, d]) => ({ productId: id, productSku: d.sku, productName: d.name, viewCount: d.count }))
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });
}
