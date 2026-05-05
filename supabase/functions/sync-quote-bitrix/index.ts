import { getCorsHeaders } from '../_shared/cors.ts';
import { z } from '../_shared/zod-validate.ts';
import { fetchWithBreaker, CircuitOpenError, circuitOpenResponse } from '../_shared/external-fetch.ts';
import { authenticateRequest, authErrorResponse } from "../_shared/auth.ts";

// Mapping: seller email → Bitrix24 numeric seller_id
const SELLER_EMAIL_MAP: Record<string, number> = {
  "comercial01@promobrindes.com.br": 8,
  "henrique.silva@promobrindes.com.br": 10,
  "comercial03@promobrindes.com.br": 16,
  "comercial04@promobrindes.com.br": 5174,
  "comercial06@promobrindes.com.br": 5176,
  "comercial05@promobrindes.com.br": 5180,
  "comercial07@promobrindes.com.br": 16558,
};

const SyncQuoteBitrixSchema = z.object({
  quote: z.record(z.any()).optional(),
  proposalData: z.record(z.any()).optional(),
  pdfUrl: z.string().url().max(2000).optional(),
  filename: z.string().max(500).optional(),
  bitrixCompanyId: z.string().max(50).optional(),
  sellerEmail: z.string().email().max(255).optional(),
  shippingType: z.string().max(50).optional(),
  shippingCost: z.number().nonnegative().optional(),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate Request
    const auth = await authenticateRequest(req);
    console.log(`[sync-quote-bitrix] User ${auth.userId} authenticating sync`);

    let rawBody: unknown;
    try { rawBody = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = SyncQuoteBitrixSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      quote,
      proposalData,
      pdfUrl,
      filename,
      bitrixCompanyId,
      sellerEmail,
      shippingType,
      shippingCost,
    } = parsed.data;

    // ── 2. Validate webhook URL ──────────────────────────────────────────────
    const webhookUrl = Deno.env.get("N8N_QUOTE_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("N8N_QUOTE_WEBHOOK_URL não configurado nos secrets");
    }

    // ── 3. Resolve seller_id ─────────────────────────────────────────────────
    const sellerId = sellerEmail ? SELLER_EMAIL_MAP[sellerEmail] : undefined;
    if (sellerEmail && sellerId === undefined) {
      console.warn(`sellerEmail "${sellerEmail}" não encontrado no SELLER_EMAIL_MAP`);
    }

    // ── 4. Resolve company_id (Bitrix numeric) — OBRIGATÓRIO ────────────────
    const companyId = bitrixCompanyId ? parseInt(bitrixCompanyId, 10) : null;
    if (!companyId || !Number.isFinite(companyId) || companyId <= 0) {
      throw new Error("company_id (Bitrix) é obrigatório.");
    }

    // ── 5. Build products array ──────────────────────────────────────────────
    const rawItems = proposalData?.items || [];
    const itemsValidos = rawItems.filter((item: any) => !!item.bitrix_product_id);
    
    if (itemsValidos.length === 0) {
      throw new Error("Nenhum produto da proposta possui ID no Bitrix24.");
    }

    const products = itemsValidos.map((item: any) => {
      const offerId = Number(item.bitrix_product_id);
      if (!Number.isFinite(offerId) || offerId <= 0) return null;

      const baseName = item.name || item.product_name || "Produto";
      const colorSuffix = item.color ? ` - ${item.color}` : "";
      const productName = `${baseName}${colorSuffix}`;
      const sku = item.supplier_sku || item.composedCode || item.sku || item.product_sku || "";
      const qty = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);

      const product: any = {
        offer_id: offerId,
        product_name: productName,
        sku,
        price: Math.round(unitPrice * 10000) / 10000,
        quantity: qty,
      };

      const allPers = item.personalizations || [];
      if (allPers.length > 0) {
        const engravings = allPers.map((pers: any) => {
          const engravingTotal = Number(pers.total_cost ?? 0);
          const engravingUnit = qty > 0 ? Math.round((engravingTotal / qty) * 100) / 100 : 0;
          const setupPrice = Number(pers.setup_cost ?? 0);

          let sizeStr = "";
          if (pers.width_cm != null && pers.height_cm != null) {
            sizeStr = `${pers.width_cm}x${pers.height_cm}cm`;
          }

          let engravingType = pers.technique_name || "Personalização";
          const engravingTotalRounded = engravingUnit * qty;

          return {
            type: engravingType,
            unit_price: engravingUnit,
            total_price: Math.round(engravingTotalRounded * 100) / 100,
            setup_price: setupPrice,
            size: sizeStr,
          };
        });

        product.engraving = engravings[0];
        if (engravings.length > 1) product.engravings = engravings;
      }

      return product;
    }).filter((p: any) => p !== null);

    // ── 6. Assemble final payload ────────────────────────────────────────────
    const rawClientName = proposalData?.client?.company || proposalData?.client?.name || quote?.client_company || "Cliente";
    const clientName = rawClientName.replace(/\s*-\s*\d+\s*$/, "").trim();

    const payload: Record<string, unknown> = {
      title: `Orçamento - ${clientName} - ${companyId}`,
      company_id: companyId,
      products,
    };

    if (sellerId) payload.seller_id = sellerId;
    const internalQuoteId = (quote?.quote_number || "").replace(/\s+/g, "");
    if (internalQuoteId) payload.quote_id = internalQuoteId;

    const rawDiscount = Number(quote?.discount_percent ?? 0);
    if (rawDiscount > 0) payload.discount_percentage = rawDiscount;

    if (shippingType) {
      const typeMap: Record<string, string> = { cif: "CIF", fob: "FOB", fob_pre: "FOB_PRE" };
      payload.freight = { 
        type: typeMap[shippingType.toLowerCase()] || "CIF", 
        value: Number(shippingCost) || 0 
      };
    }

    if (quote?.bitrix_contact_id) payload.contact_id = parseInt(String(quote.bitrix_contact_id), 10);
    if (pdfUrl && filename) payload.pdf = { filename, url: pdfUrl };

    // ── 7. Call n8n ──────────────────────────────────────────────────────────
    const response = await fetchWithBreaker("bitrix", webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({ success: response.ok }));

    if (!response.ok) {
      throw new Error((result as any)?.error || `HTTP ${response.status}`);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    if (error instanceof CircuitOpenError) return circuitOpenResponse(error, corsHeaders);
    if ((error as any)?.status) return authErrorResponse(error, corsHeaders);
    
    console.error("sync-quote-bitrix error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});