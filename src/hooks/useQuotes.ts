/**
 * useQuotes — Hook de orçamentos (refatorado)
 * Tipos em quotes/quoteTypes.ts, helpers em quotes/quoteHelpers.ts
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeExternalDb } from "@/lib/external-db";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSalesScope } from "@/lib/auth/visibility-scope";
import { applySellerScope } from "@/lib/auth/apply-seller-scope";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";
import { toast } from "sonner";
import type { TablesInsert } from "@/integrations/supabase/types";
import type { Quote, QuoteItem, QuoteItemPersonalization, PersonalizationTechnique } from "./quotes/quoteTypes";
import {
  calculateQuoteTotals,
  buildInsertPayload,
  buildUpdatePayload,
  buildItemsInsertPayload,
  buildPersonalizationsInsertPayload,
  STATUS_LABELS,
} from "./quotes/quoteHelpers";

// Re-export types for backward compatibility
export type { Quote, QuoteItem, QuoteItemPersonalization, PersonalizationTechnique } from "./quotes/quoteTypes";

export interface QuotesListFilters {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export function useQuotes(filters: QuotesListFilters = {}) {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id || null;
  const scope = useSalesScope();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [techniques, setTechniques] = useState<PersonalizationTechnique[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { search, status, page = 1, pageSize = 20 } = filters;

  const fetchQuotes = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("quotes")
        .select("*", { count: "exact" });
      
      q = applySellerScope(q, { scope, userId: user.id });

      if (status && status !== "all") {
        q = q.eq("status", status);
      }

      if (search) {
        q = q.or(`quote_number.ilike.%${search}%,client_name.ilike.%${search}%,client_company.ilike.%${search}%`);
      }

      // Ordenação consistente: orçamentos recentes no topo
      q = q.order("created_at", { ascending: false });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, error: qErr, count } = await q;
      if (qErr) throw new Error(qErr.message);
      
      setQuotes((data || []) as Quote[]);
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error("Error fetching quotes:", err);
      const message = err instanceof Error ? err.message : "Erro ao buscar orçamentos";
      setError(message);
      toast.error("Erro ao carregar orçamentos", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuote = async (quoteId: string): Promise<Quote | null> => {
    setIsLoading(true);
    try {
      const { data: quoteData, error: qErr } = await supabase
        // rls-allow: applySellerScope chamado dinamicamente; mutações por id com RLS
        .from("quotes").select("*").eq("id", quoteId).single();
      if (qErr) throw new Error(qErr.message);
      if (!quoteData) return null;

      const { data: itemsData } = await supabase
        .from("quote_items").select("*").eq("quote_id", quoteId).order("sort_order", { ascending: true });

      const itemIds = (itemsData || []).map((i) => i.id);
      let allPersonalizations: QuoteItemPersonalization[] = [];
      if (itemIds.length > 0) {
        const { data: persData, error: persErr } = await supabase
          .from("quote_item_personalizations").select("*").in("quote_item_id", itemIds);
        if (persErr) {
          console.error("Erro ao carregar personalizações:", persErr);
        }
        allPersonalizations = (persData || []) as QuoteItemPersonalization[];
      }

      const items: QuoteItem[] = (itemsData || []).map((item) => ({
        ...item,
        personalizations: allPersonalizations.filter(p => p.quote_item_id === item.id),
      }));

      return { ...quoteData, items } as Quote;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("Error in fetchQuote:", err);
      toast.error("Erro ao carregar orçamento", { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logQuoteHistory = async (
    quote_id: string, action: string, description: string,
    options?: { fieldChanged?: string; oldValue?: string; newValue?: string; metadata?: Record<string, unknown> }
  ) => {
    if (!user) return;
    try {
      const { error: histErr } = await supabase.from("quote_history").insert({
        quote_id, 
        user_id: user.id, 
        action, 
        description,
        field_changed: options?.fieldChanged || null,
        old_value: options?.oldValue || null,
        new_value: options?.newValue || null,
        metadata: options?.metadata || {},
      });
      if (histErr) throw histErr;
    } catch (err) {
      console.error("Error logging history:", err);
    }
  };

  async function insertItemsWithPersonalizations(items: QuoteItem[], quoteId: string) {
    if (items.length === 0) return;
    const itemsPayload = buildItemsInsertPayload(items, quoteId).map(item => ({
      ...item,
      product_name: item.product_name?.trim().slice(0, 255),
      notes: item.notes?.trim().slice(0, 1000)
    }));
    const { data: insertedItems, error: itemsErr } = await supabase
      .from("quote_items").insert(itemsPayload).select("*");
    if (itemsErr) throw itemsErr;

    if (!insertedItems) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const insertedItem = insertedItems[i];
      if (item.personalizations?.length && insertedItem) {
        const persPayload = buildPersonalizationsInsertPayload(item.personalizations, insertedItem.id);
        const { error: persErr } = await supabase.from("quote_item_personalizations").insert(persPayload);
        if (persErr) {
          console.error("Erro ao inserir personalizações para item:", insertedItem.id, persErr);
          throw persErr;
        }
      }
    }
  }

  const createQuote = async (quote: Partial<Quote>, items: QuoteItem[]): Promise<Quote | null> => {
    if (!user) { toast.error("Usuário não autenticado"); return null; }
    setIsLoading(true);
    try {
      const totals = calculateQuoteTotals(quote, items);
      // Validar integridade dos cálculos se houver markup
      if (totals.markup > 0 && totals.subtotal < totals.realSubtotal) {
        throw new Error("Falha na integridade dos cálculos: subtotal apresentado menor que subtotal real.");
      }
      const insertPayload = buildInsertPayload(quote, user.id, orgId, totals);
      // rls-allow: applySellerScope chamado dinamicamente; mutações por id com RLS
      const { data: inserted, error: insErr } = await supabase.from("quotes").insert(insertPayload).select("*");
      if (insErr) throw new Error(insErr.message);
      const newQuote = inserted?.[0];
      if (!newQuote) throw new Error("Falha ao inserir orçamento");

      await insertItemsWithPersonalizations(items, newQuote.id);
      await logQuoteHistory(newQuote.id, "created", `Orçamento ${newQuote.quote_number} criado`);
      toast.success("Orçamento criado!", { description: `Número: ${newQuote.quote_number}` });
      await fetchQuotes();
      return newQuote as unknown as Quote;
    } catch (err) {
      toast.error("Erro ao criar orçamento", { description: err instanceof Error ? err.message : "Erro" });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: Quote["status"]): Promise<boolean> => {
    try {
      const oldStatus = quotes.find(q => q.id === quoteId)?.status || "draft";
      if (oldStatus === status) return true;

      // rls-allow: applySellerScope chamado dinamicamente; mutações por id com RLS
      const { error: updErr } = await supabase
        .from("quotes")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", quoteId);

      if (updErr) throw new Error(updErr.message);

      await logQuoteHistory(quoteId, "status_changed",
        `Status alterado de "${STATUS_LABELS[oldStatus] || oldStatus}" para "${STATUS_LABELS[status] || status}"`,
        { fieldChanged: "status", oldValue: oldStatus, newValue: status }
      );
      
      toast.success("Status atualizado");
      await fetchQuotes();
      return true;
    } catch (err) {
      console.error("Error updating quote status:", err);
      toast.error("Erro ao atualizar status", { 
        description: err instanceof Error ? err.message : "Erro desconhecido" 
      });
      return false;
    }
  };

  const deleteQuote = async (quoteId: string): Promise<boolean> => {
    try {
      // rls-allow: applySellerScope chamado dinamicamente; mutações por id com RLS
      const { error: delErr } = await supabase.from("quotes").delete().eq("id", quoteId);
      if (delErr) throw delErr;
      toast.success("Orçamento excluído");
      await fetchQuotes();
      return true;
    } catch (err) {
      console.error("Error deleting quote:", err);
      toast.error("Erro ao excluir orçamento");
      return false;
    }
  };
  const bulkUpdateStatus = async (quoteIds: string[], status: Quote["status"]): Promise<boolean> => {
    if (quoteIds.length === 0) return true;
    try {
      const { error: updErr } = await supabase
        .from("quotes")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", quoteIds);
        
      if (updErr) throw updErr;
      
      // Log history for each quote (in parallel to save time, but carefully)
      await Promise.allSettled(
        quoteIds.map(quoteId => 
          logQuoteHistory(quoteId, "status_changed", `Status alterado em massa para ${STATUS_LABELS[status] || status}`)
        )
      );

      toast.success(`${quoteIds.length} orçamento(s) atualizado(s)`);
      await fetchQuotes();
      return true;
    } catch (err) {
      console.error("Error in bulk update status:", err);
      toast.error("Erro ao atualizar orçamentos em massa", {
        description: err instanceof Error ? err.message : "Erro desconhecido"
      });
      return false;
    }
  };

  const bulkDeleteQuotes = async (quoteIds: string[]): Promise<boolean> => {
    try {
      const { error: delErr } = await supabase.from("quotes").delete().in("id", quoteIds);
      if (delErr) throw delErr;
      toast.success(`${quoteIds.length} orçamento(s) excluído(s)`);
      await fetchQuotes();
      return true;
    } catch (err) {
      console.error("Error in bulk delete:", err);
      toast.error("Erro ao excluir orçamentos em massa");
      return false;
    }
  };

  const updateQuote = async (quoteId: string, quote: Partial<Quote>, items: QuoteItem[]): Promise<Quote | null> => {
    if (!user) { toast.error("Usuário não autenticado"); return null; }
    setIsLoading(true);
    try {
      const totals = calculateQuoteTotals(quote, items);
      // Validar integridade dos cálculos se houver markup
      if (totals.markup > 0 && totals.subtotal < totals.realSubtotal) {
        throw new Error("Falha na integridade dos cálculos: subtotal apresentado menor que subtotal real.");
      }
      const updatePayload = buildUpdatePayload(quote, totals);
      const { data: updated, error: updErr } = await supabase
        // rls-allow: applySellerScope chamado dinamicamente; mutações por id com RLS
        .from("quotes").update(updatePayload).eq("id", quoteId).select("*");
      if (updErr) throw new Error(updErr.message);

      await supabase.from("quote_items").delete().eq("quote_id", quoteId);
      await insertItemsWithPersonalizations(items, quoteId);

      await logQuoteHistory(quoteId, "updated",
        `Orçamento atualizado: ${items.length} item(s), total ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.total)}`
      );
      toast.success("Orçamento atualizado!");
      await fetchQuotes();
      return updated?.[0] as unknown as Quote;
    } catch (err) {
      toast.error("Erro ao atualizar orçamento", { description: err instanceof Error ? err.message : "Erro" });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const duplicateQuote = async (quoteId: string): Promise<Quote | null> => {
    if (!user) { toast.error("Usuário não autenticado"); return null; }
    setIsLoading(true);
    try {
      const original = await fetchQuote(quoteId);
      if (!original) throw new Error("Orçamento não encontrado");

      const items: QuoteItem[] = original.items?.map((item) => ({
        product_id: item.product_id, product_name: item.product_name,
        product_sku: item.product_sku, product_image_url: item.product_image_url,
        quantity: item.quantity, unit_price: item.unit_price,
        color_name: item.color_name, color_hex: item.color_hex,
        notes: item.notes, bitrix_product_id: item.bitrix_product_id,
        personalizations: item.personalizations?.map((p) => ({
          technique_id: p.technique_id, technique_name: p.technique_name,
          colors_count: p.colors_count, positions_count: p.positions_count,
          area_cm2: p.area_cm2, width_cm: p.width_cm, height_cm: p.height_cm,
          setup_cost: p.setup_cost, unit_cost: p.unit_cost, total_cost: p.total_cost, notes: p.notes,
        })),
      })) || [];

      const newQuote = await createQuote({
        client_id: original.client_id, client_name: original.client_name,
        client_email: original.client_email, client_phone: original.client_phone,
        client_company: original.client_company, status: "draft",
        discount_percent: original.discount_percent, discount_amount: original.discount_amount,
        notes: original.notes, payment_terms: original.payment_terms,
        delivery_time: original.delivery_time, shipping_type: original.shipping_type,
        shipping_cost: original.shipping_cost,
        internal_notes: original.internal_notes
          ? `[Duplicado de ${original.quote_number}] ${original.internal_notes}`
          : `Duplicado de ${original.quote_number}`,
        valid_until: original.valid_until,
      }, items);

      if (newQuote) {
        await logQuoteHistory(newQuote.id!, "created", `Duplicado a partir de ${original.quote_number}`);
      }
      return newQuote;
    } catch (err) {
      toast.error("Erro ao duplicar", { description: err instanceof Error ? err.message : "Erro" });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const syncQuoteToBitrix = async (quoteId: string): Promise<boolean> => {
    const log = createClientLogger('quote.syncBitrix', { base: { quoteId } });
    log.info('start');
    try {
      const { data, error: fnError } = await supabase.functions.invoke("quote-sync", {
        body: { action: "sync_quote", data: { quoteId } },
        headers: log.headers(),
      });
      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);
      log.info('ok', { bitrix_deal_id: data.bitrix_deal_id ?? null });
      toast.success("Sincronizado com Bitrix!", { description: `Deal ID: ${data.bitrix_deal_id || "N/A"}` });
      await fetchQuotes();
      return true;
    } catch (err) {
      log.error('failed', { err });
      toast.error("Erro ao sincronizar", { description: err instanceof Error ? err.message : "Erro" });
      return false;
    }
  };

  const testWebhookConnection = async (): Promise<boolean> => {
    const log = createClientLogger('quote.testWebhook');
    log.info('start');
    try {
      const { data, error: fnError } = await supabase.functions.invoke("quote-sync", {
        body: { action: "test_webhook", data: {} },
        headers: log.headers(),
      });
      if (fnError) throw new Error(fnError.message);
      if (data.success) { log.info('ok'); toast.success("Conexão com N8N estabelecida!"); return true; }
      log.warn('not_ok');
      toast.error("Falha na conexão com N8N");
      return false;
    } catch (err) {
      log.error('failed', { err });
      toast.error("Erro ao testar webhook", { description: err instanceof Error ? err.message : "Erro" });
      return false;
    }
  };

  const fetchTechniques = async () => {
    try {
      const result = await invokeExternalDb<PersonalizationTechnique>({
        table: "personalization_techniques", 
        operation: "select",
        filters: { is_active: true }, 
        orderBy: { column: "name", ascending: true }, 
        limit: 100,
      });
      if (result.error) {
        throw new Error(result.error);
      }
      setTechniques(result.records || []);
    } catch (err) {
      console.error("Error fetching techniques:", err);
      toast.error("Erro ao carregar técnicas de personalização");
    }
  };

  useEffect(() => {
    if (user) { 
      fetchQuotes(); 
      fetchTechniques(); 
    }
  }, [user, search, status, page, pageSize]);

  return {
    quotes, 
    totalCount,
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
    bulkUpdateStatus, 
    bulkDeleteQuotes,
  };
}
