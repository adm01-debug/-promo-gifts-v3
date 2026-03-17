import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, token, response, response_notes } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // CRM bridge credentials
    const crmUrl = Deno.env.get("CRM_SUPABASE_URL")!;
    const crmKey = Deno.env.get("CRM_SUPABASE_ANON_KEY")!;
    const crmClient = createClient(crmUrl, crmKey);

    if (action === "get_quote") {
      // Fetch token record
      const { data: tokenData, error: tokenError } = await supabase
        .from("quote_approval_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: "Token inválido ou expirado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if expired
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
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

      return new Response(
        JSON.stringify({
          quote: {
            ...quote,
            internal_notes: cleanNotes,
            shipping_type: shippingType,
            shipping_cost: shippingCost,
            items: enrichedItems,
          },
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

    if (action === "respond") {
      if (!token || !response) {
        return new Response(
          JSON.stringify({ error: "Token e resposta são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!["approved", "rejected"].includes(response)) {
        return new Response(
          JSON.stringify({ error: "Resposta inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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

      // Update token with response
      await supabase
        .from("quote_approval_tokens")
        .update({
          responded_at: new Date().toISOString(),
          response,
          response_notes: response_notes || null,
          status: "responded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenData.id);

      // Update quote status in CRM
      await crmClient
        .from("quotes")
        .update({
          status: response,
          client_response: response,
          client_response_at: new Date().toISOString(),
          client_response_notes: response_notes || null,
        })
        .eq("id", tokenData.quote_id);

      // Log history in CRM
      await crmClient.from("quote_history").insert({
        quote_id: tokenData.quote_id,
        user_id: tokenData.seller_id,
        action: `client_${response}`,
        description: `Cliente ${response === "approved" ? "aprovou" : "rejeitou"} o orçamento${response_notes ? `: ${response_notes}` : ""}`,
        metadata: { via: "public_link", client_name: tokenData.client_name },
      });

      // Create notification for seller
      await supabase.from("notifications").insert({
        user_id: tokenData.seller_id,
        title: response === "approved" ? "🎉 Orçamento aprovado!" : "❌ Orçamento rejeitado",
        message: `${tokenData.client_name || "Cliente"} ${response === "approved" ? "aprovou" : "rejeitou"} o orçamento.${response_notes ? ` Obs: ${response_notes}` : ""}`,
        type: "quote_approval",
        data: { quote_id: tokenData.quote_id, response },
      });

      return new Response(
        JSON.stringify({ success: true, response }),
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
