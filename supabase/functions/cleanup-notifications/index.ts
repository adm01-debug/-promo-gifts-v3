import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stats = {
      deleted_read_old: 0,
      deleted_expired_tokens: 0,
      deleted_old_telemetry: 0,
    };

    // 1. Deletar notificações lidas com mais de 90 dias
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { count: deletedRead } = await supabase
      .from("workspace_notifications")
      .delete({ count: "exact" })
      .eq("is_read", true)
      .lt("created_at", cutoff90);

    stats.deleted_read_old = deletedRead || 0;

    // 2. Limpar tokens de aprovação expirados e respondidos há mais de 30 dias
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count: deletedTokens } = await supabase
      .from("quote_approval_tokens")
      .delete({ count: "exact" })
      .eq("status", "responded")
      .lt("responded_at", cutoff30);

    stats.deleted_expired_tokens = deletedTokens || 0;

    // 3. Limpar telemetria antiga (>60 dias)
    const cutoff60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { count: deletedTelemetry } = await supabase
      .from("query_telemetry")
      .delete({ count: "exact" })
      .lt("created_at", cutoff60);

    stats.deleted_old_telemetry = deletedTelemetry || 0;

    const total = Object.values(stats).reduce((s, v) => s + v, 0);

    console.log(`✅ Cleanup concluído: ${total} registros removidos`, stats);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        stats,
        total_cleaned: total,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
