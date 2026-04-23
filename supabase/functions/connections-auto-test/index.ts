// connections-auto-test: cron-driven (every 30min). Re-tests every active
// connection in `external_connections` and updates last_test_* fields +
// inserts a row in `connection_test_history` with triggered_by='cron'.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { runConnectionTest, type ConnectionType } from "../_shared/connection-test-runner.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BATCH_SIZE = 5;
const PER_TEST_TIMEOUT_MS = 8000;

interface ActiveConnection {
  id: string;
  type: string;
  name: string;
  env_key: string | null;
  config: Record<string, unknown> | null;
  created_by: string;
}

async function processBatch(
  service: ReturnType<typeof createClient>,
  batch: ActiveConnection[],
) {
  return Promise.all(batch.map(async (conn) => {
    const t0 = Date.now();
    try {
      const cfg = (conn.config && typeof conn.config === "object")
        ? Object.fromEntries(
            Object.entries(conn.config as Record<string, unknown>)
              .filter(([, v]) => typeof v === "string")
              .map(([k, v]) => [k, v as string]),
          )
        : {};
      const baseArgs = {
        type: conn.type as ConnectionType,
        config: cfg,
        env_key: (conn.env_key as "promobrind" | "crm" | null) ?? undefined,
        connection_id: conn.id,
        created_by: conn.created_by,
        triggered_by: "cron" as const,
        service,
        timeoutMs: PER_TEST_TIMEOUT_MS,
      };

      // Probe (no persistence) so we can retry once on transient failures
      // without writing two rows to the history.
      const probe = await runConnectionTest({ ...baseArgs, attempts: 1, skipPersistence: true });

      let attempts = 1;
      let final = probe;
      if (!probe.ok && isTransientFailure(probe)) {
        // Small backoff before the single retry.
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        attempts = 2;
        final = await runConnectionTest({ ...baseArgs, attempts: 2 });
      } else {
        // Persist the probe result as-is (1 attempt).
        final = await runConnectionTest({ ...baseArgs, attempts: 1 });
      }

      console.log(JSON.stringify({
        evt: "auto-test",
        type: conn.type,
        name: conn.name,
        ok: final.ok,
        status: final.status,
        latency_ms: final.latency_ms,
        wall_ms: Date.now() - t0,
        attempts,
        retried: attempts > 1,
        error: final.error,
        error_kind: final.error_kind,
      }));
      return { id: conn.id, ok: final.ok, latency_ms: final.latency_ms ?? null, attempts };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      console.error(JSON.stringify({ evt: "auto-test-error", id: conn.id, type: conn.type, error: msg }));
      return { id: conn.id, ok: false, latency_ms: null, attempts: 1, error: msg };
    }
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: active, error } = await service
      .from("external_connections")
      .select("id, type, name, env_key, config, created_by")
      .eq("status", "active")
      .eq("auto_test_enabled", true);
    if (error) throw error;

    const conns = (active ?? []) as ActiveConnection[];
    if (conns.length === 0) {
      return new Response(JSON.stringify({ ok: true, tested: 0, skipped: 0, ok_count: 0, failed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; ok: boolean; latency_ms: number | null; error?: string }> = [];
    for (let i = 0; i < conns.length; i += BATCH_SIZE) {
      const batch = conns.slice(i, i + BATCH_SIZE);
      const r = await processBatch(service, batch);
      results.push(...r);
    }

    const ok_count = results.filter((r) => r.ok).length;
    const failed = results.length - ok_count;
    const summary = {
      ok: true,
      tested: results.length,
      ok_count,
      failed,
      duration_ms: Date.now() - startedAt,
    };
    console.log(JSON.stringify({ evt: "auto-test-summary", ...summary }));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    console.error(JSON.stringify({ evt: "auto-test-fatal", error: msg }));
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
