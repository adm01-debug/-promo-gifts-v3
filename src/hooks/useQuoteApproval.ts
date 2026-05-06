import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ApprovalToken {
  id: string;
  quote_id: string;
  token: string;
  seller_id: string;
  client_name: string | null;
  client_email: string | null;
  status: string;
  expires_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  response: string | null;
  response_notes: string | null;
  created_at: string;
}

export function useQuoteApproval() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const generateApprovalLink = useCallback(async (
    quoteId: string,
    clientName?: string,
    clientEmail?: string
  ): Promise<{ token: ApprovalToken; link: string } | null> => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return null;
    }

    setIsLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48h TTL para segurança

      const { data, error } = await supabase
        .from("quote_approval_tokens")
        .insert({
          quote_id: quoteId,
          seller_id: user.id,
          client_name: clientName || null,
          client_email: clientEmail || null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/proposta/${data.token}`;
      toast.success("Link de aprovação gerado!");
      return { token: data as ApprovalToken, link };
    } catch (err) {
      console.error("Error generating approval link:", err);
      toast.error("Erro ao gerar link de aprovação");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getApprovalStatus = useCallback(async (quoteId: string): Promise<ApprovalToken | null> => {
    try {
      const { data, error } = await supabase
        .from("quote_approval_tokens")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ApprovalToken | null;
    } catch (err) {
      console.error("Error fetching approval status:", err);
      return null;
    }
  }, []);

  const revokeToken = useCallback(async (tokenId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("quote_approval_tokens")
        .update({ status: "revoked" })
        .eq("id", tokenId);

      if (error) throw error;
      toast.success("Link revogado");
      return true;
    } catch (err) {
      console.error("Error revoking token:", err);
      toast.error("Erro ao revogar link");
      return false;
    }
  }, []);

  return {
    generateApprovalLink,
    getApprovalStatus,
    revokeToken,
    isLoading,
  };
}
