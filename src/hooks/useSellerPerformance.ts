/**
 * useSellerPerformance — Métricas de performance comercial dos vendedores.
 * Puxa dados reais de quotes e orders para construir KPIs de vendas.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SellerMetrics {
  sellerId: string;
  sellerName: string;
  totalQuotes: number;
  sentQuotes: number;
  approvedQuotes: number;
  rejectedQuotes: number;
  convertedQuotes: number;
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  conversionRate: number; // approved / sent %
  winRate: number; // approved / (approved + rejected) %
}

export interface PerformanceSummary {
  /** Current user's metrics */
  myMetrics: SellerMetrics | null;
  /** All sellers (for ranking) — only populated for admins */
  allSellers: SellerMetrics[];
  /** Period totals */
  periodTotalRevenue: number;
  periodTotalQuotes: number;
  periodTotalOrders: number;
}

async function fetchPerformance(userId: string, isAdmin: boolean, periodDays: number): Promise<PerformanceSummary> {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);
  const sinceISO = since.toISOString();

  // Fetch quotes
  let quotesQuery = supabase
    .from("quotes")
    .select("seller_id, status, total")
    .gte("created_at", sinceISO);

  if (!isAdmin) {
    quotesQuery = quotesQuery.eq("seller_id", userId);
  }

  const { data: quotes } = await quotesQuery;

  // Fetch orders
  let ordersQuery = supabase
    .from("orders")
    .select("seller_id, total, status")
    .gte("created_at", sinceISO);

  if (!isAdmin) {
    ordersQuery = ordersQuery.eq("seller_id", userId);
  }

  const { data: orders } = await ordersQuery;

  // Fetch profiles for names
  const sellerIds = new Set<string>();
  quotes?.forEach((q) => sellerIds.add(q.seller_id));
  orders?.forEach((o) => sellerIds.add(o.seller_id));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", Array.from(sellerIds));

  const nameMap = new Map<string, string>();
  profiles?.forEach((p) => nameMap.set(p.user_id, p.full_name || "Vendedor"));

  // Aggregate per seller
  const sellerMap = new Map<string, SellerMetrics>();

  const getOrCreate = (sellerId: string): SellerMetrics => {
    if (!sellerMap.has(sellerId)) {
      sellerMap.set(sellerId, {
        sellerId,
        sellerName: nameMap.get(sellerId) || "Vendedor",
        totalQuotes: 0,
        sentQuotes: 0,
        approvedQuotes: 0,
        rejectedQuotes: 0,
        convertedQuotes: 0,
        totalOrders: 0,
        totalRevenue: 0,
        avgTicket: 0,
        conversionRate: 0,
        winRate: 0,
      });
    }
    return sellerMap.get(sellerId)!;
  };

  quotes?.forEach((q) => {
    const m = getOrCreate(q.seller_id);
    m.totalQuotes++;
    if (q.status === "sent") m.sentQuotes++;
    if (q.status === "approved") m.approvedQuotes++;
    if (q.status === "rejected") m.rejectedQuotes++;
    if (q.status === "converted") m.convertedQuotes++;
  });

  orders?.forEach((o) => {
    const m = getOrCreate(o.seller_id);
    if (o.status !== "cancelled") {
      m.totalOrders++;
      m.totalRevenue += o.total || 0;
    }
  });

  // Compute rates
  sellerMap.forEach((m) => {
    const decided = m.approvedQuotes + m.rejectedQuotes;
    m.conversionRate = m.sentQuotes > 0
      ? Math.round((m.approvedQuotes / m.sentQuotes) * 100)
      : 0;
    m.winRate = decided > 0
      ? Math.round((m.approvedQuotes / decided) * 100)
      : 0;
    m.avgTicket = m.totalOrders > 0
      ? m.totalRevenue / m.totalOrders
      : 0;
  });

  const allSellers = Array.from(sellerMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    myMetrics: sellerMap.get(userId) || null,
    allSellers: isAdmin ? allSellers : [],
    periodTotalRevenue: allSellers.reduce((s, m) => s + m.totalRevenue, 0),
    periodTotalQuotes: allSellers.reduce((s, m) => s + m.totalQuotes, 0),
    periodTotalOrders: allSellers.reduce((s, m) => s + m.totalOrders, 0),
  };
}

export function useSellerPerformance(periodDays = 30) {
  const { user, role } = useAuth();
  const isAdmin = role === "admin" || role === "manager";

  return useQuery({
    queryKey: ["seller-performance", user?.id, periodDays, isAdmin],
    queryFn: () => fetchPerformance(user!.id, isAdmin, periodDays),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
