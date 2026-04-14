/**
 * useDiscountApproval — Gerencia solicitações de aprovação de desconto
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DiscountApprovalRequest {
  id: string;
  quote_id: string;
  seller_id: string;
  requested_discount_percent: number;
  max_allowed_percent: number;
  status: "pending" | "approved" | "rejected";
  admin_id: string | null;
  admin_notes: string | null;
  seller_notes: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountApprovalWithQuote extends DiscountApprovalRequest {
  quote?: {
    quote_number: string;
    client_name: string | null;
    client_company: string | null;
    total: number;
    subtotal: number;
  };
  seller?: {
    full_name: string | null;
    email: string | null;
  };
}

export function useDiscountApproval() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<DiscountApprovalWithQuote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Request approval (seller action)
  const requestApproval = useCallback(async (
    quoteId: string,
    requestedPercent: number,
    maxAllowedPercent: number,
    sellerNotes?: string
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("discount_approval_requests")
        .insert({
          quote_id: quoteId,
          seller_id: user.id,
          requested_discount_percent: requestedPercent,
          max_allowed_percent: maxAllowedPercent,
          seller_notes: sellerNotes || null,
        });
      if (error) throw error;
      toast.success("Solicitação de aprovação enviada ao admin!");
      return true;
    } catch (err) {
      console.error("Error requesting approval:", err);
      toast.error("Erro ao solicitar aprovação");
      return false;
    }
  }, [user]);

  // Respond to approval (admin action)
  const respondToApproval = useCallback(async (
    requestId: string,
    approved: boolean,
    adminNotes?: string
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      // Update the request
      const { data: request, error: updateError } = await supabase
        .from("discount_approval_requests")
        .update({
          status: approved ? "approved" : "rejected",
          admin_id: user.id,
          admin_notes: adminNotes || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();
      if (updateError) throw updateError;

      // Update quote status: approved → pending (ready to send), rejected → draft (needs adjustment)
      const newStatus = approved ? "pending" : "draft";
      await supabase
        .from("quotes")
        .update({ status: newStatus })
        .eq("id", (request as DiscountApprovalRequest).quote_id);

      toast.success(approved ? "Desconto aprovado!" : "Desconto rejeitado");
      return true;
    } catch (err) {
      console.error("Error responding to approval:", err);
      toast.error("Erro ao responder solicitação");
      return false;
    }
  }, [user]);

  // Fetch pending requests (admin)
  const fetchPendingRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("discount_approval_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const requests = (data || []) as DiscountApprovalRequest[];

      if (requests.length === 0) { setPendingRequests([]); return; }

      // Batch fetch quotes and sellers in parallel (no N+1)
      const quoteIds = [...new Set(requests.map(r => r.quote_id))];
      const sellerIds = [...new Set(requests.map(r => r.seller_id))];

      const [quotesRes, sellersRes] = await Promise.all([
        supabase.from("quotes").select("id, quote_number, client_name, client_company, total, subtotal").in("id", quoteIds),
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", sellerIds),
      ]);

      const quotesMap = new Map((quotesRes.data || []).map(q => [q.id, q]));
      const sellersMap = new Map((sellersRes.data || []).map(s => [s.user_id, s]));

      const enriched: DiscountApprovalWithQuote[] = requests.map(req => ({
        ...req,
        quote: quotesMap.get(req.quote_id) || undefined,
        seller: sellersMap.get(req.seller_id) || undefined,
      }));

      setPendingRequests(enriched);
    } catch (err) {
      console.error("Error fetching approval requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get approval status for a specific quote
  const getApprovalStatus = useCallback(async (quoteId: string): Promise<DiscountApprovalRequest | null> => {
    try {
      const { data } = await supabase
        .from("discount_approval_requests")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as DiscountApprovalRequest) || null;
    } catch {
      return null;
    }
  }, []);

  return {
    pendingRequests,
    isLoading,
    requestApproval,
    respondToApproval,
    fetchPendingRequests,
    getApprovalStatus,
  };
}
