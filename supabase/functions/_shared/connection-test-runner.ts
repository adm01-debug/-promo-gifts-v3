// Shared core logic for connection ping + persistence.
// Used by `connection-tester` (manual, JWT-protected) and
// `connections-auto-test` (cron, service-role).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCredential } from "./credentials.ts";

export type ConnectionType = "supabase" | "bitrix24" | "n8n" | "mcp" | "webhook_outbound";
export type TriggeredBy = "manual" | "cron" | "webhook";

export interface RunOptions {
  type: ConnectionType;
  config?: Record<string, string>;
  env_key?: "promobrind" | "crm";
  connection_id?: string;
  triggered_by?: TriggeredBy;
  /** Only required when env_key is provided without a connection_id (auto-upsert). */
  created_by?: string;
  service: SupabaseClient;
  /** Per-test timeout in ms. Default 8000. */
  timeoutMs?: number;
}

export interface RunResult {
  ok: boolean;
  status?: number;
  latency_ms?: number;
  error?: string;
  message?: string;
  tested_at: string;
  connection_id?: string;
}

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(t) };
}

async function pingSupabase(url: string, key: string, timeoutMs: number) {
  const start = Date.now();
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const res = await fetch(`${url}/rest/v1/?apikey=${key}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal,
    });
    await res.text();
    return { ok: res.ok, status: res.status, latency_ms: Date.now() - start };
  } finally { cancel(); }
}

async function pingBitrix(webhookUrl: string, timeoutMs: number) {
  const start = Date.now();
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const url = webhookUrl.replace(/\/$/, "") + "/crm.contact.fields.json";
    const res = await fetch(url, { signal });
    const body = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(body); } catch { /* ignore */ }
    return {
      ok: res.ok && !!parsed && !(parsed as Record<string, unknown>).error,
      status: res.status,
      latency_ms: Date.now() - start,
      error: (parsed as { error?: string })?.error,
    };
  } finally { cancel(); }
}

async function pingN8n(baseUrl: string, apiKey: string | undefined, timeoutMs: number) {
  const start = Date.now();
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const url = baseUrl.replace(/\/$/, "") + "/healthz";
    const headers: Record<string, string> = {};
    if (apiKey) headers["X-N8N-API-KEY"] = apiKey;
    const res = await fetch(url, { headers, signal });
    await res.text();
    return { ok: res.ok, status: res.status, latency_ms: Date.now() - start };
  } finally { cancel(); }
}

async function pingWebhook(url: string, timeoutMs: number) {
  const start = Date.now();
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Connection-Test": "1" },
      body: JSON.stringify({ event: "connection.test", timestamp: new Date().toISOString() }),
      signal,
    });
    await res.text();
    return { ok: res.ok, status: res.status, latency_ms: Date.now() - start };
  } finally { cancel(); }
}

export async function runConnectionTest(opts: RunOptions): Promise<RunResult> {
  const { type, config = {}, env_key, service, created_by } = opts;
  const triggered_by: TriggeredBy = opts.triggered_by ?? "manual";
  const timeoutMs = opts.timeoutMs ?? 8000;
  let connection_id = opts.connection_id;

  let result: { ok: boolean; status?: number; latency_ms?: number; error?: string; message?: string };
  try {
    if (type === "supabase") {
      const prefix = env_key === "crm" ? "EXTERNAL_CRM" : "EXTERNAL_PROMOBRIND";
      const url = config.url || (await getCredential(`${prefix}_URL`, service)) || "";
      const key = config.key || (await getCredential(`${prefix}_SERVICE_ROLE_KEY`, service)) || "";
      if (!url || !key) throw new Error("URL/key ausente — configure as credenciais primeiro");
      result = await pingSupabase(url, key, timeoutMs);
    } else if (type === "bitrix24") {
      const url = config.webhook_url || (await getCredential("BITRIX24_WEBHOOK_URL", service)) || "";
      if (!url) throw new Error("Webhook URL ausente");
      result = await pingBitrix(url, timeoutMs);
    } else if (type === "n8n") {
      const base = config.base_url || (await getCredential("N8N_BASE_URL", service)) || "";
      const key = config.api_key || (await getCredential("N8N_API_KEY", service)) || undefined;
      if (!base) throw new Error("Base URL ausente");
      result = await pingN8n(base, key ?? undefined, timeoutMs);
    } else if (type === "webhook_outbound") {
      const url = config.url || "";
      if (!url) throw new Error("URL ausente");
      result = await pingWebhook(url, timeoutMs);
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
    const isAbort = err instanceof Error && err.name === "AbortError";
    result = { ok: false, error: isAbort ? `Timeout após ${timeoutMs}ms` : (err instanceof Error ? err.message : "Erro") };
  }

  const tested_at = new Date().toISOString();
  const message = result.error ?? result.message ?? `HTTP ${result.status ?? "?"}`;

  if (connection_id) {
    await service.from("external_connections").update({
      last_test_at: tested_at,
      last_test_ok: result.ok,
      last_test_message: message,
      last_latency_ms: result.latency_ms ?? null,
      status: result.ok ? "active" : "error",
    }).eq("id", connection_id);

    await service.from("connection_test_history").insert({
      connection_id,
      tested_at,
      success: result.ok,
      latency_ms: result.latency_ms ?? null,
      status_code: result.status ?? null,
      error_message: result.ok ? null : (result.error ?? message)?.slice(0, 500),
      triggered_by,
    }).then(() => undefined, (e) => console.error("history insert failed", e));
  } else if (env_key && type === "supabase" && created_by) {
    const { data: upserted } = await service.from("external_connections").upsert({
      env_key,
      type,
      name: env_key === "crm" ? "Catálogo CRM" : "Catálogo Promobrind",
      status: result.ok ? "active" : "error",
      last_test_at: tested_at,
      last_test_ok: result.ok,
      last_test_message: message,
      last_latency_ms: result.latency_ms ?? null,
      created_by,
    }, { onConflict: "env_key,type" }).select("id").maybeSingle();
    if (upserted?.id) {
      connection_id = upserted.id;
      await service.from("connection_test_history").insert({
        connection_id: upserted.id,
        tested_at,
        success: result.ok,
        latency_ms: result.latency_ms ?? null,
        status_code: result.status ?? null,
        error_message: result.ok ? null : (result.error ?? message)?.slice(0, 500),
        triggered_by,
      }).then(() => undefined, (e) => console.error("history insert failed (env)", e));
    }
  }

  return { ...result, tested_at, connection_id };
}
