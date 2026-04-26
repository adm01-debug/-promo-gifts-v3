/**
 * e2e-cleanup — Apaga dados de aplicação criados por usuários de teste E2E.
 *
 * Camadas de segurança:
 *  1. Header `x-e2e-cleanup-token` precisa bater com E2E_CLEANUP_TOKEN (timing-safe).
 *  2. `email` do body precisa estar em E2E_CLEANUP_ALLOWED_EMAILS (CSV).
 *  3. user_id é resolvido server-side via auth.admin (cliente nunca passa UUID).
 *  4. dryRun = true por default — exige opt-in explícito {"dryRun": false}.
 *  5. Apaga apenas dados de aplicação por user_id/seller_id. NUNCA apaga auth.users.
 *
 * Body:
 *   { "email": "e2e@...", "dryRun": false }
 * Resposta:
 *   { ok, dryRun, userId, deleted: { table: count }, totalMs }
 */
// @ts-ignore - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-e2e-cleanup-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Tabelas filtradas por user_id (filhos primeiro, depois pais). */
const USER_ID_TABLES = [
  // favoritos
  "favorite_item_reactions",
  "favorite_items_trash",
  "favorite_items",
  "favorite_lists",
  // coleções
  "collection_item_reactions",
  "collection_items_trash",
  "collection_items",
  "collections",
  // carrinhos
  "seller_cart_items",
  "seller_carts",
  "cart_templates",
  // comparador
  "comparison_reactions",
  "user_comparisons",
  // mockups / kits
  "generated_mockups",
  "mockup_drafts",
  "custom_kits",
] as const;

/** Tabelas de quote são filtradas via seller_id. quotes é a "raiz". */
const QUOTE_CHILD_TABLES_BY_QUOTE_ID = [
  "quote_item_personalizations",
  "quote_items",
  "quote_history",
  "quote_comments",
  "quote_approval_tokens",
] as const;

// @ts-ignore - Deno runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const startedAt = Date.now();

  // --- camada 1: token compartilhado --------------------------------------
  // @ts-ignore - Deno runtime
  const expectedToken = Deno.env.get("E2E_CLEANUP_TOKEN") ?? "";
  const providedToken = req.headers.get("x-e2e-cleanup-token") ?? "";
  if (!expectedToken || !providedToken || !timingSafeEqual(expectedToken, providedToken)) {
    return jsonResponse({ error: "invalid_cleanup_token" }, 401);
  }

  // --- parse body ---------------------------------------------------------
  let body: { email?: unknown; dryRun?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  // dryRun default = true → ato destrutivo precisa de opt-in explícito
  const dryRun = body.dryRun === false ? false : true;
  if (!email) return jsonResponse({ error: "email_required" }, 400);

  // --- camada 2: allow-list ------------------------------------------------
  // @ts-ignore - Deno runtime
  const allowedRaw = Deno.env.get("E2E_CLEANUP_ALLOWED_EMAILS") ?? "";
  const allowed = allowedRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) {
    return jsonResponse({ error: "allow_list_not_configured" }, 403);
  }
  if (!allowed.includes(email)) {
    return jsonResponse({ error: "email_not_in_allow_list" }, 403);
  }

  // --- service-role client -------------------------------------------------
  // @ts-ignore - Deno runtime
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  // @ts-ignore - Deno runtime
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- camada 3: resolver user_id ------------------------------------------
  // listUsers não tem busca por email exato no v2 → paginar leve.
  let userId: string | null = null;
  try {
    let page = 1;
    while (page <= 5 && !userId) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const found = data.users.find(
        (u) => (u.email ?? "").toLowerCase() === email,
      );
      if (found) {
        userId = found.id;
        break;
      }
      if (data.users.length < 200) break;
      page++;
    }
  } catch (err) {
    return jsonResponse(
      { error: "user_lookup_failed", details: String(err) },
      500,
    );
  }
  if (!userId) {
    return jsonResponse({ error: "user_not_found", email }, 404);
  }

  const deleted: Record<string, number> = {};
  const errors: Record<string, string> = {};

  // helper genérico
  async function purgeByUserId(table: string) {
    if (dryRun) {
      const { count, error } = await admin
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!);
      if (error) errors[table] = error.message;
      else deleted[table] = count ?? 0;
      return;
    }
    const { error, count } = await admin
      .from(table)
      .delete({ count: "exact" })
      .eq("user_id", userId!);
    if (error) errors[table] = error.message;
    else deleted[table] = count ?? 0;
  }

  // 1) Tabelas user_id
  for (const t of USER_ID_TABLES) {
    await purgeByUserId(t);
  }

  // 2) Quotes (seller_id) — apaga filhos via quote_id, depois quotes
  try {
    const { data: quoteRows, error: qErr } = await admin
      .from("quotes")
      .select("id")
      .eq("seller_id", userId);
    if (qErr) {
      errors["quotes_lookup"] = qErr.message;
    } else {
      const quoteIds = (quoteRows ?? []).map((r) => r.id);
      if (quoteIds.length > 0) {
        for (const child of QUOTE_CHILD_TABLES_BY_QUOTE_ID) {
          if (dryRun) {
            const { count, error } = await admin
              .from(child)
              .select("id", { count: "exact", head: true })
              .in("quote_id", quoteIds);
            if (error) errors[child] = error.message;
            else deleted[child] = count ?? 0;
          } else {
            const { error, count } = await admin
              .from(child)
              .delete({ count: "exact" })
              .in("quote_id", quoteIds);
            if (error) errors[child] = error.message;
            else deleted[child] = count ?? 0;
          }
        }
        if (dryRun) {
          deleted["quotes"] = quoteIds.length;
        } else {
          const { error, count } = await admin
            .from("quotes")
            .delete({ count: "exact" })
            .eq("seller_id", userId);
          if (error) errors["quotes"] = error.message;
          else deleted["quotes"] = count ?? 0;
        }
      } else {
        deleted["quotes"] = 0;
      }
    }
  } catch (err) {
    errors["quotes_block"] = String(err);
  }

  // 3) Audit log (best-effort, não crítico)
  try {
    await admin.from("admin_audit_log").insert({
      action: "e2e_cleanup",
      target_type: "user",
      target_id: userId,
      details: { email, dryRun, deleted, errors },
    });
  } catch {
    /* ignora se a tabela tiver schema diferente */
  }

  console.log(
    JSON.stringify({
      tag: "e2e_cleanup",
      email,
      userId,
      dryRun,
      deleted,
      errors,
      ms: Date.now() - startedAt,
    }),
  );

  return jsonResponse({
    ok: Object.keys(errors).length === 0,
    dryRun,
    userId,
    email,
    deleted,
    errors,
    totalMs: Date.now() - startedAt,
  });
});
