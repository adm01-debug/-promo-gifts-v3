/**
 * mcp-keys-rotate
 *
 * Duplica uma chave MCP existente preservando nome+escopos+expiração,
 * vinculando a nova à antiga via `rotated_from`. A chave antiga
 * **NÃO é revogada automaticamente** — o admin revoga manualmente
 * quando o cliente migrar.
 *
 * Para chaves com escopo `*` (FULL), exige novamente justificativa
 * + frase de confirmação `CONCEDER FULL`, espelhando a fricção da
 * emissão original (mcp-keys-issue).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  FULL_SCOPE_CONFIRMATION,
  FULL_SCOPE_MIN_JUSTIFICATION,
  isFullAccess,
} from "../_shared/mcp-scopes.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BodySchema = z.object({
  source_key_id: z.string().uuid(),
  justification: z.string().trim().max(1000).optional().nullable(),
  confirmation_phrase: z.string().optional().nullable(),
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function generateKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const plain = `mcp_${hex}`;
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  const hash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { plain, hash, prefix: plain.slice(0, 12) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    // 1. JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return jsonResponse({ error: "unauthenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "unauthenticated" }, 401);
    const userId = userData.user.id;

    // 2. Service-role client
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 3. Role check
    const { data: roleCheck, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) return jsonResponse({ error: "internal_error", detail: roleErr.message }, 500);
    if (!roleCheck) {
      return jsonResponse(
        { error: "forbidden", message: "Apenas administradores podem rotacionar chaves MCP." },
        403,
      );
    }

    // 4. Validate body
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse(
        { error: "validation_failed", fields: parsed.error.flatten().fieldErrors },
        422,
      );
    }
    const { source_key_id, justification, confirmation_phrase } = parsed.data;

    // 5. Load source key
    const { data: source, error: srcErr } = await admin
      .from("mcp_api_keys")
      .select("id, name, scopes, expires_at, revoked_at, key_prefix")
      .eq("id", source_key_id)
      .maybeSingle();
    if (srcErr) return jsonResponse({ error: "internal_error", detail: srcErr.message }, 500);
    if (!source) return jsonResponse({ error: "source_not_found" }, 404);
    if (source.revoked_at) {
      return jsonResponse(
        { error: "policy_violation", message: "Chave de origem está revogada." },
        422,
      );
    }

    const full = isFullAccess(source.scopes ?? []);

    // 6. Re-validate FULL friction
    if (full) {
      const fieldErrors: Record<string, string[]> = {};
      if (!justification || justification.trim().length < FULL_SCOPE_MIN_JUSTIFICATION) {
        fieldErrors.justification = [
          `Justificativa obrigatória (mín. ${FULL_SCOPE_MIN_JUSTIFICATION} caracteres) para rotacionar chave full.`,
        ];
      }
      if (confirmation_phrase !== FULL_SCOPE_CONFIRMATION) {
        fieldErrors.confirmation_phrase = [
          `Digite exatamente "${FULL_SCOPE_CONFIRMATION}" para confirmar.`,
        ];
      }
      if (Object.keys(fieldErrors).length > 0) {
        return jsonResponse({ error: "validation_failed", fields: fieldErrors }, 422);
      }
    }

    // 7. Generate + insert
    const { plain, hash, prefix } = await generateKey();
    const newName = `${source.name} (rotacionada)`;

    const { data: inserted, error: insertErr } = await admin
      .from("mcp_api_keys")
      .insert({
        name: newName,
        key_hash: hash,
        key_prefix: prefix,
        scopes: source.scopes,
        created_by: userId,
        expires_at: source.expires_at,
        rotated_from: source.id,
        description: justification ?? null,
      })
      .select("id, key_prefix, scopes, expires_at, created_at, rotated_from")
      .single();
    if (insertErr || !inserted) {
      return jsonResponse(
        { error: "insert_failed", detail: insertErr?.message ?? "unknown" },
        500,
      );
    }

    // 8. Audit log
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      null;
    const ua = req.headers.get("user-agent") ?? null;

    await admin.from("admin_audit_log").insert({
      user_id: userId,
      action: "mcp_key.rotated",
      resource_type: "mcp_api_key",
      resource_id: inserted.id,
      ip_address: ip,
      user_agent: ua,
      details: {
        new_key_prefix: inserted.key_prefix,
        source_id: source.id,
        source_prefix: source.key_prefix,
        scopes: inserted.scopes,
        is_full_access: full,
        justification: justification ?? null,
        expires_at: inserted.expires_at,
      },
    });

    return jsonResponse(
      {
        ok: true,
        key: plain,
        prefix: inserted.key_prefix,
        scopes: inserted.scopes,
        expires_at: inserted.expires_at,
        id: inserted.id,
        rotated_from: inserted.rotated_from,
        is_full_access: full,
      },
      200,
    );
  } catch (err) {
    return jsonResponse(
      { error: "internal_error", detail: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
