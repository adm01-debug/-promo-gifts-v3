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
  action: z.enum(["test", "last_test"]).optional().default("test"),
  type: z.enum(["supabase", "bitrix24", "n8n", "mcp", "webhook_outbound"]),
  config: z.record(z.string()).optional(),
  connection_id: z.string().uuid().optional(),
  env_key: z.enum(["promobrind", "crm"]).optional(),
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
    const { type, config = {}, connection_id, env_key } = parsed.data;

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

    if (connection_id) {
      const nowIso = new Date().toISOString();
      const message = result.error ?? result.message ?? `HTTP ${result.status ?? "?"}`;
      await service.from("external_connections").update({
        last_test_at: nowIso,
        last_test_ok: result.ok,
        last_test_message: message,
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
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
