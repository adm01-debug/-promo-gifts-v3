/**
 * mcp-keys-update
 *
 * Atualiza campos sensíveis de uma chave MCP (name, description, scopes, expires_at).
 * Toda mudança é auditada via trigger DB; edge function adiciona IP/UA + valida fricção FULL.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  KNOWN_SCOPES,
  FULL_SCOPE_CONFIRMATION,
  FULL_SCOPE_MIN_JUSTIFICATION,
  FULL_SCOPE_MAX_TTL_MS,
  isFullAccess,
} from "../_shared/mcp-scopes.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BodySchema = z.object({
  key_id: z.string().uuid(),
  name: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  scopes: z
    .array(z.enum(KNOWN_SCOPES as unknown as [string, ...string[]]))
    .min(1)
    .max(KNOWN_SCOPES.length)
    .optional(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  justification: z.string().trim().max(1000).optional().nullable(),
  confirmation_phrase: z.string().optional().nullable(),
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
      return jsonResponse({ error: "forbidden", message: "Apenas administradores podem editar chaves MCP." }, 403);
    }

    let raw: unknown;
    try { raw = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse({ error: "validation_failed", fields: parsed.error.flatten().fieldErrors }, 422);
    }
    const { key_id, name, description, scopes, expires_at, justification, confirmation_phrase } = parsed.data;

    const { data: current, error: fetchErr } = await admin
      .from("mcp_api_keys")
      .select("id, name, description, scopes, expires_at, revoked_at, key_prefix")
      .eq("id", key_id)
      .maybeSingle();
    if (fetchErr) return jsonResponse({ error: "internal_error", detail: fetchErr.message }, 500);
    if (!current) return jsonResponse({ error: "not_found" }, 404);
    if (current.revoked_at) return jsonResponse({ error: "policy_violation", message: "Chave revogada não pode ser editada." }, 422);

    // Detecta escalação para FULL
    const wasFull = isFullAccess(current.scopes ?? []);
    const willBeFull = scopes ? isFullAccess(scopes) : wasFull;
    const escalating = !wasFull && willBeFull;

    if (escalating) {
      const fieldErrors: Record<string, string[]> = {};
      if (!justification || justification.trim().length < FULL_SCOPE_MIN_JUSTIFICATION) {
        fieldErrors.justification = [`Justificativa obrigatória (mín. ${FULL_SCOPE_MIN_JUSTIFICATION} caracteres) para escalar para FULL.`];
      }
      if (confirmation_phrase !== FULL_SCOPE_CONFIRMATION) {
        fieldErrors.confirmation_phrase = [`Digite exatamente "${FULL_SCOPE_CONFIRMATION}" para confirmar escalação.`];
      }
      const newExpiry = expires_at ?? current.expires_at;
      if (!newExpiry) {
        fieldErrors.expires_at = ["Chaves FULL exigem data de expiração."];
      } else {
        const ms = new Date(newExpiry).getTime() - Date.now();
        if (ms <= 0) fieldErrors.expires_at = [...(fieldErrors.expires_at ?? []), "Expiração precisa ser futura."];
        else if (ms > FULL_SCOPE_MAX_TTL_MS) fieldErrors.expires_at = [...(fieldErrors.expires_at ?? []), "Janela máxima 180 dias."];
      }
      if (Object.keys(fieldErrors).length > 0) {
        return jsonResponse({ error: "validation_failed", fields: fieldErrors }, 422);
      }
    }

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (scopes !== undefined) patch.scopes = scopes;
    if (expires_at !== undefined) patch.expires_at = expires_at;

    if (Object.keys(patch).length === 0) {
      return jsonResponse({ error: "no_changes" }, 400);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("cf-connecting-ip") ?? null;
    const ua = req.headers.get("user-agent") ?? null;

    const { data: updated, error: updErr } = await admin
      .from("mcp_api_keys")
      .update(patch)
      .eq("id", key_id)
      .select("id, name, description, scopes, expires_at, key_prefix")
      .single();
    if (updErr || !updated) return jsonResponse({ error: "update_failed", detail: updErr?.message ?? "unknown" }, 500);

    // Log enriquecido (complementa trigger DB com IP/UA)
    await admin.from("admin_audit_log").insert({
      user_id: userId,
      action: "mcp_key.updated",
      resource_type: "mcp_api_key",
      resource_id: updated.id,
      ip_address: ip,
      user_agent: ua,
      details: {
        key_prefix: updated.key_prefix,
        fields_changed: Object.keys(patch),
        before: {
          name: current.name,
          description: current.description,
          scopes: current.scopes,
          expires_at: current.expires_at,
        },
        after: {
          name: updated.name,
          description: updated.description,
          scopes: updated.scopes,
          expires_at: updated.expires_at,
        },
        escalated_to_full: escalating,
        justification: escalating ? (justification ?? null) : null,
        source: "edge_function",
      },
    });

    return jsonResponse({ ok: true, key: updated, escalated_to_full: escalating }, 200);
  } catch (err) {
    return jsonResponse(
      { error: "internal_error", detail: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
