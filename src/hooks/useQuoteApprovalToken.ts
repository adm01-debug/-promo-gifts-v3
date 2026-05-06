/**
 * useQuoteApprovalToken — busca dados do token público de aprovação de orçamento.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useQuoteApprovalToken(token: string | null | undefined) {
  return useQuery({
    queryKey: ["quote-approval-token", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_quote_token_by_value", { _token: token! });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
  });
}
