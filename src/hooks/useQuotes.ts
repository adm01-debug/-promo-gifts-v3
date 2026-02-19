import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeExternalDb } from "@/lib/external-db";
import { invokeCrmDb, insertCrm, updateCrm, deleteCrm, deleteCrmByFilter, selectCrm, selectCrmById } from "@/lib/crm-db";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── Shipping serialization helpers ───────────────────────────────────────────
// The external CRM's quotes table doesn't have shipping_type/shipping_cost
// columns. We encode them into internal_notes with a special marker.
const SHIPPING_MARKER = "|||FRETE:";
const SHIPPING_END = "|||";

function encodeShippingInNotes(internalNotes: string | null | undefined, shippingType?: string | null, shippingCost?: number | null): string | null {
  const base = (internalNotes || "").replace(/\|\|\|FRETE:.*?\|\|\|/g, "").trimEnd();
  if (!shippingType) return base || null;
  const suffix = `${SHIPPING_MARKER}${shippingType}:${shippingCost ?? ""}${SHIPPING_END}`;
  return base ? `${base} ${suffix}` : suffix;
}

// ── BitrixProductId serialization helpers ─────────────────────────────────────
// The external CRM's quote_items table doesn't have a bitrix_product_id column.
// We encode it into the item's notes field with a special marker.
const BPID_MARKER = "|||BPID:";
const BPID_END = "|||";

function encodeBitrixProductIdInNotes(notes: string | null | undefined, bitrixProductId?: string | number | null): string | null {
  const base = (notes || "").replace(/\|\|\|BPID:[^|]*\|\|\|/g, "").trimEnd();
  if (!bitrixProductId) return base || null;
  const suffix = `${BPID_MARKER}${bitrixProductId}${BPID_END}`;
  return base ? `${base} ${suffix}` : suffix;
}

function decodeBitrixProductIdFromNotes(notes: string | null | undefined): { cleanNotes: string | null; bitrixProductId: string | null } {
  const raw = notes || "";
  const match = raw.match(/\|\|\|BPID:([^|]*)\|\|\|/);
  if (!match) return { cleanNotes: raw || null, bitrixProductId: null };
  const bitrixProductId = match[1] || null;
  const cleanNotes = raw.replace(/\s*\|\|\|BPID:[^|]*\|\|\|/g, "").trim() || null;
  return { cleanNotes, bitrixProductId };
}

