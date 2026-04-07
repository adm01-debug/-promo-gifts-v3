import { createClient } from "npm:@supabase/supabase-js@2.49.4";

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
    // Safely parse body — GET requests have no body
    let body: Record<string, unknown> = {};
    if (req.method === "POST" || req.method === "PUT") {
      try {
        body = await req.json();
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
        body = { action: "get_kit", token: tokenParam };
      } else {
        return new Response(
          JSON.stringify({ error: "Use POST com JSON body ou GET com ?token=..." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { action, token } = body as { action?: string; token?: string };

    if (!action || !token) {
      return new Response(
        JSON.stringify({ error: "Parâmetros 'action' e 'token' são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "get_kit") {
      // Fetch token record
      const { data: tokenData, error: tokenError } = await supabase
        .from("kit_share_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: "Link inválido ou não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check status
      if (tokenData.status !== "active") {
        return new Response(
          JSON.stringify({ error: "Este link foi revogado" }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiry
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Este link expirou", expired: true }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as viewed
      if (!tokenData.viewed_at) {
        await supabase
          .from("kit_share_tokens")
          .update({ viewed_at: new Date().toISOString() })
          .eq("id", tokenData.id);
      }

      // Fetch kit
      const { data: kit, error: kitError } = await supabase
        .from("custom_kits")
        .select("*")
        .eq("id", tokenData.kit_id)
        .single();

      if (kitError || !kit) {
        return new Response(
          JSON.stringify({ error: "Kit não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch seller profile
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, avatar_url")
        .eq("user_id", tokenData.seller_id)
        .single();

      // Fetch organization branding
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", tokenData.seller_id)
        .limit(1)
        .maybeSingle();

      let organization = null;
      if (orgMember?.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("name, logo_url, description")
          .eq("id", orgMember.organization_id)
          .single();
        organization = orgData;
      }

      // Clean kit data: remove cost prices and SKUs for client view
      const cleanItems = (kit.items_data || []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category || null,
        imageUrl: item.imageUrl || item.image_url || null,
        selectedColor: item.selectedColor || null,
        isOptional: item.isOptional || false,
      }));

      const cleanBox = kit.box_data ? {
        name: (kit.box_data as any).name,
        imageUrl: (kit.box_data as any).imageUrl || (kit.box_data as any).image_url || null,
        dimensions: (kit.box_data as any).dimensions || null,
      } : null;

      return new Response(
        JSON.stringify({
          kit: {
            name: kit.name,
            kit_type: kit.kit_type,
            kit_quantity: kit.kit_quantity,
            volume_usage_percent: kit.volume_usage_percent,
            box: cleanBox,
            items: cleanItems,
          },
          seller: sellerProfile,
          organization,
          token: {
            id: tokenData.id,
            client_name: tokenData.client_name,
          },
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
