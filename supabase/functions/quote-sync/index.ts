/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const n8nWebhookUrl = Deno.env.get("N8N_QUOTE_WEBHOOK_URL");

interface QuoteData {
  id: string;
  quote_number: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  seller_id?: string;
  seller_name?: string;
  status: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  notes?: string;
  valid_until?: string;
  items: QuoteItemData[];
  created_at: string;
}

interface QuoteItemData {
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  color_name?: string;
  personalizations: PersonalizationData[];
}

interface PersonalizationData {
  technique_name: string;
  colors_count: number;
  positions_count: number;
  total_cost: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, data } = await req.json();
    console.log(`Quote sync action: ${action}`, data);

    switch (action) {
      case "sync_quote": {
        // Sync a single quote to Bitrix via N8N
        const { quoteId } = data;

        if (!quoteId) {
          throw new Error("quoteId is required");
        }

        if (!n8nWebhookUrl) {
          throw new Error("N8N_QUOTE_WEBHOOK_URL not configured");
        }

        // Fetch quote with all related data
        const quoteData = await fetchQuoteData(supabase, quoteId);

        if (!quoteData) {
          throw new Error("Quote not found");
        }

        // Send to N8N webhook
        const n8nResponse = await sendToN8N(quoteData);
        // Also sync to SalesPro pipeline
        await sendToSalesPro(quoteData);

        // Update quote sync status
        const { error: updateError } = await supabase
          .from("quotes")
          .update({
            synced_to_bitrix: true,
            synced_at: new Date().toISOString(),
            bitrix_deal_id: n8nResponse.bitrix_deal_id || null,
            bitrix_quote_id: n8nResponse.bitrix_quote_id || null,
          })
          .eq("id", quoteId);

        if (updateError) {
          console.error("Error updating quote sync status:", updateError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Quote synced successfully",
            bitrix_deal_id: n8nResponse.bitrix_deal_id,
            bitrix_quote_id: n8nResponse.bitrix_quote_id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "sync_all_pending": {
        // Sync all unsent quotes
        const { data: pendingQuotes, error: fetchError } = await supabase
          .from("quotes")
          .select("id")
          .eq("synced_to_bitrix", false)
          .in("status", ["sent", "approved"]);

        if (fetchError) throw fetchError;

        const results = [];
        for (const quote of pendingQuotes || []) {
          try {
            const quoteData = await fetchQuoteData(supabase, quote.id);
            if (quoteData) {
              const response = await sendToN8N(quoteData);

              await supabase
                .from("quotes")
                .update({
                  synced_to_bitrix: true,
                  synced_at: new Date().toISOString(),
                  bitrix_deal_id: response.bitrix_deal_id || null,
                })
                .eq("id", quote.id);

              results.push({ id: quote.id, success: true });
            }
          } catch (syncErr) {
            const errorMessage = syncErr instanceof Error ? syncErr.message : "Unknown error";
            console.error(`Error syncing quote ${quote.id}:`, syncErr);
            results.push({ id: quote.id, success: false, error: errorMessage });
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            synced: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            results,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "test_webhook": {
        // Test the N8N webhook connection
        if (!n8nWebhookUrl) {
          throw new Error("N8N_QUOTE_WEBHOOK_URL not configured");
        }

        const testPayload = {
          test: true,
          timestamp: new Date().toISOString(),
          message: "Test from Lovable quote-sync function",
        };

        const response = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testPayload),
        });

        return new Response(
          JSON.stringify({
            success: response.ok,
            status: response.status,
            message: response.ok ? "Webhook connection successful" : "Webhook connection failed",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Quote sync error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchQuoteData(supabase: any, quoteId: string): Promise<QuoteData | null> {
  // Fetch quote with client info
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select(
      `
      *,
      bitrix_clients (
        id,
        bitrix_id,
        name,
        email,
        phone,
        ramo,
        nicho
      ),
      profiles!quotes_seller_id_fkey (
        full_name
      )
    `,
    )
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    console.error("Error fetching quote:", quoteError);
    return null;
  }

  // Fetch quote items with personalizations
  const { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select(
      `
      *,
      quote_item_personalizations (
        *,
        personalization_techniques (
          name,
          code
        )
      )
    `,
    )
    .eq("quote_id", quoteId)
    .order("sort_order");

  if (itemsError) {
    console.error("Error fetching quote items:", itemsError);
  }

  // Format the data for N8N/Bitrix
  const formattedItems: QuoteItemData[] = (items || []).map((item: any) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.product_sku,
    quantity: item.quantity,
    unit_price: Number(item.unit_price),
    subtotal: Number(item.subtotal),
    color_name: item.color_name,
    personalizations: (item.quote_item_personalizations || []).map((p: any) => ({
      technique_name: p.personalization_techniques?.name || "Unknown",
      colors_count: p.colors_count,
      positions_count: p.positions_count,
      total_cost: Number(p.total_cost),
    })),
  }));

  return {
    id: quote.id,
    quote_number: quote.quote_number,
    client_id: quote.bitrix_clients?.bitrix_id || quote.client_id,
    client_name: quote.bitrix_clients?.name,
    client_email: quote.bitrix_clients?.email,
    client_phone: quote.bitrix_clients?.phone,
    seller_id: quote.seller_id,
    seller_name: quote.profiles?.full_name,
    status: quote.status,
    subtotal: Number(quote.subtotal),
    discount_percent: Number(quote.discount_percent),
    discount_amount: Number(quote.discount_amount),
    total: Number(quote.total),
    notes: quote.notes,
    valid_until: quote.valid_until,
    items: formattedItems,
    created_at: quote.created_at,
  };
}

async function sendToN8N(quoteData: QuoteData): Promise<any> {
  const webhookUrl = Deno.env.get("N8N_QUOTE_WEBHOOK_URL");

  if (!webhookUrl) {
    throw new Error("N8N_QUOTE_WEBHOOK_URL not configured");
  }

  console.log("Sending quote to N8N:", quoteData.quote_number);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create_or_update_quote",
      quote: quoteData,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("N8N webhook error:", errorText);
    throw new Error(`N8N webhook failed: ${response.status} - ${errorText}`);
  }

  try {
    return await response.json();
  } catch {
    // N8N might return empty response on success
    return { success: true };
  }
}

async function sendToSalesPro(quoteData: QuoteData): Promise<void> {
  const webhookUrl = Deno.env.get("SALESPRO_WEBHOOK_URL");
  const apiKey = Deno.env.get("QUOTE_SYNC_API_KEY");

  if (!webhookUrl) {
    console.warn("SALESPRO_WEBHOOK_URL not configured, skipping SalesPro sync");
    return;
  }

  if (!apiKey) {
    console.warn("QUOTE_SYNC_API_KEY not configured, skipping SalesPro sync");
    return;
  }

  console.log("Sending quote to SalesPro:", quoteData.quote_number);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        action: "create_or_update_quote",
        quote: quoteData,
        source: "gifts-store",
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SalesPro webhook error:", response.status, errorText);
    } else {
      console.log("SalesPro sync successful for quote:", quoteData.quote_number);
      try {
        const result = await response.json();
        console.log("SalesPro response:", JSON.stringify(result));
      } catch {
        await response.text();
      }
    }
  } catch (err) {
    console.error("SalesPro sync failed:", err);
  }
}
