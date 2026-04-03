import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FinancialStats {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  conversionRate: number;
  quotesCount: number;
  approvedQuotes: number;
  pendingRevenue: number;
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>;
  topProducts: Array<{ name: string; revenue: number; quantity: number }>;
  revenueByStatus: Array<{ status: string; value: number; count: number }>;
}

export function useFinancialDashboard(period: "7d" | "30d" | "90d" | "365d" = "30d") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["financial-dashboard", period, user?.id],
    queryFn: async (): Promise<FinancialStats> => {
      const daysMap = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysMap[period]);
      const cutoffISO = cutoff.toISOString();

      // Fetch quotes, orders, and order items in parallel
      const [quotesRes, ordersRes, orderItemsRes] = await Promise.all([
        supabase
          .from("quotes")
          .select("id, status, total, subtotal, created_at")
          .gte("created_at", cutoffISO),
        supabase
          .from("orders")
          .select("id, total, subtotal, status, created_at")
          .gte("created_at", cutoffISO),
        supabase
          .from("order_items")
          .select("product_name, quantity, unit_price, order_id"),
      ]);

      const quotes = quotesRes.data || [];
      const orders = ordersRes.data || [];
      const orderItems = orderItemsRes.data || [];

      // Revenue from orders
      const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const totalOrders = orders.length;
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Conversion rate
      const quotesCount = quotes.length;
      const approvedQuotes = quotes.filter((q) => q.status === "approved" || q.status === "converted").length;
      const conversionRate = quotesCount > 0 ? (approvedQuotes / quotesCount) * 100 : 0;

      // Pending revenue (quotes in pending/sent status)
      const pendingRevenue = quotes
        .filter((q) => q.status === "pending" || q.status === "sent")
        .reduce((sum, q) => sum + (Number(q.total) || 0), 0);

      // Monthly revenue
      const monthlyMap = new Map<string, { revenue: number; orders: number }>();
      for (const order of orders) {
        const date = new Date(order.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const entry = monthlyMap.get(key) || { revenue: 0, orders: 0 };
        entry.revenue += Number(order.total) || 0;
        entry.orders += 1;
        monthlyMap.set(key, entry);
      }
      const monthlyRevenue = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Top products by revenue
      const orderIds = new Set(orders.map((o) => o.id));
      const relevantItems = orderItems.filter((i) => i.order_id && orderIds.has(i.order_id));
      const productMap = new Map<string, { revenue: number; quantity: number }>();
      for (const item of relevantItems) {
        const name = item.product_name || "Produto sem nome";
        const entry = productMap.get(name) || { revenue: 0, quantity: 0 };
        entry.revenue += (Number(item.unit_price) || 0) * (item.quantity || 0);
        entry.quantity += item.quantity || 0;
        productMap.set(name, entry);
      }
      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Revenue by quote status
      const statusMap = new Map<string, { value: number; count: number }>();
      for (const quote of quotes) {
        const status = quote.status || "unknown";
        const entry = statusMap.get(status) || { value: 0, count: 0 };
        entry.value += Number(quote.total) || 0;
        entry.count += 1;
        statusMap.set(status, entry);
      }
      const revenueByStatus = Array.from(statusMap.entries())
        .map(([status, data]) => ({ status, ...data }));

      return {
        totalRevenue,
        totalOrders,
        averageTicket,
        conversionRate,
        quotesCount,
        approvedQuotes,
        pendingRevenue,
        monthlyRevenue,
        topProducts,
        revenueByStatus,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });
}
