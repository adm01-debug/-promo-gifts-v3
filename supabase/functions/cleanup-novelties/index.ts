import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🧹 Iniciando limpeza de novidades expiradas...");

  try {
    // Criar cliente Supabase com service role para operações administrativas
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Chamar a função RPC de limpeza
    const { data, error } = await supabase.rpc("cleanup_expired_novelties");

    if (error) {
      console.error("❌ Erro ao executar cleanup_expired_novelties:", error);
      throw error;
    }

    const deletedCount = data || 0;

    console.log(`✅ Limpeza concluída! ${deletedCount} novidades expiradas removidas.`);

    // Registrar log no sistema (opcional - se a tabela system_logs existir)
    try {
      await supabase.from("system_logs").insert({
        log_type: "cleanup",
        action: "cleanup_expired_novelties",
        entity: "product_novelties",
        details: {
          deleted_count: deletedCount,
          executed_at: new Date().toISOString(),
          source: "edge_function",
        },
        level: "info",
      });
    } catch (logError) {
      // Ignorar erro de log - não é crítico
      console.log("ℹ️ Não foi possível registrar log (tabela pode não existir):", logError);
    }

    // Também limpar logs antigos se a função existir
    try {
      const { data: logsDeleted } = await supabase.rpc("cleanup_old_logs");
      if (logsDeleted) {
        console.log(`🗑️ ${logsDeleted} logs antigos removidos.`);
      }
    } catch {
      // Ignorar se a função não existir
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Limpeza concluída com sucesso`,
        deleted_count: deletedCount,
        executed_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro na limpeza de novidades:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        executed_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
