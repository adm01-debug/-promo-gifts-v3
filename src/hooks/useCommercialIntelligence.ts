/**
 * useCommercialIntelligence — Hook agregador para o módulo de Inteligência Comercial
 * Todos os hooks aceitam `days`, `categoryId` e `supplierId` para filtragem
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentOrgId } from '@/hooks/useCurrentOrgId';

function getSinceDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

interface FilterParams {
  days?: number;
  categoryId?: string | null;
  supplierId?: string | null;
  productId?: string | null;
}

/**
 * Resolve product IDs matching category/supplier/product from external DB.
 * Returns null if no filter is active (meaning "all products").
 * When productId is provided, it takes priority and returns just that single ID.
 */
function useFilteredProductIds(categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  return useQuery({
    queryKey: ['intelligence-product-ids', categoryId, supplierId, productId],
    queryFn: async (): Promise<Set<string> | null> => {
      // If specific product selected, return just that ID
      if (productId) return new Set([productId]);

      if (!categoryId && !supplierId) return null;

      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      const filters: Record<string, unknown> = {};
      if (categoryId) filters.category_id = categoryId;
      if (supplierId) filters.supplier_id = supplierId;

      const products = await fetchPromobrindProducts({ limit: 5000, filters });
      return new Set(products.map(p => p.id));
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!(categoryId || supplierId || productId),
  });
}

// Filters arrays of items that have product_id, using the resolved set
function filterByProductIds<T extends { product_id?: string | null }>(
  items: T[],
  productIds: Set<string> | null | undefined,
): T[] {
  if (!productIds) return items; // no filter active
  return items.filter(item => item.product_id && productIds.has(item.product_id));
}

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

export function useCommercialKPIs(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth();
  const orgId = useCurrentOrgId();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-intelligence-kpis', user?.id, orgId, days, categoryId, supplierId, productIds ? Array.from(productIds).length : null],
    queryFn: async (): Promise<IntelligenceKPI> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // When filtering by category/supplier, we need quote_items/order_items to match product IDs
      if (hasFilter && productIds) {
        const productIdArray = Array.from(productIds);
        if (productIdArray.length === 0) {
          return { totalQuotes: 0, totalOrders: 0, conversionRate: 0, totalRevenue: 0, averageTicket: 0, quotesThisMonth: 0, ordersThisMonth: 0, revenueThisMonth: 0 };
        }

        // Get quote_items and order_items filtered by product + date
        const [{ data: quoteItems }, { data: orderItems }, { data: orderItemsMonth }, { data: quoteItemsMonth }] = await Promise.all([
          supabase.from('quote_items').select('quote_id, product_id').gte('created_at', since).in('product_id', productIdArray.slice(0, 200)),
          supabase.from('order_items').select('order_id, product_id, quantity, unit_price').gte('created_at', since).in('product_id', productIdArray.slice(0, 200)),
          supabase.from('order_items').select('order_id, product_id, quantity, unit_price').gte('created_at', startOfMonth).in('product_id', productIdArray.slice(0, 200)),
          supabase.from('quote_items').select('quote_id, product_id').gte('created_at', startOfMonth).in('product_id', productIdArray.slice(0, 200)),
        ]);

        const uniqueQuotes = new Set((quoteItems || []).map(qi => qi.quote_id));
        const uniqueOrders = new Set((orderItems || []).map(oi => oi.order_id));
        const uniqueOrdersMonth = new Set((orderItemsMonth || []).map(oi => oi.order_id));
        const uniqueQuotesMonth = new Set((quoteItemsMonth || []).map(qi => qi.quote_id));

        const totalRevenue = (orderItems || []).reduce((s, i) => s + (i.quantity ?? 0) * (i.unit_price ?? 0), 0);
        const revenueMonth = (orderItemsMonth || []).reduce((s, i) => s + (i.quantity ?? 0) * (i.unit_price ?? 0), 0);
        const totalOrders = uniqueOrders.size;
        const totalQuotes = uniqueQuotes.size;

        return {
          totalQuotes,
          totalOrders,
          conversionRate: totalQuotes > 0 ? Math.round((totalOrders / totalQuotes) * 100) : 0,
          totalRevenue,
          averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          quotesThisMonth: uniqueQuotesMonth.size,
          ordersThisMonth: uniqueOrdersMonth.size,
          revenueThisMonth: revenueMonth,
        };
      }

      // Defense-in-depth: filter by org even though RLS enforces it
      let quotesQuery1 = supabase.from('quotes').select('id, total, status, created_at').gte('created_at', since);
      let ordersQuery1 = supabase.from('orders').select('id, total, status, created_at').gte('created_at', since);
      let quotesQuery2 = supabase.from('quotes').select('id, total').gte('created_at', startOfMonth);
      let ordersQuery2 = supabase.from('orders').select('id, total').gte('created_at', startOfMonth);
      if (orgId) {
        quotesQuery1 = quotesQuery1.eq('organization_id', orgId);
        ordersQuery1 = ordersQuery1.eq('organization_id', orgId);
        quotesQuery2 = quotesQuery2.eq('organization_id', orgId);
        ordersQuery2 = ordersQuery2.eq('organization_id', orgId);
      }
      const [quotesRes, ordersRes, quotesMonthRes, ordersMonthRes] = await Promise.all([
        quotesQuery1, ordersQuery1, quotesQuery2, ordersQuery2,
      ]);

      const quotes = quotesRes.data || [];
      const orders = ordersRes.data || [];
      const quotesMonth = quotesMonthRes.data || [];
      const ordersMonth = ordersMonthRes.data || [];

      const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
      const totalOrders = orders.length;
      const totalQuotes = quotes.length;

      return {
        totalQuotes,
        totalOrders,
        conversionRate: totalQuotes > 0 ? Math.round((totalOrders / totalQuotes) * 100) : 0,
        totalRevenue,
        averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        quotesThisMonth: quotesMonth.length,
        ordersThisMonth: ordersMonth.length,
        revenueThisMonth: ordersMonth.reduce((sum, o) => sum + (o.total ?? 0), 0),
      };
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

export function useTrendingProducts(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null, limit = 10, searchTerm?: string | null) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-trending-products', user?.id, days, categoryId, supplierId, productId, limit, searchTerm],
    queryFn: async (): Promise<TrendingProduct[]> => {
      const productIdArray = productIds ? Array.from(productIds).slice(0, 200) : undefined;

      const [{ data: orderItems }, { data: quoteItems }] = await Promise.all([
        productIdArray
          ? supabase.from('order_items').select('product_id, product_sku, product_name, product_image_url, quantity, unit_price, order_id, created_at').gte('created_at', since).in('product_id', productIdArray)
          : supabase.from('order_items').select('product_id, product_sku, product_name, product_image_url, quantity, unit_price, order_id, created_at').gte('created_at', since),
        productIdArray
          ? supabase.from('quote_items').select('product_id, product_sku, product_name, product_image_url, quantity, unit_price, created_at').gte('created_at', since).in('product_id', productIdArray)
          : supabase.from('quote_items').select('product_id, product_sku, product_name, product_image_url, quantity, unit_price, created_at').gte('created_at', since),
      ]);

      if (!orderItems?.length) return [];

      const productMap = new Map<string, TrendingProduct>();

      orderItems.forEach(item => {
        const key = item.product_sku || item.product_id || item.product_name;
        if (!key) return;
        // Client-side search filter by product name
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const nameMatch = (item.product_name || '').toLowerCase().includes(q);
          const skuMatch = (item.product_sku || '').toLowerCase().includes(q);
          if (!nameMatch && !skuMatch) return;
        }
        const existing = productMap.get(key) || {
          productId: item.product_id || '', productSku: item.product_sku,
          productName: item.product_name || 'Produto', productImage: item.product_image_url,
          orderCount: 0, totalQuantity: 0, totalRevenue: 0, quoteCount: 0, conversionRate: 0, trend: 'stable' as const,
        };
        existing.orderCount += 1;
        existing.totalQuantity += (item.quantity ?? 0);
        existing.totalRevenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
        productMap.set(key, existing);
      });

      quoteItems?.forEach(item => {
        const key = item.product_sku || item.product_id || item.product_name;
        if (!key || !productMap.has(key)) return;
        productMap.get(key)!.quoteCount += 1;
      });

      return Array.from(productMap.values())
        .map(p => ({
          ...p,
          conversionRate: p.quoteCount > 0 ? Math.round((p.orderCount / p.quoteCount) * 100) : 100,
          trend: (p.totalRevenue > 1000 ? 'up' : p.totalRevenue > 200 ? 'stable' : 'down') as 'up' | 'down' | 'stable',
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

export function useSegmentAnalysis(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-segments', user?.id, days, categoryId, supplierId],
    queryFn: async (): Promise<SegmentData[]> => {
      if (hasFilter && productIds) {
        const productIdArray = Array.from(productIds).slice(0, 200);
        if (!productIdArray.length) return [];

        // Get order IDs that contain filtered products
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('order_id')
          .gte('created_at', since)
          .in('product_id', productIdArray);

        const orderIds = [...new Set((orderItems || []).map(oi => oi.order_id).filter(Boolean))] as string[];
        if (!orderIds.length) return [];

        const { data: orders } = await supabase
          .from('orders')
          .select('id, client_company, total')
          .in('id', orderIds.slice(0, 200));

        return aggregateSegments(orders || []);
      }

      const { data: orders } = await supabase
        .from('orders')
        .select('client_company, total')
        .gte('created_at', since);

      return aggregateSegments(orders || []);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

function aggregateSegments(orders: Array<{ client_company?: string | null; total?: number | null }>): SegmentData[] {
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
      segment, orderCount: data.count, revenue: data.revenue,
      averageTicket: data.count > 0 ? data.revenue / data.count : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

export function useOpportunities(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-opportunities', user?.id, days, categoryId, supplierId],
    queryFn: async (): Promise<OpportunityProduct[]> => {
      const productIdArray = productIds ? Array.from(productIds).slice(0, 200) : undefined;

      const [{ data: quoteItems }, { data: orderItems }] = await Promise.all([
        productIdArray
          ? supabase.from('quote_items').select('product_id, product_sku, product_name, product_image_url, quantity, created_at').gte('created_at', since).in('product_id', productIdArray)
          : supabase.from('quote_items').select('product_id, product_sku, product_name, product_image_url, quantity, created_at').gte('created_at', since),
        productIdArray
          ? supabase.from('order_items').select('product_id, product_sku, product_name, created_at').gte('created_at', since).in('product_id', productIdArray)
          : supabase.from('order_items').select('product_id, product_sku, product_name, created_at').gte('created_at', since),
      ]);

      if (!quoteItems?.length) return [];

      const quoteMap = new Map<string, { count: number; name: string; sku: string | null; image: string | null; id: string }>();
      quoteItems.forEach(item => {
        const key = item.product_sku || item.product_id || '';
        if (!key) return;
        const existing = quoteMap.get(key) || { count: 0, name: item.product_name || '', sku: item.product_sku, image: item.product_image_url, id: item.product_id || '' };
        existing.count += 1;
        quoteMap.set(key, existing);
      });

      const orderCountMap = new Map<string, number>();
      orderItems?.forEach(item => {
        const key = item.product_sku || item.product_id || '';
        if (!key) return;
        orderCountMap.set(key, (orderCountMap.get(key) || 0) + 1);
      });

      const opportunities: OpportunityProduct[] = [];
      quoteMap.forEach((data, key) => {
        const orderCount = orderCountMap.get(key) || 0;
        const conversionRate = data.count > 0 ? Math.round((orderCount / data.count) * 100) : 0;
        const opportunityScore = Math.max(0, 100 - conversionRate) * Math.min(data.count / 3, 1);

        if (data.count >= 2 && conversionRate < 60) {
          opportunities.push({
            productId: data.id, productSku: data.sku, productName: data.name,
            productImage: data.image, quoteCount: data.count, orderCount,
            conversionRate, opportunityScore,
            reason: conversionRate === 0 ? 'Cotado mas nunca vendido'
              : conversionRate < 20 ? 'Conversão muito baixa' : 'Conversão abaixo da média',
          });
        }
      });

      return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

export function useRevenueTrend(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth();
  const orgId = useCurrentOrgId();
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-revenue-trend', user?.id, orgId, days, categoryId, supplierId],
    queryFn: async (): Promise<RevenuePoint[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString();

      let orderData: Array<{ quantity?: number | null; unit_price?: number | null; created_at: string }> = [];
      let quoteData: Array<{ created_at: string }> = [];

      if (hasFilter && productIds) {
        const productIdArray = Array.from(productIds).slice(0, 200);
        if (!productIdArray.length) {
          // Return empty chart
          const dateMap = new Map<string, RevenuePoint>();
          for (let i = 0; i < days; i++) {
            const d = new Date(since);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            dateMap.set(key, { date: key, revenue: 0, orders: 0, quotes: 0 });
          }
          return Array.from(dateMap.values());
        }

        const [{ data: oi }, { data: qi }] = await Promise.all([
          supabase.from('order_items').select('quantity, unit_price, created_at').gte('created_at', sinceStr).in('product_id', productIdArray),
          supabase.from('quote_items').select('created_at').gte('created_at', sinceStr).in('product_id', productIdArray),
        ]);
        orderData = oi || [];
        quoteData = qi || [];
      } else {
        let ordQ = supabase.from('orders').select('total, created_at').gte('created_at', sinceStr).order('created_at');
        let quoQ = supabase.from('quotes').select('total, created_at').gte('created_at', sinceStr).order('created_at');
        if (orgId) {
          ordQ = ordQ.eq('organization_id', orgId);
          quoQ = quoQ.eq('organization_id', orgId);
        }
        const [{ data: orders }, { data: quotes }] = await Promise.all([ordQ, quoQ]);

        // Convert order-level data to same shape
        orderData = (orders || []).map(o => ({ quantity: 1, unit_price: o.total, created_at: o.created_at }));
        quoteData = quotes || [];
      }

      const dateMap = new Map<string, RevenuePoint>();
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split('T')[0];
        dateMap.set(key, { date: key, revenue: 0, orders: 0, quotes: 0 });
      }

      orderData.forEach(o => {
        const key = new Date(o.created_at).toISOString().split('T')[0];
        const existing = dateMap.get(key);
        if (existing) {
          existing.revenue += (o.quantity ?? 1) * (o.unit_price ?? 0);
          existing.orders += 1;
        }
      });

      quoteData.forEach(q => {
        const key = new Date(q.created_at).toISOString().split('T')[0];
        const existing = dateMap.get(key);
        if (existing) existing.quotes += 1;
      });

      return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

export function useTopClients(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-top-clients', user?.id, days, categoryId, supplierId],
    queryFn: async () => {
      if (hasFilter && productIds) {
        const productIdArray = Array.from(productIds).slice(0, 200);
        if (!productIdArray.length) return [];

        const { data: orderItems } = await supabase
          .from('order_items')
          .select('order_id, quantity, unit_price')
          .gte('created_at', since)
          .in('product_id', productIdArray);

        const orderIds = [...new Set((orderItems || []).map(oi => oi.order_id).filter(Boolean))] as string[];
        if (!orderIds.length) return [];

        const { data: orders } = await supabase
          .from('orders')
          .select('id, client_name, client_company, total')
          .in('id', orderIds.slice(0, 200));

        return aggregateClients(orders || []);
      }

      const { data: orders } = await supabase
        .from('orders')
        .select('client_name, client_company, total')
        .gte('created_at', since);

      return aggregateClients(orders || []);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

function aggregateClients(orders: Array<{ client_name?: string | null; client_company?: string | null; total?: number | null }>) {
  const clientMap = new Map<string, { company: string | null; orderCount: number; revenue: number }>();
  orders.forEach(o => {
    const name = o.client_name || o.client_company || 'Não identificado';
    const existing = clientMap.get(name) || { company: o.client_company || null, orderCount: 0, revenue: 0 };
    existing.orderCount += 1;
    existing.revenue += (o.total ?? 0);
    clientMap.set(name, existing);
  });

  return Array.from(clientMap.entries())
    .map(([name, data]) => ({
      clientName: name,
      company: data.company,
      orderCount: data.orderCount,
      revenue: data.revenue,
      averageTicket: data.orderCount > 0 ? data.revenue / data.orderCount : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

export interface CategoryRankingItem {
  categoryId: string;
  categoryName: string;
  internalRevenue: number;
  internalQty: number;
  internalOrders: number;
  marketDepleted: number;
  totalScore: number;
}

export function useCategoryRanking(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-category-ranking', user?.id, days, categoryId, supplierId, productId],
    queryFn: async (): Promise<CategoryRankingItem[]> => {
      const productIdArray = productIds ? Array.from(productIds).slice(0, 200) : undefined;

      // 1) Internal sales from order_items
      const { data: orderItems } = productIdArray
        ? await supabase.from('order_items').select('product_id, quantity, unit_price').gte('created_at', since).in('product_id', productIdArray)
        : await supabase.from('order_items').select('product_id, quantity, unit_price').gte('created_at', since);

      // 2) Fetch products from external DB to resolve categories
      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      const products = await fetchPromobrindProducts({ limit: 5000 });
      const productCategoryMap = new Map<string, { catId: string; catName: string }>();
      products.forEach(p => {
        const catId = p.category_id || p.main_category_id || '';
        const catName = p.category_name || catId || 'Sem categoria';
        if (catId) productCategoryMap.set(p.id, { catId, catName });
      });

      // 3) Aggregate internal sales by category
      const categoryMap = new Map<string, CategoryRankingItem>();
      (orderItems || []).forEach(item => {
        const cat = productCategoryMap.get(item.product_id || '');
        if (!cat) return;
        const existing = categoryMap.get(cat.catId) || {
          categoryId: cat.catId, categoryName: cat.catName,
          internalRevenue: 0, internalQty: 0, internalOrders: 0,
          marketDepleted: 0, totalScore: 0,
        };
        existing.internalRevenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
        existing.internalQty += (item.quantity ?? 0);
        existing.internalOrders += 1;
        categoryMap.set(cat.catId, existing);
      });

      // 4) Market data: aggregate stock depletion by category from snapshots
      try {
        const { invokeExternalDb } = await import('@/lib/external-db');
        const sinceDate = since.split('T')[0];
        const result = await invokeExternalDb({
          table: 'stock_daily_summary',
          operation: 'select',
          select: 'product_id,units_depleted',
          filters: { 'summary_date': `gte.${sinceDate}` },
          limit: 5000,
        });
        const snapshots = result?.records || [];
        (snapshots || []).forEach((snap: Record<string, unknown>) => {
          const cat = productCategoryMap.get(snap.product_id);
          if (!cat) return;
          const existing = categoryMap.get(cat.catId) || {
            categoryId: cat.catId, categoryName: cat.catName,
            internalRevenue: 0, internalQty: 0, internalOrders: 0,
            marketDepleted: 0, totalScore: 0,
          };
          existing.marketDepleted += (snap.units_depleted ?? 0);
          categoryMap.set(cat.catId, existing);
        });
      } catch (e) {
        console.warn('Market data unavailable for category ranking:', e);
      }

      // 5) Score = internal revenue weight + market depletion weight
      const items = Array.from(categoryMap.values());
      const maxRevenue = Math.max(1, ...items.map(i => i.internalRevenue));
      const maxDepleted = Math.max(1, ...items.map(i => i.marketDepleted));
      items.forEach(i => {
        i.totalScore = (i.internalRevenue / maxRevenue) * 60 + (i.marketDepleted / maxDepleted) * 40;
      });

      return items.sort((a, b) => b.totalScore - a.totalScore).slice(0, 15);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}

export function useSupplierSales(days = 30, categoryId?: string | null, supplierId?: string | null, productId?: string | null) {
  const { user } = useAuth();
  const since = getSinceDate(days);
  const { data: productIds } = useFilteredProductIds(categoryId, supplierId, productId);
  const hasFilter = !!(categoryId || supplierId || productId);

  return useQuery({
    queryKey: ['commercial-supplier-sales', user?.id, days, categoryId, supplierId],
    queryFn: async () => {
      const productIdArray = productIds ? Array.from(productIds).slice(0, 200) : undefined;

      const { data: orderItems } = productIdArray
        ? await supabase.from('order_items').select('product_id, product_name, quantity, unit_price').gte('created_at', since).in('product_id', productIdArray)
        : await supabase.from('order_items').select('product_id, product_name, quantity, unit_price').gte('created_at', since);

      if (!orderItems?.length) return [];

      // Group by product and fetch supplier info from external DB
      const productIdsFromOrders = [...new Set(orderItems.map(oi => oi.product_id).filter(Boolean))] as string[];
      if (!productIdsFromOrders.length) return [];

      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      const products = await fetchPromobrindProducts({ limit: 5000 });
      const productSupplierMap = new Map<string, string>();
      products.forEach(p => {
        productSupplierMap.set(p.id, p.supplier_reference || 'Sem fornecedor');
      });

      const supplierMap = new Map<string, { orderCount: number; revenue: number; productCount: number; products: Set<string> }>();
      orderItems.forEach(item => {
        const supplier = productSupplierMap.get(item.product_id || '') || 'Sem fornecedor';
        const existing = supplierMap.get(supplier) || { orderCount: 0, revenue: 0, productCount: 0, products: new Set<string>() };
        existing.orderCount += 1;
        existing.revenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
        if (item.product_id) existing.products.add(item.product_id);
        supplierMap.set(supplier, existing);
      });

      return Array.from(supplierMap.entries())
        .map(([supplier, data]) => ({
          supplierName: supplier,
          orderCount: data.orderCount,
          revenue: data.revenue,
          productCount: data.products.size,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user && (!hasFilter || productIds !== undefined),
  });
}
