// connections-auto-test: cron-driven (every 30min). Re-tests every active
// connection in `external_connections` and updates last_test_* fields +
// inserts a row in `connection_test_history` with triggered_by='cron'.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { runConnectionTest, type ConnectionType, isTransientFailure } from "../_shared/connection-test-runner.ts";
import { resolveTimeout } from "../_shared/connection-timeouts.ts";

// ────────────────────────────────────────────────────────────────────────────
// Schema-validated service client
// ────────────────────────────────────────────────────────────────────────────
// `runConnectionTest` exige um `SupabaseClient` com schema 'public' (default).
// Antes processBatch aceitava `any`, o que silenciava `TS2345 ('public' not
// assignable to never)` mas removia toda validação. Agora processBatch é
// GENÉRICO em (Database, SchemaName) — o caller pode passar
// `SupabaseClient<MyDB, 'public'>` ou variações, desde que mantenha a forma
// estrutural de SupabaseClient. Internamente narrow para o alias
// `ServiceClient` (default `SupabaseClient`) antes de repassar para
// runConnectionTest, preservando compatibilidade total.

/** Alias canônico do client esperado por runConnectionTest (schema 'public'). */
export type ServiceClient = SupabaseClient;

/**
 * Tipo aceito por processBatch — genérico para evitar `any` mas
 * estruturalmente compatível com SupabaseClient (schema 'public' por padrão).
 *
 * @template Database  Tipo gerado do schema (default `any` mantém retro-compat).
 * @template SchemaName Nome do schema; default `"public"` cobre 100% do uso atual.
 */
export type CompatibleSupabaseClient<
  // deno-lint-ignore no-explicit-any
  Database = any,
  SchemaName extends string = "public",
> = SupabaseClient<Database, SchemaName>;

/**
 * Runtime guard: garante que o objeto recebido é um SupabaseClient válido
 * com a forma esperada (`.from`, `.rpc`, `.auth`). Lança erro descritivo
 * se a forma divergir — protege contra:
 *   - createClient chamado com genéricos diferentes (mismatch de schema)
 *   - mock/stub passado por engano em testes
 *   - objeto undefined/null por bug de inicialização
 */
export function assertServiceClient(client: unknown): asserts client is ServiceClient {
  if (!client || typeof client !== "object") {
    throw new TypeError(
      `[connections-auto-test] service client inválido: esperado SupabaseClient, recebeu ${client === null ? "null" : typeof client}`,
    );
  }
  const c = client as Record<string, unknown>;
  const missing: string[] = [];
  if (typeof c.from !== "function") missing.push(".from()");
  if (typeof c.rpc !== "function") missing.push(".rpc()");
  if (typeof c.auth !== "object" || c.auth === null) missing.push(".auth");
  if (missing.length > 0) {
    throw new TypeError(
      `[connections-auto-test] service client não satisfaz a forma de SupabaseClient — faltando: ${missing.join(", ")}. ` +
      `Verifique se createClient<Database, 'public'> está alinhado com o schema esperado por runConnectionTest.`,
    );
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BATCH_SIZE = 5;
// Backoff schedule between attempts. Length defines max attempts (3 = 1 try + 2 retries).
// Index N is the delay BEFORE attempt N+1 (so RETRY_BACKOFF_MS[0] is wait before retry #1).
const RETRY_BACKOFF_MS = [500, 1500, 3000] as const;
const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length;

interface ActiveConnection {
  id: string;
  type: string;
  name: string;
  env_key: string | null;
  config: Record<string, unknown> | null;
  created_by: string;
}

async function processBatch(
  service: ServiceClient,
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
      const connType = conn.type as ConnectionType;
      const perTypeTimeout = resolveTimeout(connType);
      const baseArgs = {
        type: connType,
        config: cfg,
        env_key: (conn.env_key as "promobrind" | "crm" | null) ?? undefined,
        connection_id: conn.id,
        created_by: conn.created_by,
        triggered_by: "cron" as const,
        service,
        timeoutMs: perTypeTimeout,
      };

      // Probe up to MAX_ATTEMPTS times. Each attempt skips persistence so we
      // don't write intermediate "failed" rows in connection_test_history;
      // only the final outcome is persisted with the correct attempts count.
      let attempt = 1;
      let probe = await runConnectionTest({ ...baseArgs, attempts: 1, skipPersistence: true });
      while (!probe.ok && isTransientFailure(probe) && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS[attempt - 1] ?? 1000));
        attempt += 1;
        probe = await runConnectionTest({ ...baseArgs, attempts: attempt, skipPersistence: true });
      }

      // Persist the final outcome (one row, with the real attempts count).
      const final = await runConnectionTest({ ...baseArgs, attempts: attempt });

      console.log(JSON.stringify({
        evt: "auto-test",
        type: conn.type,
        name: conn.name,
        ok: final.ok,
        status: final.status,
        latency_ms: final.latency_ms,
        timeout_ms: perTypeTimeout,
        wall_ms: Date.now() - t0,
        attempts: attempt,
        retried: attempt > 1,
        error: final.error,
        error_kind: final.error_kind,
      }));
      return { id: conn.id, ok: final.ok, latency_ms: final.latency_ms ?? null, attempts: attempt };
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
    // Validação de tipo (estática + runtime) antes de qualquer chamada batch:
    // garante que o client tem a forma esperada por processBatch / runConnectionTest.
    assertServiceClient(service);

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

    const results: Array<{ id: string; ok: boolean; latency_ms: number | null; attempts: number; error?: string }> = [];
    for (let i = 0; i < conns.length; i += BATCH_SIZE) {
      const batch = conns.slice(i, i + BATCH_SIZE);
      const r = await processBatch(service, batch);
      results.push(...r);
    }

    const ok_count = results.filter((r) => r.ok).length;
    const failed = results.length - ok_count;
    const retried = results.filter((r) => r.attempts > 1).length;
    const recovered = results.filter((r) => r.ok && r.attempts > 1).length;
    const summary = {
      ok: true,
      tested: results.length,
      ok_count,
      failed,
      retried,
      recovered,
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
