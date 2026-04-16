/**
 * useCommissions — Hook para gerenciar comissões de vendedores.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CommissionRule {
  id: string;
  seller_id: string | null;
  commission_percent: number;
  min_order_value: number;
  max_order_value: number | null;
  is_default: boolean;
  is_active: boolean;
}

export interface CommissionEntry {
  id: string;
  order_id: string | null;
  seller_id: string;
  order_total: number;
  commission_percent: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useCommissions() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin" || role === "manager";

  const rulesQuery = useQuery({
    queryKey: ["commission-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rules")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return (data || []) as CommissionRule[];
    },
    enabled: !!user?.id,
  });

  const entriesQuery = useQuery({
    queryKey: ["commission-entries", user?.id],
    queryFn: async () => {
      let query = supabase
        .from("commission_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!isAdmin) {
        query = query.eq("seller_id", user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CommissionEntry[];
    },
    enabled: !!user?.id,
  });

  // Calculate commission for a given order value
  const calculateCommission = (orderTotal: number, sellerId?: string): { percent: number; amount: number } => {
    const rules = rulesQuery.data || [];
    
    // Find most specific rule: seller-specific first, then default
    const sellerRule = sellerId
      ? rules.find(r => r.seller_id === sellerId && r.is_active &&
          orderTotal >= (r.min_order_value || 0) &&
          (!r.max_order_value || orderTotal <= r.max_order_value))
      : null;

    const defaultRule = rules.find(r => r.is_default && r.is_active &&
      orderTotal >= (r.min_order_value || 0) &&
      (!r.max_order_value || orderTotal <= r.max_order_value));

    const rule = sellerRule || defaultRule;
    const percent = rule?.commission_percent || 0;

    return {
      percent,
      amount: (orderTotal * percent) / 100,
    };
  };

  // Summary
  const summary = {
    totalPending: (entriesQuery.data || [])
      .filter(e => e.status === "pending")
      .reduce((s, e) => s + e.commission_amount, 0),
    totalApproved: (entriesQuery.data || [])
      .filter(e => e.status === "approved")
      .reduce((s, e) => s + e.commission_amount, 0),
    totalPaid: (entriesQuery.data || [])
      .filter(e => e.status === "paid")
      .reduce((s, e) => s + e.commission_amount, 0),
    totalEntries: (entriesQuery.data || []).length,
  };

  return {
    rules: rulesQuery.data || [],
    entries: entriesQuery.data || [],
    isLoading: rulesQuery.isLoading || entriesQuery.isLoading,
    calculateCommission,
    summary,
    refetch: () => {
      rulesQuery.refetch();
      entriesQuery.refetch();
    },
  };
}
