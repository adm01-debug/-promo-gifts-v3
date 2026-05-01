import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "../_shared/zod-validate.ts";
import { runBotProtection } from "../_shared/bot-protection.ts";
import { resolveCredential } from "../_shared/credentials.ts";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = buildPublicCorsHeaders();

const GetQuoteSchema = z.object({
  action: z.enum(["get_quote", "respond", "submit_response"]),
  token: z.string().min(1, "Token é obrigatório").max(200),
  response: z.enum(["approved", "rejected"]).optional(),
  response_notes: z.string().max(2000).optional(),
  signer_name: z.string().min(3).max(200).optional(),
  signer_document: z.string().min(11).max(20).optional(),
});

// SHA-256 helper for signature integrity
async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getClientIpFromReq(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Anti-scraping: 30 req/min por IP, bloqueio 1h. Protege contra brute-force de tokens.
    const protection = await runBotProtection(req, {
      endpoint: 'quote-public-view',
      maxRequests: 30,
      windowSeconds: 60,
      blockSeconds: 3600,
      allowSearchBots: false,  // orçamentos não devem ser indexados
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    // Safely parse body — GET requests have no body
    let rawBody: Record<string, unknown> = {};
    if (req.method === "POST" || req.method === "PUT") {
      try {
        rawBody = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Corpo da requisição inválido. Envie um JSON com action e token." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // For GET requests, try to read token from query params
      const url = new URL(req.url);
      const tokenParam = url.searchParams.get("token");
      if (tokenParam) {
        rawBody = { action: "get_quote", token: tokenParam };
      } else {
        return new Response(
          JSON.stringify({ error: "Use POST com JSON body ou GET com ?token=..." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const parsed = GetQuoteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, token, response, response_notes, signer_name, signer_document } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // CRM bridge credentials — DB-first via integration_credentials,
    // env fallback via aliases. O `!` antigo causava throw quando o
    // env não estava configurado mesmo com credenciais salvas pela UI.
    const [crmUrlRes, crmSvcRes, crmAnonRes] = await Promise.all([
      resolveCredential("EXTERNAL_CRM_URL"),
      resolveCredential("EXTERNAL_CRM_SERVICE_ROLE_KEY"),
      resolveCredential("EXTERNAL_CRM_ANON_KEY"),
    ]);
    const crmUrl = crmUrlRes.value;
    const crmKey = crmSvcRes.value ?? crmAnonRes.value;
    if (!crmUrl || !crmKey) {
      return new Response(
        JSON.stringify({ error: "CRM database credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const crmClient = createClient(crmUrl, crmKey);

    const clientIp = getClientIpFromReq(req);
    const clientUa = req.headers.get("user-agent") || null;

    if (action === "get_quote") {
      // Fetch token record
      const { data: tokenData, error: tokenError } = await supabase
        .from("quote_approval_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        await supabase.rpc("record_public_token_failure", {
          _resource_type: "quote",
          _resource_id: null,
          _attempted_token: token.substring(0, 32),
          _ip: clientIp,
          _ua: clientUa,
          _reason: "token_not_found",
        });
        return new Response(
          JSON.stringify({ error: "Token inválido ou expirado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if expired
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        await supabase.rpc("record_public_token_failure", {
          _resource_type: "quote",
          _resource_id: tokenData.quote_id,
          _attempted_token: token.substring(0, 32),
          _ip: clientIp,
          _ua: clientUa,
          _reason: "token_expired",
        });
        return new Response(
          JSON.stringify({ error: "Este link expirou", expired: true }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already responded
      if (tokenData.responded_at) {
        return new Response(
          JSON.stringify({
            already_responded: true,
            response: tokenData.response,
            response_notes: tokenData.response_notes,
            responded_at: tokenData.responded_at,
            signer_name: tokenData.signer_name,
            signer_document: tokenData.signer_document,
            signature_hash: tokenData.signature_hash,
            signed_at: tokenData.signed_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as viewed
      if (!tokenData.viewed_at) {
        await supabase
          .from("quote_approval_tokens")
          .update({ viewed_at: new Date().toISOString() })
          .eq("id", tokenData.id);
      }

      // Fetch quote from CRM
      const { data: quote, error: quoteError } = await crmClient
        .from("quotes")
        .select("*")
        .eq("id", tokenData.quote_id)
        .single();

      if (quoteError || !quote) {
        return new Response(
          JSON.stringify({ error: "Orçamento não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch items
      const { data: items } = await crmClient
        .from("quote_items")
        .select("*")
        .eq("quote_id", tokenData.quote_id)
        .order("sort_order", { ascending: true });

      // Fetch personalizations
      const itemIds = (items || []).map((i: any) => i.id);
      let personalizations: any[] = [];
      if (itemIds.length > 0) {
        const { data: persData } = await crmClient
          .from("quote_item_personalizations")
          .select("*")
          .in("quote_item_id", itemIds);
        personalizations = persData || [];
      }

      // Fetch seller profile
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, avatar_url")
        .eq("user_id", tokenData.seller_id)
        .single();

      // Map personalizations to items
      const enrichedItems = (items || []).map((item: any) => ({
        ...item,
        // Clean notes (remove BPID markers)
        notes: (item.notes || "").replace(/\|\|\|BPID:[^|]*\|\|\|/g, "").trim() || null,
        personalizations: personalizations.filter((p: any) => p.quote_item_id === item.id),
      }));

      // Decode shipping from internal_notes
      const raw = quote.internal_notes || "";
      const shippingMatch = raw.match(/\|\|\|FRETE:(.*?):(.*?)\|\|\|/);
      const shippingType = shippingMatch ? shippingMatch[1] : null;
      const shippingCost = shippingMatch && shippingMatch[2] ? parseFloat(shippingMatch[2]) : null;
      const cleanNotes = raw.replace(/\s*\|\|\|FRETE:.*?\|\|\|/g, "").trim() || null;

      // ⚠️ WHITELIST: NUNCA expor markup/real_subtotal/real_discount ao cliente.
      // Cliente vê apenas o subtotal apresentado (já inflado) e o desconto aparente.
      const publicQuote = {
        id: quote.id,
        quote_number: quote.quote_number,
        client_id: quote.client_id,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        client_company: quote.client_company,
        client_cnpj: quote.client_cnpj,
        status: quote.status,
        subtotal: quote.subtotal,                  // apresentado
        discount_percent: quote.discount_percent,  // aparente
        discount_amount: quote.discount_amount,
        total: quote.total,
        notes: quote.notes,
        payment_terms: quote.payment_terms,
        delivery_time: quote.delivery_time,
        valid_until: quote.valid_until,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
        internal_notes: cleanNotes,
        shipping_type: shippingType,
        shipping_cost: shippingCost,
        items: enrichedItems,
        // ❌ EXCLUÍDOS: negotiation_markup_percent, real_subtotal, real_discount_percent,
        //              internal_notes raw, seller_id, bitrix_*, synced_*
      };

      return new Response(
        JSON.stringify({
          quote: publicQuote,
          seller: sellerProfile,
          token: {
            id: tokenData.id,
            client_name: tokenData.client_name,
            status: tokenData.status,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "respond" || action === "submit_response") {
      if (!token || !response) {
        return new Response(
          JSON.stringify({ error: "Token e resposta são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Approval requires e-signature (name + document)
      if (response === "approved") {
        const docDigits = (signer_document || "").replace(/\D/g, "");
        if (!signer_name || signer_name.trim().length < 3) {
          return new Response(
            JSON.stringify({ error: "Nome completo é obrigatório para assinar a aprovação." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (docDigits.length !== 11 && docDigits.length !== 14) {
          return new Response(
            JSON.stringify({ error: "CPF (11 dígitos) ou CNPJ (14 dígitos) válido é obrigatório." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Fetch token
      const { data: tokenData, error: tokenError } = await supabase
        .from("quote_approval_tokens")
        .select("*")
        .eq("token", token)
        .eq("status", "active")
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: "Token inválido" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (tokenData.responded_at) {
        return new Response(
          JSON.stringify({ error: "Já respondido anteriormente" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nowIso = new Date().toISOString();
      const clientIp = getClientIpFromReq(req);
      const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

      // Compute signature hash for integrity (only for approval)
      let signatureHash: string | null = null;
      const docDigits = (signer_document || "").replace(/\D/g, "");
      if (response === "approved") {
        signatureHash = await sha256Hex(
          [token, signer_name?.trim(), docDigits, nowIso, clientIp, tokenData.quote_id].join("|")
        );
      }

      // Update token with response + signature
      await supabase
        .from("quote_approval_tokens")
        .update({
          responded_at: nowIso,
          response,
          response_notes: response_notes || null,
          status: "responded",
          updated_at: nowIso,
          signer_name: response === "approved" ? signer_name?.trim() : null,
          signer_document: response === "approved" ? docDigits : null,
          signer_ip: clientIp,
          signer_user_agent: userAgent,
          signature_hash: signatureHash,
          signed_at: response === "approved" ? nowIso : null,
        })
        .eq("id", tokenData.id);

      // Update quote status in CRM
      await crmClient
        .from("quotes")
        .update({
          status: response,
          client_response: response,
          client_response_at: nowIso,
          client_response_notes: response_notes || null,
        })
        .eq("id", tokenData.quote_id);

      // Log history in CRM with signature evidence
      await crmClient.from("quote_history").insert({
        quote_id: tokenData.quote_id,
        user_id: tokenData.seller_id,
        action: `client_${response}`,
        description: `Cliente ${response === "approved" ? "aprovou" : "rejeitou"} o orçamento${response_notes ? `: ${response_notes}` : ""}`,
        metadata: {
          via: "public_link",
          client_name: tokenData.client_name,
          signer_name: response === "approved" ? signer_name?.trim() : null,
          signer_document: response === "approved" ? docDigits : null,
          signer_ip: clientIp,
          signer_user_agent: userAgent,
          signature_hash: signatureHash,
          signed_at: response === "approved" ? nowIso : null,
        },
      });

      // Create notification for seller
      try {
        await supabase.from("workspace_notifications").insert({
          user_id: tokenData.seller_id,
          title: response === "approved" ? "🎉 Orçamento aprovado!" : "❌ Orçamento rejeitado",
          message: `${signer_name?.trim() || tokenData.client_name || "Cliente"} ${response === "approved" ? "aprovou e assinou" : "rejeitou"} o orçamento.${response_notes ? ` Obs: ${response_notes}` : ""}`,
          type: response === "approved" ? "success" : "warning",
          category: "quotes",
          action_url: "/orcamentos",
        });
      } catch (_) {
        // Notification is optional — don't block the response flow
      }

      return new Response(
        JSON.stringify({
          success: true,
          response,
          signature: response === "approved" ? {
            signer_name: signer_name?.trim(),
            signer_document: docDigits,
            signed_at: nowIso,
            signature_hash: signatureHash,
            signer_ip: clientIp,
          } : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
