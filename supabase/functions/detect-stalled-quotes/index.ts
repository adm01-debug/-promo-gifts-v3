// detect-stalled-quotes — Detecta orçamentos enviados há 3+ dias sem interação
// e cria notificações proativas para os vendedores responsáveis.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 3);

    // Busca orçamentos enviados há 3+ dias sem resposta do cliente
    const { data: stalled, error } = await supabase
      .from("quotes")
      .select("id, quote_number, client_name, seller_id, sent_at, total")
      .eq("status", "sent")
      .is("client_response", null)
      .lte("sent_at", threshold.toISOString())
      .limit(200);

    if (error) throw error;
    if (!stalled?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0;
    for (const q of stalled) {
      // Evita duplicar notificação no mesmo dia
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("workspace_notifications")
        .select("id")
        .eq("user_id", q.seller_id)
        .eq("category", "stalled_quote")
        .gte("created_at", `${today}T00:00:00Z`)
        .ilike("message", `%${q.quote_number}%`)
        .limit(1);

      if (existing?.length) continue;

      const daysAgo = Math.floor(
        (Date.now() - new Date(q.sent_at).getTime()) / (1000 * 60 * 60 * 24),
      );

      await supabase.from("workspace_notifications").insert({
        user_id: q.seller_id,
        title: "Orçamento parado",
        message: `${q.quote_number} (${q.client_name ?? "cliente"}) está há ${daysAgo} dias sem resposta. Que tal um follow-up?`,
        type: "warning",
        category: "stalled_quote",
        action_url: `/orcamentos/${q.id}`,
        metadata: { quote_id: q.id, days_stalled: daysAgo, total: q.total },
      });
      created++;
    }

    return new Response(JSON.stringify({ ok: true, processed: stalled.length, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-stalled-quotes error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
