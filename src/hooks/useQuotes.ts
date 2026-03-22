import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeExternalDb } from "@/lib/external-db";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image_url?: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  color_name?: string;
  color_hex?: string;
  notes?: string;
  sort_order?: number;
  bitrix_product_id?: string | number | null;
  kit_group_id?: string | null;
  kit_name?: string | null;
  personalizations?: QuoteItemPersonalization[];
}

export interface QuoteItemPersonalization {
  id?: string;
  quote_item_id?: string;
  technique_id: string;
  technique_name?: string;
  colors_count?: number;
  positions_count?: number;
  area_cm2?: number;
  width_cm?: number;
  height_cm?: number;
  personalized_quantity?: number;
  setup_cost?: number;
  unit_cost?: number;
  total_cost?: number;
  notes?: string;
}

export interface Quote {
  id?: string;
  quote_number?: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  client_cnpj?: string;
  seller_id?: string;
  status: "draft" | "pending" | "sent" | "approved" | "rejected" | "expired";
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  notes?: string;
  payment_terms?: string;
  delivery_time?: string;
  shipping_method?: string;
  shipping_type?: string;
  shipping_cost?: number;
  internal_notes?: string;
  valid_until?: string;
  bitrix_deal_id?: string;
  bitrix_quote_id?: string;
  synced_to_bitrix?: boolean;
  synced_at?: string;
  client_response?: string;
  client_response_at?: string;
  client_response_notes?: string;
  created_at?: string;
  updated_at?: string;
  items?: QuoteItem[];
}

export interface PersonalizationTechnique {
  id: string;
  name: string;
  description?: string;
  code?: string;
  min_quantity?: number;
  setup_cost?: number;
  unit_cost?: number;
  estimated_days?: number;
  is_active?: boolean;
}

