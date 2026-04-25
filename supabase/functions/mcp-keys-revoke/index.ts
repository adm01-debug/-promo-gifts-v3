/**
 * mcp-keys-revoke
 *
 * Revoga uma chave MCP server-side, registrando IP/UA antes do trigger DB.
 * Bloqueia revogações de chaves já revogadas (idempotente).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BodySchema = z.object({
  key_id: z.string().uuid(),
  reason: z.string().trim().max(500).optional().nullable(),
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return jsonResponse({ error: "unauthenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "unauthenticated" }, 401);
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: roleCheck, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) return jsonResponse({ error: "internal_error", detail: roleErr.message }, 500);
    if (!roleCheck) {
      return jsonResponse(
        { error: "forbidden", message: "Apenas administradores podem revogar chaves MCP." },
        403,
      );
    }

    let raw: unknown;
    try { raw = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse(
        { error: "validation_failed", fields: parsed.error.flatten().fieldErrors },
        422,
      );
    }
    const { key_id, reason } = parsed.data;

    const { data: existing, error: fetchErr } = await admin
      .from("mcp_api_keys")
      .select("id, key_prefix, name, scopes, revoked_at")
      .eq("id", key_id)
      .maybeSingle();
    if (fetchErr) return jsonResponse({ error: "internal_error", detail: fetchErr.message }, 500);
    if (!existing) return jsonResponse({ error: "not_found" }, 404);
    if (existing.revoked_at) {
      return jsonResponse({ error: "already_revoked" }, 409);
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      null;
    const ua = req.headers.get("user-agent") ?? null;

    // Sinaliza ator real para o trigger via setting custom
    await admin.rpc("set_config" as never, { setting_name: "request.mcp_actor", new_value: userId, is_local: true } as never).catch(() => {});

    const revokedAt = new Date().toISOString();
    const { error: updErr } = await admin
      .from("mcp_api_keys")
      .update({ revoked_at: revokedAt })
      .eq("id", key_id);
    if (updErr) return jsonResponse({ error: "update_failed", detail: updErr.message }, 500);

    // Log explícito com IP/UA (complementa o trigger)
    await admin.from("admin_audit_log").insert({
      user_id: userId,
      action: "mcp_key.revoked",
      resource_type: "mcp_api_key",
      resource_id: existing.id,
      ip_address: ip,
      user_agent: ua,
      details: {
        key_prefix: existing.key_prefix,
        name: existing.name,
        scopes: existing.scopes,
        is_full_access: (existing.scopes ?? []).includes("*"),
        revoked_at: revokedAt,
        reason: reason ?? null,
        source: "edge_function",
      },
    });

    return jsonResponse({ ok: true, id: existing.id, revoked_at: revokedAt }, 200);
  } catch (err) {
    return jsonResponse(
      { error: "internal_error", detail: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
