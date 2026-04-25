/**
 * mcp-keys-issue
 *
 * Emite uma nova chave MCP server-side.
 *
 * Fluxo:
 *  1. CORS + OPTIONS
 *  2. Autentica via JWT (Authorization: Bearer)
 *  3. Verifica role admin via has_role()
 *  4. Valida payload com Zod (incluindo regras de alçada para escopo "*")
 *  5. Gera chave plana + hash SHA-256 server-side
 *  6. Insere em mcp_api_keys (service_role)
 *  7. Registra em admin_audit_log
 *  8. Retorna a chave plana UMA ÚNICA VEZ
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  KNOWN_SCOPES,
  FULL_SCOPE,
  FULL_SCOPE_CONFIRMATION,
  FULL_SCOPE_MIN_JUSTIFICATION,
  FULL_SCOPE_MAX_TTL_MS,
  isFullAccess,
} from "../_shared/mcp-scopes.ts";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { writeAuditEntry, summarizePayload, extractRequestMeta } from "../_shared/audit-log.ts";

const SOURCE = "mcp-keys-issue";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BodySchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    scopes: z
      .array(z.enum(KNOWN_SCOPES as unknown as [string, ...string[]]))
      .min(1)
      .max(KNOWN_SCOPES.length),
    expires_at: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
    justification: z.string().trim().max(1000).optional().nullable(),
    confirmation_phrase: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const full = isFullAccess(data.scopes);
    if (!full) return;

    // Regras adicionais quando escopo "*" está presente.
    if (!data.expires_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expires_at"],
        message: "Chaves com escopo '*' exigem data de expiração.",
      });
    } else {
      const expiresMs = new Date(data.expires_at).getTime();
      const nowMs = Date.now();
      if (Number.isNaN(expiresMs) || expiresMs <= nowMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expires_at"],
          message: "Data de expiração precisa ser no futuro.",
        });
      } else if (expiresMs - nowMs > FULL_SCOPE_MAX_TTL_MS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expires_at"],
          message: "Janela máxima para chave full é de 180 dias.",
        });
      }
    }

    if (
      !data.justification ||
      data.justification.length < FULL_SCOPE_MIN_JUSTIFICATION
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["justification"],
        message: `Justificativa obrigatória (mín. ${FULL_SCOPE_MIN_JUSTIFICATION} caracteres) para chave full.`,
      });
    }

    if (data.confirmation_phrase !== FULL_SCOPE_CONFIRMATION) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmation_phrase"],
        message: `Digite exatamente "${FULL_SCOPE_CONFIRMATION}" para confirmar.`,
      });
    }
  });

function jsonResponse(body: unknown, status: number, requestId?: string) {
  const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
  if (requestId) headers[REQUEST_ID_HEADER] = requestId;
  return new Response(JSON.stringify(requestId ? { ...(body as object), request_id: requestId } : body), {
    status,
    headers,
  });
}

async function generateKey(): Promise<{ plain: string; hash: string; prefix: string }> {
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    // 1. JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return jsonResponse({ error: "unauthenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "unauthenticated" }, 401);
    }
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
    if (roleErr) {
      return jsonResponse({ error: "internal_error", detail: roleErr.message }, 500);
    }
    if (!roleCheck) {
      return jsonResponse({ error: "forbidden", message: "Apenas administradores podem emitir chaves MCP." }, 403);
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
        {
          error: "validation_failed",
          fields: parsed.error.flatten().fieldErrors,
        },
        422,
      );
    }
    const { name, scopes, expires_at, justification } = parsed.data;
    const full = isFullAccess(scopes);

    // 5. Generate key
    const { plain, hash, prefix } = await generateKey();

    // 6. Insert
    const { data: inserted, error: insertErr } = await admin
      .from("mcp_api_keys")
      .insert({
        name,
        key_hash: hash,
        key_prefix: prefix,
        scopes,
        created_by: userId,
        expires_at: expires_at ?? null,
        description: justification ?? null,
      })
      .select("id, key_prefix, scopes, expires_at, created_at")
      .single();
    if (insertErr || !inserted) {
      return jsonResponse(
        { error: "insert_failed", detail: insertErr?.message ?? "unknown" },
        500,
      );
    }

    // 7. Audit log
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      null;
    const ua = req.headers.get("user-agent") ?? null;

    await admin.from("admin_audit_log").insert({
      user_id: userId,
      action: "mcp_key.issued",
      resource_type: "mcp_api_key",
      resource_id: inserted.id,
      ip_address: ip,
      user_agent: ua,
      details: {
        key_prefix: inserted.key_prefix,
        scopes: inserted.scopes,
        expires_at: inserted.expires_at,
        is_full_access: full,
        justification: justification ?? null,
        name,
      },
    });

    // 8. Response
    return jsonResponse(
      {
        ok: true,
        key: plain, // exibida ao usuário UMA vez; nunca persistida em texto puro
        prefix: inserted.key_prefix,
        scopes: inserted.scopes,
        expires_at: inserted.expires_at,
        id: inserted.id,
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
