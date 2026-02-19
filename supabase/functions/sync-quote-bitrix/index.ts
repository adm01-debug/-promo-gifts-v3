import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { quote, proposalData, pdfBase64, filename } = body;

    const webhookUrl = Deno.env.get("N8N_QUOTE_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("N8N_QUOTE_WEBHOOK_URL não configurado");
    }

    // Build the payload according to the Bitrix24 API spec
    const products = (proposalData?.items || []).map((item: any) => {
      const product: any = {
        offer_id: item.offerId || null, // will be null if not mapped
        product_name: item.name || item.product_name || "Produto",
        sku: item.sku || item.composedCode || "",
        price: item.unitPrice || item.unit_price || 0,
        quantity: item.quantity || 1,
      };

      // Map first personalization as engraving if present
      const personalization = item.personalizations?.[0];
      if (personalization) {
        const sizeStr = personalization.width_cm && personalization.height_cm
          ? `${personalization.width_cm}x${personalization.height_cm}cm`
          : personalization.area_cm2
            ? `${personalization.area_cm2}cm²`
            : "";
        product.engraving = {
          type: personalization.technique_name || "Personalização",
          unit_price: personalization.unit_cost || 0,
          total_price: personalization.total_cost || (personalization.unit_cost || 0) * (item.quantity || 1),
          size: sizeStr,
        };
      }

      return product;
    });

    // Build seller_id from seller info if available
    // Mapping: seller email → Bitrix24 seller_id
    const sellerEmailMap: Record<string, number> = {
      "comercial01@promobrindes.com.br": 8,
      "henrique.silva@promobrindes.com.br": 10,
      "comercial03@promobrindes.com.br": 16,
      "comercial04@promobrindes.com.br": 5174,
      "comercial06@promobrindes.com.br": 5176,
      "comercial05@promobrindes.com.br": 5180,
      "comercial07@promobrindes.com.br": 16558,
    };

    const sellerEmail = proposalData?.seller?.email || quote?.seller_email || "";
    const sellerId = sellerEmailMap[sellerEmail] || undefined;

    // Extract Bitrix24 company_id from quote metadata
    const companyId = quote?.bitrix_company_id || quote?.client_bitrix_id || null;
    const contactId = quote?.bitrix_contact_id || null;
    const bitrixQuoteId = quote?.bitrix_quote_id || null;

    const payload: any = {
      title: `Orçamento - ${proposalData?.client?.company || proposalData?.client?.name || quote?.client_company || "Cliente"}`,
      company_id: companyId,
      products,
    };

    if (sellerId) payload.seller_id = sellerId;
    if (contactId) payload.contact_id = contactId;
    if (bitrixQuoteId) payload.quote_id = bitrixQuoteId;

    // Attach PDF if provided
    if (pdfBase64 && filename) {
      payload.pdf = {
        filename,
        content: pdfBase64,
      };
    }

    console.log("Sending payload to n8n:", JSON.stringify({ ...payload, pdf: payload.pdf ? { filename: payload.pdf.filename, content: "[base64...]" } : undefined }));

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("n8n response:", result);

    if (!response.ok) {
      throw new Error(result.error || `Erro HTTP ${response.status}`);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("sync-quote-bitrix error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