export function useQuotes() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [techniques, setTechniques] = useState<PersonalizationTechnique[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all quotes for current user from LOCAL DB
  const fetchQuotes = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: qErr } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (qErr) throw new Error(qErr.message);
      setQuotes((data as any[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar orçamentos";
      setError(message);
      toast.error("Erro ao carregar orçamentos", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single quote with items
  const fetchQuote = async (quoteId: string): Promise<Quote | null> => {
    setIsLoading(true);
    try {
      const { data: quoteData, error: qErr } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

      if (qErr) throw new Error(qErr.message);
      if (!quoteData) return null;

      // Fetch items
      const { data: itemsData } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true });

      // Fetch personalizations for all items
      const itemIds = (itemsData || []).map((i: any) => i.id);
      let allPersonalizations: any[] = [];
      if (itemIds.length > 0) {
        const { data: persData } = await supabase
          .from("quote_item_personalizations")
          .select("*")
          .in("quote_item_id", itemIds);
        allPersonalizations = persData || [];
      }

      const items: QuoteItem[] = (itemsData || []).map((item: any) => ({
        ...item,
        personalizations: allPersonalizations.filter(p => p.quote_item_id === item.id),
      }));

      return { ...quoteData, items } as Quote;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar orçamento";
      toast.error("Erro ao carregar orçamento", { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Create new quote in LOCAL DB
  const createQuote = async (quote: Partial<Quote>, items: QuoteItem[]): Promise<Quote | null> => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return null;
    }
    setIsLoading(true);

    try {
      const subtotal = items.reduce((sum, item) => {
        const baseTotal = item.quantity * item.unit_price;
        const persTotal = (item.personalizations || []).reduce((pSum, p) => pSum + (p.total_cost || 0), 0);
        return sum + baseTotal + persTotal;
      }, 0);
      const discountAmount = quote.discount_percent
        ? subtotal * (quote.discount_percent / 100)
        : (quote.discount_amount || 0);
      const shippingCostValue = (quote.shipping_type === "fob" || quote.shipping_type === "fob_pre")
        ? (quote.shipping_cost || 0) : 0;
      const total = subtotal - discountAmount + shippingCostValue;

      const { data: inserted, error: insErr } = await supabase
        .from("quotes")
        .insert({
          client_id: quote.client_id || null,
          client_name: quote.client_name || null,
          client_email: quote.client_email || null,
          client_phone: quote.client_phone || null,
          client_company: quote.client_company || null,
          seller_id: user.id,
          status: quote.status || "draft",
          subtotal,
          discount_percent: quote.discount_percent || 0,
          discount_amount: discountAmount,
          total,
          payment_terms: quote.payment_terms || null,
          delivery_time: quote.delivery_time || null,
          shipping_type: quote.shipping_type || null,
          shipping_cost: quote.shipping_cost || 0,
          notes: quote.notes || null,
          internal_notes: quote.internal_notes || null,
          valid_until: quote.valid_until || null,
        } as any)
        .select("*");

      if (insErr) throw new Error(insErr.message);
      const newQuote = (inserted as any[])?.[0];
      if (!newQuote) throw new Error("Falha ao inserir orçamento");

      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          quote_id: newQuote.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          product_image_url: item.product_image_url,
          quantity: item.quantity,
          unit_price: item.unit_price,
          color_name: item.color_name,
          color_hex: item.color_hex,
          notes: item.notes,
          sort_order: index,
          kit_group_id: item.kit_group_id || null,
          kit_name: item.kit_name || null,
        }));

        const { data: insertedItems, error: itemsErr } = await supabase
          .from("quote_items")
          .insert(itemsToInsert as any)
          .select("*");

        if (itemsErr) throw new Error(itemsErr.message);

        // Insert personalizations
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const insertedItem = (insertedItems as any[])?.[i];
          if (item.personalizations?.length && insertedItem) {
            const persToInsert = item.personalizations.map(p => ({
              quote_item_id: insertedItem.id,
              technique_id: p.technique_id || null,
              technique_name: p.technique_name || null,
              colors_count: p.colors_count || 1,
              positions_count: p.positions_count || 1,
              area_cm2: p.area_cm2,
              setup_cost: p.setup_cost || 0,
              unit_cost: p.unit_cost || 0,
              total_cost: p.total_cost || 0,
              notes: p.notes,
            }));
            await supabase.from("quote_item_personalizations").insert(persToInsert as any);
          }
        }
      }

      await logQuoteHistory(newQuote.id, "created", `Orçamento ${newQuote.quote_number} criado`);

      toast.success("Orçamento criado com sucesso!", {
        description: `Número: ${newQuote.quote_number}`,
      });

      await fetchQuotes();
      return newQuote;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar orçamento";
      toast.error("Erro ao criar orçamento", { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Log quote history
  const logQuoteHistory = async (
    quoteId: string,
    action: string,
    description: string,
    options?: { fieldChanged?: string; oldValue?: string; newValue?: string; metadata?: Record<string, any> }
  ) => {
    if (!user) return;
    try {
      await supabase.from("quote_history").insert({
        quote_id: quoteId,
        user_id: user.id,
        action,
        description,
        field_changed: options?.fieldChanged || null,
        old_value: options?.oldValue || null,
        new_value: options?.newValue || null,
        metadata: options?.metadata || {},
      } as any);
    } catch (err) {
      console.error("Error logging history:", err);
    }
  };

  // Update quote status
  const updateQuoteStatus = async (quoteId: string, status: Quote["status"]): Promise<boolean> => {
    try {
      const currentQuote = quotes.find(q => q.id === quoteId);
      const oldStatus = currentQuote?.status || "draft";

      const { error: updErr } = await supabase
        .from("quotes")
        .update({ status } as any)
        .eq("id", quoteId);

      if (updErr) throw new Error(updErr.message);

      const statusLabels: Record<string, string> = {
        draft: "Rascunho", pending: "Pendente", sent: "Enviado",
        approved: "Aprovado", rejected: "Rejeitado", expired: "Expirado",
      };
      await logQuoteHistory(quoteId, "status_changed",
        `Status alterado de "${statusLabels[oldStatus]}" para "${statusLabels[status]}"`,
        { fieldChanged: "status", oldValue: oldStatus, newValue: status }
      );

      toast.success("Status atualizado");
      await fetchQuotes();
      return true;
    } catch (err) {
      toast.error("Erro ao atualizar status");
      return false;
    }
  };

  // Delete quote (cascade handled by DB)
  const deleteQuote = async (quoteId: string): Promise<boolean> => {
    try {
      const { error: delErr } = await supabase.from("quotes").delete().eq("id", quoteId);
      if (delErr) throw new Error(delErr.message);

      await supabase.from("follow_up_reminders").delete().eq("quote_id", quoteId);

      toast.success("Orçamento excluído");
      await fetchQuotes();
      return true;
    } catch (err) {
      console.error("Erro ao excluir orçamento:", err);
      toast.error("Erro ao excluir orçamento");
      return false;
    }
  };

  // Update existing quote
  const updateQuote = async (quoteId: string, quote: Partial<Quote>, items: QuoteItem[]): Promise<Quote | null> => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return null;
    }
    setIsLoading(true);

    try {
      const subtotal = items.reduce((sum, item) => {
        const baseTotal = item.quantity * item.unit_price;
        const persTotal = (item.personalizations || []).reduce((pSum, p) => pSum + (p.total_cost || 0), 0);
        return sum + baseTotal + persTotal;
      }, 0);
      const discountAmount = quote.discount_percent
        ? subtotal * (quote.discount_percent / 100)
        : (quote.discount_amount || 0);
      const shippingCostValue = (quote.shipping_type === "fob" || quote.shipping_type === "fob_pre")
        ? (quote.shipping_cost || 0) : 0;
      const total = subtotal - discountAmount + shippingCostValue;

      const { data: updated, error: updErr } = await supabase
        .from("quotes")
        .update({
          client_id: quote.client_id || null,
          client_name: quote.client_name || null,
          client_email: quote.client_email || null,
          client_phone: quote.client_phone || null,
          client_company: quote.client_company || null,
          status: quote.status,
          subtotal,
          discount_percent: quote.discount_percent || 0,
          discount_amount: discountAmount,
          total,
          payment_terms: quote.payment_terms || null,
          delivery_time: quote.delivery_time || null,
          shipping_type: quote.shipping_type || null,
          shipping_cost: quote.shipping_cost || 0,
          notes: quote.notes || null,
          internal_notes: quote.internal_notes || null,
          valid_until: quote.valid_until || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", quoteId)
        .select("*");

      if (updErr) throw new Error(updErr.message);
      const updatedQuote = (updated as any[])?.[0];

      // Delete existing items (cascade deletes personalizations)
      await supabase.from("quote_items").delete().eq("quote_id", quoteId);

      // Insert new items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          quote_id: quoteId,
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          product_image_url: item.product_image_url,
          quantity: item.quantity,
          unit_price: item.unit_price,
          color_name: item.color_name,
          color_hex: item.color_hex,
          notes: item.notes,
          sort_order: index,
        }));

        const { data: insertedItems, error: itemsErr } = await supabase
          .from("quote_items")
          .insert(itemsToInsert as any)
          .select("*");

        if (itemsErr) throw new Error(itemsErr.message);

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const insertedItem = (insertedItems as any[])?.[i];
          if (item.personalizations?.length && insertedItem) {
            const persToInsert = item.personalizations.map(p => ({
              quote_item_id: insertedItem.id,
              technique_id: p.technique_id || null,
              technique_name: p.technique_name || null,
              colors_count: p.colors_count || 1,
              positions_count: p.positions_count || 1,
              area_cm2: p.area_cm2,
              setup_cost: p.setup_cost || 0,
              unit_cost: p.unit_cost || 0,
              total_cost: p.total_cost || 0,
              notes: p.notes,
            }));
            await supabase.from("quote_item_personalizations").insert(persToInsert as any);
          }
        }
      }

      await logQuoteHistory(quoteId, "updated",
        `Orçamento atualizado: ${items.length} item(s), total ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}`
      );

      toast.success("Orçamento atualizado com sucesso!");
      await fetchQuotes();
      return updatedQuote;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar orçamento";
      toast.error("Erro ao atualizar orçamento", { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Duplicate quote
  const duplicateQuote = async (quoteId: string): Promise<Quote | null> => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return null;
    }
    setIsLoading(true);

    try {
      const original = await fetchQuote(quoteId);
      if (!original) throw new Error("Orçamento não encontrado");

      const items: QuoteItem[] = original.items?.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        product_image_url: item.product_image_url,
        quantity: item.quantity,
        unit_price: item.unit_price,
        color_name: item.color_name,
        color_hex: item.color_hex,
        notes: item.notes,
        bitrix_product_id: item.bitrix_product_id,
        personalizations: item.personalizations?.map((p) => ({
          technique_id: p.technique_id,
          technique_name: p.technique_name,
          colors_count: p.colors_count,
          positions_count: p.positions_count,
          area_cm2: p.area_cm2,
          width_cm: p.width_cm,
          height_cm: p.height_cm,
          setup_cost: p.setup_cost,
          unit_cost: p.unit_cost,
          total_cost: p.total_cost,
          notes: p.notes,
        })),
      })) || [];

      const newQuote = await createQuote(
        {
          client_id: original.client_id,
          client_name: original.client_name,
          client_email: original.client_email,
          client_phone: original.client_phone,
          client_company: original.client_company,
          status: "draft",
          discount_percent: original.discount_percent,
          discount_amount: original.discount_amount,
          notes: original.notes,
          payment_terms: original.payment_terms,
          delivery_time: original.delivery_time,
          shipping_type: original.shipping_type,
          shipping_cost: original.shipping_cost,
          internal_notes: original.internal_notes
            ? `[Duplicado de ${original.quote_number}] ${original.internal_notes}`
            : `Duplicado de ${original.quote_number}`,
          valid_until: original.valid_until,
        },
        items
      );

      if (newQuote) {
        await logQuoteHistory(newQuote.id!, "created", `Orçamento duplicado a partir de ${original.quote_number}`);
        toast.success("Orçamento duplicado com sucesso!", { description: `Novo número: ${newQuote.quote_number}` });
      }
      return newQuote;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao duplicar orçamento";
      toast.error("Erro ao duplicar orçamento", { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Sync quote to Bitrix via N8N
  const syncQuoteToBitrix = async (quoteId: string): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("quote-sync", {
        body: { action: "sync_quote", data: { quoteId } },
      });
      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);
      toast.success("Orçamento sincronizado com Bitrix!", { description: `Deal ID: ${data.bitrix_deal_id || "N/A"}` });
      await fetchQuotes();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao sincronizar";
      toast.error("Erro ao sincronizar com Bitrix", { description: message });
      return false;
    }
  };

  const testWebhookConnection = async (): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("quote-sync", {
        body: { action: "test_webhook", data: {} },
      });
      if (fnError) throw new Error(fnError.message);
      if (data.success) {
        toast.success("Conexão com N8N estabelecida!");
        return true;
      }
      toast.error("Falha na conexão com N8N");
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao testar conexão";
      toast.error("Erro ao testar webhook", { description: message });
      return false;
    }
  };

  // Fetch personalization techniques from external catalog DB
  const fetchTechniques = async () => {
    try {
      const result = await invokeExternalDb<any>({
        table: "personalization_techniques",
        operation: "select",
        filters: { is_active: true },
        orderBy: { column: "name", ascending: true },
        limit: 100,
      });
      setTechniques(result.records || []);
    } catch (err) {
      console.error("Error fetching techniques:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchQuotes();
      fetchTechniques();
    }
  }, [user]);

  return {
    quotes,
    techniques,
    isLoading,
    error,
    fetchQuotes,
    fetchQuote,
    createQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    duplicateQuote,
    fetchTechniques,
    syncQuoteToBitrix,
    testWebhookConnection,
    logQuoteHistory,
  };
}
