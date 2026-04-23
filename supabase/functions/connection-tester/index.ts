// connection-tester: pings external systems to verify connectivity. Admin-only.
// Reads credentials from `integration_credentials` (DB-first) with env fallback.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCredential } from "../_shared/credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  action: z.enum(["test", "last_test", "test_history"]).optional().default("test"),
  type: z.enum(["supabase", "bitrix24", "n8n", "mcp", "webhook_outbound"]),
  config: z.record(z.string()).optional(),
  connection_id: z.string().uuid().optional(),
  env_key: z.enum(["promobrind", "crm"]).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

async function pingSupabase(url: string, key: string) {
  const start = Date.now();
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  await res.text();
  return { ok: res.ok, status: res.status, latency_ms: Date.now() - start };
}

async function pingBitrix(webhookUrl: string) {
  const start = Date.now();
  const url = webhookUrl.replace(/\/$/, "") + "/crm.contact.fields.json";
  const res = await fetch(url);
  const body = await res.text();
  let parsed: unknown = null;
  try { parsed = JSON.parse(body); } catch { /* ignore */ }
  return {
    ok: res.ok && !!parsed && !(parsed as Record<string, unknown>).error,
    status: res.status,
    latency_ms: Date.now() - start,
    error: (parsed as { error?: string })?.error,
  };
}

async function pingN8n(baseUrl: string, apiKey?: string) {
  const start = Date.now();
  const url = baseUrl.replace(/\/$/, "") + "/healthz";
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-N8N-API-KEY"] = apiKey;
  const res = await fetch(url, { headers });
  await res.text();
  return { ok: res.ok, status: res.status, latency_ms: Date.now() - start };
}

async function pingWebhook(url: string) {
  const start = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Connection-Test": "1" },
    body: JSON.stringify({ event: "connection.test", timestamp: new Date().toISOString() }),
  });
  await res.text();
  return { ok: res.ok, status: res.status, latency_ms: Date.now() - start };
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
    const { action, type, config = {}, connection_id, env_key, limit } = parsed.data;

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
          .select("id, tested_at, success, latency_ms, status_code, error_message")
          .in("connection_id", connIds)
          .order("tested_at", { ascending: false })
          .limit(max),
        service.from("connection_test_history")
          .select("id", { count: "exact", head: true })
          .in("connection_id", connIds),
      ]);
      return new Response(JSON.stringify({
        ok: true,
        items: (items ?? []).map((r: { id: string; tested_at: string; success: boolean; latency_ms: number | null; status_code: number | null; error_message: string | null }) => ({
          id: r.id,
          tested_at: r.tested_at,
          ok: r.success,
          latency_ms: r.latency_ms,
          status: r.status_code,
          message: r.error_message,
        })),
        total: count ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: { ok: boolean; status?: number; latency_ms?: number; error?: string; message?: string };
    try {
      if (type === "supabase") {
        const prefix = env_key === "crm" ? "EXTERNAL_CRM" : "EXTERNAL_PROMOBRIND";
        const url = config.url
          || (await getCredential(`${prefix}_URL`, service))
          || "";
        const key = config.key
          || (await getCredential(`${prefix}_SERVICE_ROLE_KEY`, service))
          || "";
        if (!url || !key) throw new Error("URL/key ausente — configure as credenciais primeiro");
        result = await pingSupabase(url, key);
      } else if (type === "bitrix24") {
        const url = config.webhook_url
          || (await getCredential("BITRIX24_WEBHOOK_URL", service))
          || "";
        if (!url) throw new Error("Webhook URL ausente");
        result = await pingBitrix(url);
      } else if (type === "n8n") {
        const base = config.base_url
          || (await getCredential("N8N_BASE_URL", service))
          || "";
        const key = config.api_key
          || (await getCredential("N8N_API_KEY", service))
          || undefined;
        if (!base) throw new Error("Base URL ausente");
        result = await pingN8n(base, key ?? undefined);
      } else if (type === "webhook_outbound") {
        const url = config.url || "";
        if (!url) throw new Error("URL ausente");
        result = await pingWebhook(url);
      } else if (type === "mcp") {
        const { count } = await service
          .from("mcp_api_keys")
          .select("*", { count: "exact", head: true })
          .is("revoked_at", null);
        result = { ok: true, status: 200, message: `${count ?? 0} chave(s) MCP ativa(s)` };
      } else {
        result = { ok: false, error: "Tipo não suportado" };
      }
    } catch (err) {
      result = { ok: false, error: err instanceof Error ? err.message : "Erro" };
    }

    const nowIso = new Date().toISOString();
    const message = result.error ?? result.message ?? `HTTP ${result.status ?? "?"}`;

    if (connection_id) {
      await service.from("external_connections").update({
        last_test_at: nowIso,
        last_test_ok: result.ok,
        last_test_message: message,
        last_latency_ms: result.latency_ms ?? null,
        status: result.ok ? "active" : "error",
      }).eq("id", connection_id);

      await service.from("connection_test_history").insert({
        connection_id,
        tested_at: nowIso,
        success: result.ok,
        latency_ms: result.latency_ms ?? null,
        status_code: result.status ?? null,
        error_message: result.ok ? null : (result.error ?? message)?.slice(0, 500),
      }).then(() => undefined, (e) => console.error("history insert failed", e));
    } else if (env_key && type === "supabase") {
      // Upsert virtual connection row keyed by (env_key, type) so the UI can rehydrate.
      const { data: upserted } = await service.from("external_connections").upsert({
        env_key,
        type,
        name: env_key === "crm" ? "Catálogo CRM" : "Catálogo Promobrind",
        status: result.ok ? "active" : "error",
        last_test_at: nowIso,
        last_test_ok: result.ok,
        last_test_message: message,
        last_latency_ms: result.latency_ms ?? null,
        created_by: u.user.id,
      }, { onConflict: "env_key,type" }).select("id").maybeSingle();
      if (upserted?.id) {
        await service.from("connection_test_history").insert({
          connection_id: upserted.id,
          tested_at: nowIso,
          success: result.ok,
          latency_ms: result.latency_ms ?? null,
          status_code: result.status ?? null,
          error_message: result.ok ? null : (result.error ?? message)?.slice(0, 500),
        }).then(() => undefined, (e) => console.error("history insert failed (env)", e));
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      result: { ...result, tested_at: nowIso },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