function decodeShippingFromNotes(internalNotes: string | null | undefined): { cleanNotes: string | null; shippingType: string | null; shippingCost: number | null } {
  const raw = internalNotes || "";
  const match = raw.match(/\|\|\|FRETE:(.*?):(.*?)\|\|\|/);
  if (!match) return { cleanNotes: raw || null, shippingType: null, shippingCost: null };
  const shippingType = match[1] || null;
  const shippingCost = match[2] ? parseFloat(match[2]) : null;
  const cleanNotes = raw.replace(/\s*\|\|\|FRETE:.*?\|\|\|/g, "").trim() || null;
  return { cleanNotes, shippingType, shippingCost };
}
// ─────────────────────────────────────────────────────────────────────────────


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

  // Fetch all quotes for current user from external CRM
  const fetchQuotes = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const data = await selectCrm<any>("quotes", {
        orderBy: { column: "created_at", ascending: false },
        limit: 500,
      });

      setQuotes(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar orçamentos";
      setError(message);
      toast.error("Erro ao carregar orçamentos", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single quote with items from external CRM
  const fetchQuote = async (quoteId: string): Promise<Quote | null> => {
    setIsLoading(true);

    try {
      const quoteData = await selectCrmById<any>("quotes", quoteId);
      if (!quoteData) return null;

      // Fetch items
      const itemsData = await selectCrm<any>("quote_items", {
        filters: { quote_id: quoteId },
        orderBy: { column: "sort_order", ascending: true },
        limit: 200,
      });

      // Fetch personalizations for all items
      const itemIds = itemsData.map((i: any) => i.id);
      let allPersonalizations: any[] = [];
      if (itemIds.length > 0) {
        allPersonalizations = await selectCrm<any>("quote_item_personalizations", {
          filters: { quote_item_id: { in: itemIds } },
          limit: 500,
        });
      }

      // Map personalizations to items + decode bitrix_product_id from notes
      const items: QuoteItem[] = itemsData.map((item: any) => {
        const { cleanNotes: itemCleanNotes, bitrixProductId } = decodeBitrixProductIdFromNotes(item.notes);
        return {
          ...item,
          notes: itemCleanNotes,
          bitrix_product_id: bitrixProductId,
          personalizations: allPersonalizations.filter(p => p.quote_item_id === item.id),
        };
      });

      // Decode shipping data from internal_notes
      const { cleanNotes, shippingType, shippingCost } = decodeShippingFromNotes(quoteData.internal_notes);

      return {
        ...quoteData,
        internal_notes: cleanNotes,
        shipping_type: shippingType,
        shipping_cost: shippingCost,
        items,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar orçamento";
      toast.error("Erro ao carregar orçamento", { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Create new quote in external CRM
  const createQuote = async (quote: Partial<Quote>, items: QuoteItem[]): Promise<Quote | null> => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return null;
    }

    setIsLoading(true);

    try {
      // Calculate totals (including personalization costs)
      const subtotal = items.reduce((sum, item) => {
        const baseTotal = item.quantity * item.unit_price;
        const persTotal = (item.personalizations || []).reduce(
          (pSum, p) => pSum + (p.total_cost || 0), 0
        );
        return sum + baseTotal + persTotal;
      }, 0);
      const discountAmount = quote.discount_percent 
        ? subtotal * (quote.discount_percent / 100) 
        : (quote.discount_amount || 0);
      // Shipping added AFTER discount — not subject to global discount
      const shippingCostValue = (quote.shipping_type === "fob" || quote.shipping_type === "fob_pre")
        ? (quote.shipping_cost || 0)
        : 0;
      const total = subtotal - discountAmount + shippingCostValue;

      // Encode shipping into internal_notes (external CRM has no shipping columns)
      const encodedInternalNotes = encodeShippingInNotes(quote.internal_notes, quote.shipping_type, quote.shipping_cost);

      // Insert quote via CRM bridge - quote_number is auto-generated by trigger on external DB
      const insertedQuotes = await insertCrm<any>("quotes", {
        quote_number: ``, // Temporary placeholder, overwritten by trigger on external DB
        client_id: quote.client_id || null,
        client_name: quote.client_name || null,
        client_email: (quote as any).client_email || null,
        client_phone: (quote as any).client_phone || null,
        client_company: (quote as any).client_company || null,
        client_cnpj: (quote as any).client_cnpj || null,
        seller_id: user.id,
        status: quote.status || "draft",
        subtotal,
        discount_percent: quote.discount_percent || 0,
        discount_amount: discountAmount,
        total,
        payment_terms: quote.payment_terms || null,
        delivery_time: quote.delivery_time || null,
        notes: quote.notes || null,
        internal_notes: encodedInternalNotes,
        valid_until: quote.valid_until || null,
      });

      const newQuote = insertedQuotes[0];
      if (!newQuote) throw new Error("Falha ao inserir orçamento no CRM");

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
          // Encode bitrix_product_id into notes (CRM table doesn't have this column)
          notes: encodeBitrixProductIdInNotes(item.notes, item.bitrix_product_id),
          sort_order: index,
        }));

        const insertedItems = await insertCrm<any>("quote_items", itemsToInsert);

        // Insert personalizations for each item
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const insertedItem = insertedItems?.[i];

          if (item.personalizations?.length && insertedItem) {
            const personalizationsToInsert = item.personalizations.map(p => ({
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

            await insertCrm("quote_item_personalizations", personalizationsToInsert);
          }
        }
      }

      // Log history
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

  // Helper to log quote history in CRM
  const logQuoteHistory = async (
    quoteId: string,
    action: string,
    description: string,
    options?: {
      fieldChanged?: string;
      oldValue?: string;
      newValue?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    if (!user) return;
    try {
      await insertCrm("quote_history", {
        quote_id: quoteId,
        user_id: user.id,
        action,
        description,
        field_changed: options?.fieldChanged || null,
        old_value: options?.oldValue || null,
        new_value: options?.newValue || null,
        metadata: options?.metadata || {},
      });
    } catch (err) {
      console.error("Error logging history:", err);
    }
  };

  // Update quote status in CRM
  const updateQuoteStatus = async (quoteId: string, status: Quote["status"]): Promise<boolean> => {
    try {
      const currentQuote = quotes.find(q => q.id === quoteId);
      const oldStatus = currentQuote?.status || "draft";

      await updateCrm("quotes", quoteId, { status });

      const statusLabels: Record<string, string> = {
        draft: "Rascunho",
        pending: "Pendente",
        sent: "Enviado",
        approved: "Aprovado",
        rejected: "Rejeitado",
        expired: "Expirado",
      };
      await logQuoteHistory(
        quoteId,
        "status_changed",
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

  // Delete quote from CRM (cascade handled by DB ON DELETE CASCADE)
  const deleteQuote = async (quoteId: string): Promise<boolean> => {
    try {
      // The external DB has ON DELETE CASCADE, so deleting the quote
      // automatically removes items, personalizations, history, and tokens
      await deleteCrm("quotes", quoteId);

      // Also clean up local follow_up_reminders if any
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

  // Update existing quote in CRM
  const updateQuote = async (quoteId: string, quote: Partial<Quote>, items: QuoteItem[]): Promise<Quote | null> => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return null;
    }

    setIsLoading(true);

    try {
      // Calculate totals
      const subtotal = items.reduce((sum, item) => {
        const baseTotal = item.quantity * item.unit_price;
        const persTotal = (item.personalizations || []).reduce(
          (pSum, p) => pSum + (p.total_cost || 0), 0
        );
        return sum + baseTotal + persTotal;
      }, 0);
      const discountAmount = quote.discount_percent 
        ? subtotal * (quote.discount_percent / 100) 
        : (quote.discount_amount || 0);
      // Shipping added AFTER discount — not subject to global discount
      const shippingCostValue = (quote.shipping_type === "fob" || quote.shipping_type === "fob_pre")
        ? (quote.shipping_cost || 0)
        : 0;
      const total = subtotal - discountAmount + shippingCostValue;

      // Encode shipping into internal_notes (external CRM has no shipping columns)
      const encodedInternalNotes = encodeShippingInNotes(quote.internal_notes, quote.shipping_type, quote.shipping_cost);

      // Update quote in CRM
      const updatedQuotes = await updateCrm<any>("quotes", quoteId, {
        client_id: quote.client_id || null,
        client_name: quote.client_name || null,
        client_email: (quote as any).client_email || null,
        client_phone: (quote as any).client_phone || null,
        client_company: (quote as any).client_company || null,
        client_cnpj: (quote as any).client_cnpj || null,
        status: quote.status,
        subtotal,
        discount_percent: quote.discount_percent || 0,
        discount_amount: discountAmount,
        total,
        payment_terms: quote.payment_terms || null,
        delivery_time: quote.delivery_time || null,
        notes: quote.notes || null,
        internal_notes: encodedInternalNotes,
        valid_until: quote.valid_until || null,
      });

      const updatedQuote = updatedQuotes[0];

      // Delete existing items (cascade deletes personalizations)
      await deleteCrmByFilter("quote_items", { quote_id: quoteId });

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
          // Encode bitrix_product_id into notes (CRM table doesn't have this column)
          notes: encodeBitrixProductIdInNotes(item.notes, item.bitrix_product_id),
          sort_order: index,
        }));

        const insertedItems = await insertCrm<any>("quote_items", itemsToInsert);

        // Insert personalizations
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const insertedItem = insertedItems?.[i];

          if (item.personalizations?.length && insertedItem) {
            const personalizationsToInsert = item.personalizations.map(p => ({
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

            await insertCrm("quote_item_personalizations", personalizationsToInsert);
          }
        }
      }

      // Log history
      await logQuoteHistory(
        quoteId,
        "updated",
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
      if (!original) {
        throw new Error("Orçamento não encontrado");
      }

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
        personalizations: item.personalizations?.map((p) => ({
          technique_id: p.technique_id,
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
          status: "draft",
          discount_percent: original.discount_percent,
          discount_amount: original.discount_amount,
          notes: original.notes,
          internal_notes: original.internal_notes ? `[Duplicado de ${original.quote_number}] ${original.internal_notes}` : `Duplicado de ${original.quote_number}`,
          valid_until: original.valid_until,
        },
        items
      );

      if (newQuote) {
        await logQuoteHistory(
          newQuote.id,
          "created",
          `Orçamento duplicado a partir de ${original.quote_number}`
        );
        
        toast.success("Orçamento duplicado com sucesso!", {
          description: `Novo número: ${newQuote.quote_number}`,
        });
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

      toast.success("Orçamento sincronizado com Bitrix!", {
        description: `Deal ID: ${data.bitrix_deal_id || "N/A"}`,
      });

      await fetchQuotes();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao sincronizar";
      toast.error("Erro ao sincronizar com Bitrix", { description: message });
      return false;
    }
  };

  // Test N8N webhook connection
  const testWebhookConnection = async (): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("quote-sync", {
        body: { action: "test_webhook", data: {} },
      });

      if (fnError) throw new Error(fnError.message);
      
      if (data.success) {
        toast.success("Conexão com N8N estabelecida!");
        return true;
      } else {
        toast.error("Falha na conexão com N8N");
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao testar conexão";
      toast.error("Erro ao testar webhook", { description: message });
      return false;
    }
  };

  // Fetch personalization techniques
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
  };
}
