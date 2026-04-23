// connection-tester: pings external systems to verify connectivity. Admin-only.
// Reads credentials from `integration_credentials` (DB-first) with env fallback.
// Core ping/persistence logic lives in `_shared/connection-test-runner.ts`.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { runConnectionTest } from "../_shared/connection-test-runner.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  action: z.enum(["test", "last_test", "test_history", "last_test_full"]).optional().default("test"),
  type: z.enum(["supabase", "bitrix24", "n8n", "mcp", "webhook_outbound"]),
  config: z.record(z.string()).optional(),
  connection_id: z.string().uuid().optional(),
  env_key: z.enum(["promobrind", "crm"]).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  timeout_ms: z.number().int().min(1000).max(30000).optional(),
});

/** Mascaramento server-side de URLs e cabeçalhos sensíveis. */
function maskUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let out = url;
  // Bitrix: /rest/<userId>/<token>/
  out = out.replace(/(\/rest\/\d+\/)[A-Za-z0-9]+(\/)/g, "$1••••$2");
  // ?auth=, ?apikey=, ?token=
  out = out.replace(/([?&](?:auth|apikey|api_key|token|access_token|key)=)[^&#]+/gi, "$1••••");
  return out;
}

function maskHeaders(headers: Record<string, string> | null | undefined): Record<string, string> | null {
  if (!headers) return null;
  const SENSITIVE = /^(authorization|apikey|api-key|x-api-key|x-n8n-api-key|cookie|set-cookie|x-auth-token)$/i;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE.test(k) ? "••••" : String(v);
  }
  return out;
}

function maskBody(body: string | null | undefined): string | null {
  if (!body) return null;
  let out = body;
  out = out.replace(/("(?:authorization|apikey|api_key|token|access_token|password|secret)"\s*:\s*")[^"]+(")/gi, "$1••••$2");
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const service = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await service.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r: { role: string }) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { action, type, config = {}, connection_id, env_key, limit, timeout_ms } = parsed.data;

    // -- last_test: read persisted info, no ping --
    if (action === "last_test") {
      let row: {
        last_test_at: string | null;
        last_test_ok: boolean | null;
        last_test_message: string | null;
        last_latency_ms: number | null;
        status: string | null;
      } | null = null;
      if (connection_id) {
        const { data } = await service.from("external_connections")
          .select("last_test_at, last_test_ok, last_test_message, last_latency_ms, status")
          .eq("id", connection_id).maybeSingle();
        row = data ?? null;
      } else if (env_key) {
        const { data } = await service.from("external_connections")
          .select("last_test_at, last_test_ok, last_test_message, last_latency_ms, status")
          .eq("env_key", env_key).eq("type", type).maybeSingle();
        row = data ?? null;
      } else if (type) {
        const { data } = await service.from("external_connections")
          .select("last_test_at, last_test_ok, last_test_message, last_latency_ms, status")
          .eq("type", type).order("last_test_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
        row = data ?? null;
      }
      return new Response(JSON.stringify({ ok: true, last: row }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -- test_history: list last N entries from connection_test_history --
    if (action === "test_history") {
      const max = limit ?? 10;
      let connIds: string[] = [];
      if (connection_id) {
        connIds = [connection_id];
      } else if (env_key) {
        const { data } = await service.from("external_connections")
          .select("id").eq("env_key", env_key).eq("type", type);
        connIds = (data ?? []).map((r: { id: string }) => r.id);
      } else {
        const { data } = await service.from("external_connections")
          .select("id").eq("type", type);
        connIds = (data ?? []).map((r: { id: string }) => r.id);
      }
      if (connIds.length === 0) {
        return new Response(JSON.stringify({ ok: true, items: [], total: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const [{ data: items }, { count }] = await Promise.all([
        service.from("connection_test_history")
          .select("id, tested_at, success, latency_ms, status_code, error_message, error_kind, triggered_by")
          .in("connection_id", connIds)
          .order("tested_at", { ascending: false })
          .limit(max),
        service.from("connection_test_history")
          .select("id", { count: "exact", head: true })
          .in("connection_id", connIds),
      ]);
      return new Response(JSON.stringify({
        ok: true,
        items: (items ?? []).map((r: { id: string; tested_at: string; success: boolean; latency_ms: number | null; status_code: number | null; error_message: string | null; error_kind: string | null; triggered_by: string | null }) => ({
          id: r.id,
          tested_at: r.tested_at,
          ok: r.success,
          latency_ms: r.latency_ms,
          status: r.status_code,
          message: r.error_message,
          error_kind: r.error_kind,
          triggered_by: r.triggered_by ?? "manual",
        })),
        total: count ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await runConnectionTest({
      type,
      config,
      env_key,
      connection_id,
      created_by: u.user.id,
      triggered_by: "manual",
      service,
      timeoutMs: timeout_ms,
    });

    return new Response(JSON.stringify({
      ok: true,
      result: {
        ok: r.ok,
        status: r.status,
        latency_ms: r.latency_ms,
        error: r.error,
        error_kind: r.error_kind,
        message: r.message,
        tested_at: r.tested_at,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
