/**
 * web-vitals-regression-check
 * Scheduled (pg_cron daily 09:00 UTC). Compares last 7d vs previous 7d p75 per metric.
 * If LCP/INP/CLS regressed > 20% with sufficient samples, notifies all admins.
 */
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegressionMetric {
  metric_name: string;
  current_p75: number | null;
  previous_p75: number | null;
  current_samples: number;
  previous_samples: number;
  change_pct: number | null;
}

interface RegressionResult {
  generated_at: string;
  metrics: RegressionMetric[];
  regressions: RegressionMetric[];
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: rpcData, error: rpcError } = await supabase.rpc("get_web_vitals_regression");
    if (rpcError) throw rpcError;

    const result = rpcData as unknown as RegressionResult;
    const criticalMetrics = ["LCP", "INP", "CLS"];
    const criticalRegressions = (result.regressions ?? []).filter((r) =>
      criticalMetrics.includes(r.metric_name)
    );

    if (criticalRegressions.length === 0) {
      return jsonRes({ ok: true, regressions: 0, generated_at: result.generated_at });
    }

    // Find admin users
    const { data: admins, error: adminsError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminsError) throw adminsError;
    if (!admins || admins.length === 0) {
      return jsonRes({ ok: true, regressions: criticalRegressions.length, notified: 0 });
    }

    const summary = criticalRegressions
      .map((r) => `${r.metric_name}: +${r.change_pct?.toFixed(1)}% (${Math.round(r.previous_p75 ?? 0)} → ${Math.round(r.current_p75 ?? 0)})`)
      .join(" · ");

    const notifications = admins.map((a) => ({
      user_id: a.user_id,
      title: "⚠️ Regressão de Performance detectada",
      message: `Web Vitals pioraram nos últimos 7 dias: ${summary}`,
      type: "warning",
      category: "performance",
      action_url: "/admin/performance",
      metadata: { regressions: criticalRegressions } as unknown,
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from("workspace_notifications")
      .insert(notifications);

    if (insertError) throw insertError;

    return jsonRes({
      ok: true,
      regressions: criticalRegressions.length,
      notified: admins.length,
      summary,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[web-vitals-regression-check] error:", msg);
    return jsonRes({ error: msg }, 500);
  }
});
