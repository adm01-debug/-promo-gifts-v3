/**
 * useKitAnalytics — KPIs agregados dos kits do usuário.
 * Cruza custom_kits com quotes (kit_group_id em quote_items) para inferir taxa de aprovação.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface KitAnalyticsRow {
  kit_id: string;
  kit_name: string;
  total_price: number;
  created_at: string;
  quote_count: number;
  approved_count: number;
  approval_rate: number;
  avg_ticket: number;
}

export function useKitAnalytics() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['kit-analytics', user?.id],
    queryFn: async (): Promise<KitAnalyticsRow[]> => {
      if (!user?.id) return [];

      const { data: kits, error: kErr } = await supabase
        .from('custom_kits')
        .select('id, name, total_price, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (kErr) throw kErr;

      const rows: KitAnalyticsRow[] = [];
      for (const k of kits || []) {
        const { data: items } = await supabase
          .from('quote_items')
          .select('quote_id, subtotal, quotes!inner(status)')
          .eq('kit_group_id', k.id);

        const uniqueQuotes = new Map<string, { status: string; subtotal: number }>();
        for (const it of (items || []) as Array<{ quote_id: string; subtotal: number | null; quotes: { status: string } }>) {
          if (!uniqueQuotes.has(it.quote_id)) {
            uniqueQuotes.set(it.quote_id, { status: it.quotes.status, subtotal: Number(it.subtotal || 0) });
          }
        }
        const list = Array.from(uniqueQuotes.values());
        const approved = list.filter(q => ['approved', 'converted'].includes(q.status)).length;
        const avgTicket = list.length ? list.reduce((s, q) => s + q.subtotal, 0) / list.length : 0;

        rows.push({
          kit_id: k.id,
          kit_name: k.name || 'Kit',
          total_price: Number(k.total_price || 0),
          created_at: k.created_at,
          quote_count: list.length,
          approved_count: approved,
          approval_rate: list.length ? (approved / list.length) * 100 : 0,
          avg_ticket: avgTicket,
        });
      }

      return rows.sort((a, b) => b.approval_rate - a.approval_rate || b.quote_count - a.quote_count);
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
