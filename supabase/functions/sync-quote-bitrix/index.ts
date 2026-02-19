import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Full CORS headers required by Supabase web clients
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      quote,
      proposalData,
      pdfUrl,           // public storage URL of the PDF (no base64 in memory)
      filename,
      bitrixCompanyId,  // companies.bitrix_id — numeric string (e.g. "125240")
      sellerEmail,      // authenticated user email for seller mapping
    } = body;

    // ── 1. Validate webhook URL ──────────────────────────────────────────────
    const webhookUrl = Deno.env.get("N8N_QUOTE_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("N8N_QUOTE_WEBHOOK_URL não configurado nos secrets");
    }

    // ── 2. Resolve seller_id ─────────────────────────────────────────────────
    // Priority: email passed from frontend → undefined (n8n test mode uses default)
    const sellerId = sellerEmail ? SELLER_EMAIL_MAP[sellerEmail] : undefined;
    if (sellerEmail && sellerId === undefined) {
      console.warn(`sellerEmail "${sellerEmail}" não encontrado no SELLER_EMAIL_MAP — orçamento enviado sem seller_id`);
    }

    // ── 3. Resolve company_id (Bitrix numeric) ───────────────────────────────
    // bitrixCompanyId comes from companies.bitrix_id (string like "125240")
    const companyId = bitrixCompanyId ? parseInt(bitrixCompanyId, 10) : null;
    if (!companyId) {
      console.warn("No Bitrix company_id resolved — proceeding without it (test mode)");
    }

    // ── 4. REMOVIDO: bitrix_quote_id não é mais enviado no payload ───────────
    // Spec v3: o n8n busca pelo quote_id (código interno) no Bitrix e resolve sozinho
    // se deve criar ou atualizar. O gifts-store não precisa manter o ID do Bitrix.

    // ── 5. Build products array ──────────────────────────────────────────────
    // offer_id is null if not mapped — n8n handles this gracefully
    const rawItems = proposalData?.items || [];

    // ── Spec §3: excluir itens sem bitrix_product_id (ainda não importados no Bitrix24) ──
    const itemsValidos = rawItems.filter((item: any) => !!item.bitrix_product_id);
    const itemsExcluidos = rawItems.length - itemsValidos.length;
    if (itemsExcluidos > 0) {
      console.warn(`${itemsExcluidos} item(ns) excluído(s) do payload por não ter bitrix_product_id`);
    }
    if (itemsValidos.length === 0) {
      throw new Error("Nenhum produto da proposta possui ID no Bitrix24 (bitrix_product_id nulo em todos os itens). Aguarde a importação do catálogo.");
    }

    // Spec v3.1 §REGRA DE PREÇO: desconto do orçamento (0–100)
    // Guard: garante que discount_percent seja numérico válido (evita NaN propagado)
    const rawDiscount = Number(quote?.discount_percent ?? 0);
    const discountRate = Number.isFinite(rawDiscount) ? rawDiscount / 100 : 0;

    const products = itemsValidos.map((item: any) => {
      // Spec §6.2: offer_id = product_variants.bitrix_product_id (obrigatório)
      const offerId = Number(item.bitrix_product_id);
      // Guard: rejeita offer_id inválido (NaN, 0, negativo)
      if (!Number.isFinite(offerId) || offerId <= 0) {
        console.warn(`Item ignorado: bitrix_product_id inválido ("${item.bitrix_product_id}") — produto: ${item.name || item.product_name}`);
        return null;
      }

      // Spec §6.2: product_name = nome do produto + " - " + cor
      const baseName = item.name || item.product_name || "Produto";
      const colorSuffix = item.color ? ` - ${item.color}` : "";
      const productName = `${baseName}${colorSuffix}`;

      // Correção 3: SKU = supplier_sku da variante (ex: "94256-103")
      // Prioridade: supplier_sku > composedCode > sku > product_sku
      // NÃO usar `${sku}-${color_name}` — esse formato está errado
      const sku = item.supplier_sku || item.composedCode || item.sku || item.product_sku || "";

      // Guard: qty deve ser inteiro positivo
      const qty = Number(item.quantity ?? 1);
      if (!Number.isFinite(qty) || qty <= 0) {
        console.warn(`Item ignorado: quantity inválida (${item.quantity}) — produto: ${baseName}`);
        return null;
      }

      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);

      // Spec §6.3: gravação (engraving) — apenas se o produto tiver personalização
      const pers = item.personalizations?.[0];

      // Spec v3.1 §REGRA DE PREÇO:
      // price = (preço_produto + gravação_unitária) × (1 - desconto%)
      // FIX: usar != null em vez de ?? para suportar total_cost = 0 como valor válido
      const engravingTotal = pers
        ? (pers.total_cost != null ? Number(pers.total_cost) : Number(pers.unit_cost ?? 0) * qty)
        : 0;
      const engravingUnit = qty > 0 ? engravingTotal / qty : 0;
      const subtotalUnit = unitPrice + engravingUnit;
      const finalPrice = Math.round(subtotalUnit * (1 - discountRate) * 100) / 100;

      const product: any = {
        offer_id: offerId,
        product_name: productName,
        sku,
        price: finalPrice,
        quantity: qty,
      };

      if (pers) {
        // Spec §6.3: size = "LxHcm" ou "Xcm²"
        // FIX: usar != null para suportar dimensões com valor 0 (falsy)
        const sizeStr = pers.width_cm != null && pers.height_cm != null
          ? `${pers.width_cm}x${pers.height_cm}cm`
          : pers.area_cm2 != null
            ? `${pers.area_cm2}cm²`
            : "";
        product.engraving = {
          type: pers.technique_name || "Personalização",
          unit_price: Math.round(engravingUnit * 100) / 100,
          total_price: Math.round(engravingTotal * 100) / 100,
          size: sizeStr,
        };
      }

      return product;
    }).filter((p: any) => p !== null); // Remove itens rejeitados (offerId/qty inválidos)

    // Guard pós-filtro: pode sobrar 0 itens válidos após rejeições de offerId/qty
    if (products.length === 0) {
      throw new Error("Todos os itens foram rejeitados por dados inválidos (offer_id ou quantity). Verifique os dados dos produtos.");
    }

    // ── 6. Assemble final payload ────────────────────────────────────────────
    const clientName =
      proposalData?.client?.company ||
      proposalData?.client?.name ||
      quote?.client_company ||
      "Cliente";

    const payload: Record<string, unknown> = {
      title: `Orçamento - ${clientName}`,
      products,
    };

    // Only include optional fields when resolved
    if (sellerId) payload.seller_id = sellerId;
    if (companyId) payload.company_id = companyId;

    // Spec v3: quote_id = código interno do gifts-store (ex: "10001/26")
    // O n8n busca no campo UF_CRM_QUOTE_1771506036 para criar ou atualizar
    // NÃO usar bitrix_quote_id numérico — o workflow resolve sozinho pelo código
    const internalQuoteId = (quote?.quote_number || "").replace(/\s+/g, "");
    if (internalQuoteId) payload.quote_id = internalQuoteId;

    // Contact (numeric Bitrix contact_id if available)
    if (quote?.bitrix_contact_id) {
      const cId = parseInt(String(quote.bitrix_contact_id), 10);
      if (!isNaN(cId)) payload.contact_id = cId;
    }

    // Attach PDF URL — n8n downloads the file directly (avoids memory limits)
    if (pdfUrl && filename) {
      payload.pdf = { filename, url: pdfUrl };
    }

    // ── 7. Log (no sensitive content) ───────────────────────────────────────
    console.log("Sending to n8n:", JSON.stringify({
      ...payload,
      pdf: payload.pdf ? { filename: (payload.pdf as any).filename, url: (payload.pdf as any).url } : undefined,
      products_count: products.length,
      seller_email_input: sellerEmail,
      bitrix_company_id_input: bitrixCompanyId,
    }));

    // ── 8. Call n8n webhook ──────────────────────────────────────────────────
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let result: unknown;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      // n8n sometimes returns plain text on error
      const text = await response.text();
      result = { raw: text };
    }

    console.log("n8n response status:", response.status, "body:", JSON.stringify(result));

    if (!response.ok) {
      const errMsg = (result as any)?.error || (result as any)?.raw || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("sync-quote-bitrix error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
