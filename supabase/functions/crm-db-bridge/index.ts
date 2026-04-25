import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";
import { runBotProtection } from '../_shared/bot-protection.ts';
import { getBreaker, circuitOpenResponse } from '../_shared/circuit-breaker.ts';

const breaker = getBreaker("crm-db");

// ============================================
// CRM CLIENT — singleton por isolate + warm-up no boot
// ============================================
// Mesma estratégia da external-db-bridge (1 client por isolate, fetch keep-alive
// mantém socket TLS aberto). Antes desta otimização cada request criava um novo
// client (linha ~627), pagando handshake TLS + auth a cada chamada paralela.
// Profile do dashboard mostrava 2.66s de cold-start no primeiro hit ao CRM.
let cachedCrmClient: SupabaseClient | null = null;
let crmWarmupPromise: Promise<void> | null = null;

function buildCrmClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getCrmClient(): SupabaseClient | null {
  if (cachedCrmClient) return cachedCrmClient;
  const url = Deno.env.get("CRM_SUPABASE_URL");
  const key = Deno.env.get("CRM_SUPABASE_SERVICE_KEY") ?? Deno.env.get("CRM_SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  cachedCrmClient = buildCrmClient(url, key);
  return cachedCrmClient;
}

/**
 * Warm-up no boot do isolate — abre TLS + handshake PostgREST em paralelo
 * ao Deno.serve. Não bloqueia o handler; idempotente.
 *
 * Faz `select id from companies limit 1` (tabela quente conhecida) — mesmo
 * shape que o `prewarmExternalDb` chama no front, então o cache HTTP do
 * PostgREST schema já fica preparado para a primeira request real.
 */
function warmupCrmClient(): Promise<void> {
  if (crmWarmupPromise) return crmWarmupPromise;
  crmWarmupPromise = (async () => {
    try {
      const client = getCrmClient();
      if (!client) {
        console.warn('[crm-boot-warmup] ⚠️ CRM_SUPABASE_URL/KEY not configured');
        return;
      }
      const t0 = performance.now();
      const { error } = await client.from('companies').select('id').limit(1);
      const ms = Math.round(performance.now() - t0);
      if (error) {
        console.warn(`[crm-boot-warmup] ⚠️ ${error.message} (${ms}ms)`);
      } else {
        console.log(`[crm-boot-warmup] ✅ crm client ready (${ms}ms)`);
      }
    } catch (e) {
      console.warn(`[crm-boot-warmup] ⚠️ ${e instanceof Error ? e.message : String(e)}`);
    }
  })();
  return crmWarmupPromise;
}

// Dispara warm-up no boot do isolate (não-bloqueante).
warmupCrmClient();


// ============================================
// CORS
// ============================================

// CORS headers are now dynamic — initialized per-request in Deno.serve
// See _shared/cors.ts for the centralized configuration
let corsHeaders: Record<string, string> = {};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================
// CONSTANTS
// ============================================

const ALLOWED_TABLES = [
  "companies", "contacts", "company_addresses", "company_social_media",
  "contact_emails", "contact_phones", "customers", "suppliers", "carriers",
];

const VENDOR_WRITE_TABLES: string[] = [];

const OPTIONAL_QUOTE_TABLES = new Set<string>();

// ============================================
// TYPE-SAFE RESULT HELPERS
// ============================================

/**
 * Narrow an unknown value (which may also be a PostgREST GenericStringError
 * or any other non-row payload) to a plain Record<string, unknown>.
 * Returns null when the value is not a usable row object.
 */
export function toRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) return null;
  // PostgREST GenericStringError has shape { error: true; message: string }
  // and should never be treated as a row.
  const maybeErr = value as { error?: unknown; message?: unknown };
  if (maybeErr.error === true && typeof maybeErr.message === "string") return null;
  return value as Record<string, unknown>;
}

/**
 * Safely access the first row of a PostgREST result (`data` from `.select()`),
 * which Supabase types as `T[] | null` but at runtime can also surface
 * `GenericStringError`-like payloads when selectors fail. Returns null
 * unless the first element is a real row object.
 */
export function firstRowAsRecord(result: unknown): Record<string, unknown> | null {
  if (!Array.isArray(result) || result.length === 0) return null;
  return toRecord(result[0]);
}

/**
 * Classify the shape of a PostgREST `data` payload returned by an
 * insert/update so we can log clearly when it is NOT a real row array.
 *
 * Possible shapes:
 *  - "rows"        → expected: Array<Record>
 *  - "empty-array" → [] returned (no rows affected, no error)
 *  - "null"        → null returned
 *  - "generic-string-error" → { error: true, message: "..." } (PostgREST shape)
 *  - "single-object"        → object returned instead of array (.single()/.maybeSingle())
 *  - "primitive"            → string/number/boolean
 *  - "unknown"              → anything else
 */
export type InsertResultShape =
  | "rows"
  | "empty-array"
  | "null"
  | "generic-string-error"
  | "single-object"
  | "primitive"
  | "unknown";

export interface InsertResultDiagnostic {
  shape: InsertResultShape;
  rowCount: number;
  /** Stringified preview of the payload (truncated) for log readability. */
  preview: string;
  /** Extracted message when shape is "generic-string-error". */
  errorMessage?: string;
}

const PREVIEW_MAX = 400;

function previewValue(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    if (!json) return String(value);
    return json.length > PREVIEW_MAX ? `${json.slice(0, PREVIEW_MAX)}…` : json;
  } catch {
    return String(value);
  }
}

export function inspectInsertResult(value: unknown): InsertResultDiagnostic {
  if (value === null) return { shape: "null", rowCount: 0, preview: "null" };
  if (value === undefined) return { shape: "null", rowCount: 0, preview: "undefined" };

  if (Array.isArray(value)) {
    if (value.length === 0) return { shape: "empty-array", rowCount: 0, preview: "[]" };
    const first = value[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const maybeErr = first as { error?: unknown; message?: unknown };
      if (maybeErr.error === true && typeof maybeErr.message === "string") {
        return {
          shape: "generic-string-error",
          rowCount: value.length,
          preview: previewValue(value),
          errorMessage: maybeErr.message,
        };
      }
      return { shape: "rows", rowCount: value.length, preview: previewValue(value) };
    }
    return { shape: "unknown", rowCount: value.length, preview: previewValue(value) };
  }

  if (typeof value === "object") {
    const maybeErr = value as { error?: unknown; message?: unknown };
    if (maybeErr.error === true && typeof maybeErr.message === "string") {
      return {
        shape: "generic-string-error",
        rowCount: 0,
        preview: previewValue(value),
        errorMessage: maybeErr.message,
      };
    }
    return { shape: "single-object", rowCount: 1, preview: previewValue(value) };
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { shape: "primitive", rowCount: 0, preview: previewValue(value) };
  }
  return { shape: "unknown", rowCount: 0, preview: previewValue(value) };
}

/**
 * Emit a structured log line whenever an insert/update result is not a
 * regular array of rows. This makes runtime debugging of GenericStringError
 * (and other unexpected shapes) trivial — search logs for `result-shape-anomaly`.
 *
 * Returns true if an anomaly was logged.
 */
export function logInsertResultIfAnomalous(
  context: { callSite: string; table: string; operation: "insert" | "update"; returning?: string },
  diagnostic: InsertResultDiagnostic,
): boolean {
  if (diagnostic.shape === "rows") return false;

  const payload = {
    event: "result-shape-anomaly",
    callSite: context.callSite,
    operation: context.operation,
    table: context.table,
    returning: context.returning ?? "*",
    shape: diagnostic.shape,
    rowCount: diagnostic.rowCount,
    errorMessage: diagnostic.errorMessage,
    preview: diagnostic.preview,
  };

  const icon = diagnostic.shape === "generic-string-error" ? "🚨" : "⚠️";
  console.error(
    `[crm-db-bridge] ${icon} result-shape-anomaly op=${context.operation} table=${context.table} ` +
      `shape=${diagnostic.shape}` +
      (diagnostic.errorMessage ? ` message="${diagnostic.errorMessage}"` : "") +
      ` → ${JSON.stringify(payload)}`,
  );
  return true;
}


interface CrmQuery {
  table: string;
  operation: "select" | "search" | "insert" | "update" | "delete" | "batch";
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: string | { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  search?: { column: string; term: string };
  relations?: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  returning?: string;
  queries?: BatchQuery[];
}

interface BatchQuery {
  table: string;
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: string | { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  search?: { column: string; term: string };
}

interface AuthResult {
  userId: string | null;
  userRole: string;
  error?: Response;
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

// ============================================
// AUTH
// ============================================

async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, userRole: "public", error: jsonResponse({ error: "Autenticação necessária" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (!user || userError) {
    console.error("CRM auth failed:", userError?.message);
    return { userId: null, userRole: "public", error: jsonResponse({ error: "Token inválido ou expirado" }, 401) };
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleData } = await adminClient
    .from("user_roles").select("role").eq("user_id", user.id).single();

  const userRole = roleData?.role || "vendedor";
  console.log(`Request from user: ${user.id}, role: ${userRole}`);
  return { userId: user.id, userRole };
}

// ============================================
// FILTER BUILDER (shared by all operations)
// ============================================

function applyFilters(query: any, filters: Record<string, unknown>): any {
  for (const [key, value] of Object.entries(filters)) {
    if (value === null) {
      query = query.is(key, null);
    } else if (typeof value === "object" && value !== null) {
      const f = value as Record<string, unknown>;
      if ("in" in f) query = query.in(key, f.in as unknown[]);
      if ("ilike" in f) query = query.ilike(key, f.ilike as string);
      if ("eq" in f) query = query.eq(key, f.eq);
      if ("neq" in f) query = query.neq(key, f.neq as string);
      if ("gt" in f) query = query.gt(key, f.gt as string);
      if ("gte" in f) query = query.gte(key, f.gte as string);
      if ("lt" in f) query = query.lt(key, f.lt as string);
      if ("lte" in f) query = query.lte(key, f.lte as string);
      if ("not_null" in f) query = query.not(key, "is", null);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

function applyOrdering(query: any, orderBy: string | { column: string; ascending?: boolean }): any {
  if (typeof orderBy === "string") {
    return query.order(orderBy);
  }
  return query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
}

// ============================================
// OPTIONAL QUOTES MODULE FALLBACKS
// ============================================

function isOptionalQuoteTable(table: string): boolean {
  return OPTIONAL_QUOTE_TABLES.has(table);
}

function isMissingTableError(error: PostgrestLikeError | null | undefined, table: string): boolean {
  if (!error) return false;
  const message = error.message || "";
  return error.code === "PGRST205" || message.includes(`Could not find the table 'public.${table}' in the schema cache`);
}

function getOptionalTableMessage(table: string): string {
  return `Módulo de orçamentos indisponível no CRM externo (${table})`;
}

function createOptionalSelectFallback(table: string, isSingleRecord = false): Response {
  const warning = getOptionalTableMessage(table);
  console.warn(`[crm-db-bridge] ${warning} — retornando fallback vazio para leitura.`);

  return jsonResponse({
    data: isSingleRecord ? null : [],
    count: 0,
    unavailable: true,
    warning,
  });
}

function createOptionalWriteError(table: string): Response {
  const error = getOptionalTableMessage(table);
  console.warn(`[crm-db-bridge] ${error} — bloqueando operação de escrita.`);
  return jsonResponse({ error }, 503);
}

// ============================================
// QUOTE NUMBER GENERATOR
// ============================================

async function generateQuoteNumber(crm: SupabaseClient, data: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
  const now = new Date();
  const yearShort = String(now.getFullYear()).slice(-2);

  const { data: lastQuotes } = await crm
    .from("quotes")
    .select("quote_number")
    .ilike("quote_number", `%/${yearShort}`)
    .order("quote_number", { ascending: false })
    .limit(50);

  let maxNum = 10000;
  if (lastQuotes?.length) {
    for (const row of lastQuotes) {
      const parsed = parseInt((row.quote_number || "").replace(/\s+/g, "").split("/")[0] || "0", 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    }
  }

  const generatedNumber = `${maxNum + 1}/${yearShort}`;
  const rows = Array.isArray(data) ? data : [data];
  for (const row of rows) {
    if (!row.quote_number || row.quote_number === "") {
      row.quote_number = generatedNumber;
    }
  }
}

// ============================================
// OPERATION HANDLERS
// ============================================

async function handleBatch(crm: SupabaseClient, queries: BatchQuery[]): Promise<Response> {
  if (!Array.isArray(queries) || queries.length === 0) {
    return jsonResponse({ error: 'Batch requires a non-empty "queries" array' }, 400);
  }
  if (queries.length > 10) {
    return jsonResponse({ error: "Batch limited to 10 queries max" }, 400);
  }

  const batchStart = performance.now();
  const results = await Promise.all(
    queries.map(async (q, idx) => {
      if (!q.table || !ALLOWED_TABLES.includes(q.table)) {
        return { success: false, error: `Table '${q.table}' not allowed` };
      }
      try {
        const queryStart = performance.now();
        let query = crm.from(q.table).select(q.select || "*");

        if (q.filters) query = applyFilters(query, q.filters);
        if (q.search?.column && q.search?.term) {
          query = query.ilike(q.search.column, `%${q.search.term}%`);
        }
        if (q.orderBy) query = applyOrdering(query, q.orderBy);
        if (q.limit) query = query.limit(q.limit);
        if (q.offset) query = query.range(q.offset, q.offset + (q.limit || 50) - 1);

        const { data, error } = await query;
        const duration = Math.round(performance.now() - queryStart);

        if (error) {
          if (isOptionalQuoteTable(q.table) && isMissingTableError(error, q.table)) {
            const warning = getOptionalTableMessage(q.table);
            console.warn(`[batch] Query ${idx} (${q.table}) optional table missing — fallback vazio.`);
            return {
              success: true,
              unavailable: true,
              warning,
              data: { records: [], count: 0 },
            };
          }

          console.error(`[batch] Query ${idx} (${q.table}) error: ${error.message}`);
          return { success: false, error: error.message };
        }
        console.log(`[batch] Query ${idx} (${q.table}) ${duration}ms, ${(data || []).length} records`);
        return { success: true, data: { records: data || [], count: (data || []).length } };
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
      }
    })
  );

  console.log(`[batch] Total: ${Math.round(performance.now() - batchStart)}ms for ${queries.length} queries`);
  return jsonResponse({ success: true, results });
}

async function handleInsert(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, data, returning } = body;
  if (!data) return jsonResponse({ error: "Insert requires 'data' field" }, 400);

  if (table === "quotes") {
    await generateQuoteNumber(crm, data);
  }

  const { data: result, error } = await crm.from(table).insert(data as any).select(returning || "*");

  // Diagnose result shape BEFORE doing anything else so GenericStringError
  // payloads (and other anomalies) are visible immediately in runtime logs.
  if (!error) {
    const diag = inspectInsertResult(result);
    logInsertResultIfAnomalous(
      { callSite: "handleInsert", table, operation: "insert", returning: returning || "*" },
      diag,
    );
  }

  // Fix quote_number if it was overridden by DB default
  if (!error && table === "quotes") {
    const insertedRow = firstRowAsRecord(result);
    if (insertedRow) {
      const sourceRow = Array.isArray(data) ? toRecord(data[0]) : toRecord(data);
      const targetNumber = sourceRow?.quote_number;

      if (targetNumber && targetNumber !== "" && insertedRow.quote_number !== targetNumber) {
        await crm.from("quotes").update({ quote_number: targetNumber }).eq("id", insertedRow.id as string);
        insertedRow.quote_number = targetNumber;
      }
    }
  }

  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalWriteError(table);
    }
    console.error("CRM insert error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ data: result, count: result?.length || 0 });
}

async function handleUpdate(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters, data, returning } = body;
  if (!data) return jsonResponse({ error: "Update requires 'data' field" }, 400);

  let query = crm.from(table).update(data as any);

  if (id) {
    query = query.eq("id", id);
  } else if (filters) {
    query = applyFilters(query, filters);
  }

  const { data: result, error } = await query.select(returning || "*");
  if (!error) {
    const diag = inspectInsertResult(result);
    logInsertResultIfAnomalous(
      { callSite: "handleUpdate", table, operation: "update", returning: returning || "*" },
      diag,
    );
  }
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalWriteError(table);
    }
    console.error("CRM update error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ data: result, count: result?.length || 0 });
}

async function handleDelete(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters } = body;
  let query = crm.from(table).delete();

  if (id) {
    query = query.eq("id", id);
  } else if (filters) {
    query = applyFilters(query, filters);
  } else {
    return jsonResponse({ error: "Delete requires 'id' or 'filters' to prevent mass deletion" }, 400);
  }

  const { error } = await query;
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalWriteError(table);
    }
    console.error("CRM delete error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ data: null, success: true });
}

async function handleSelect(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters, select, orderBy, limit, offset, search, relations } = body;
  const selectFields = select || (relations ? `${select || "*"}, ${relations}` : "*");
  
  console.log(`[SELECT] table=${table}, selectFields=${selectFields}, filters=${JSON.stringify(filters)}, limit=${limit}`);
  
  let query = crm.from(table).select(selectFields);

  if (id) {
    const { data, error } = await query.eq("id", id).single();
    if (error) {
      console.error(`[SELECT] single error: code=${error.code}, message=${error.message}, details=${JSON.stringify(error)}`);
      if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
        return createOptionalSelectFallback(table, true);
      }
      return jsonResponse({ error: error.message }, error.code === "PGRST116" ? 404 : 500);
    }
    return jsonResponse({ data, count: 1 });
  }

  if (filters) query = applyFilters(query, filters);
  if (search) query = query.ilike(search.column, `%${search.term}%`);
  if (orderBy) query = applyOrdering(query, orderBy);
  if (limit) query = query.limit(limit);
  if (offset) query = query.range(offset, offset + (limit || 50) - 1);

  const { data, error, count, status, statusText } = await query;
  console.log(`[SELECT] result: status=${status}, statusText=${statusText}, dataLength=${(data || []).length}, error=${error ? JSON.stringify(error) : 'none'}, count=${count}`);
  
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalSelectFallback(table, false);
    }
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ data: data || [], count });
}

async function handleSearch(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, search, select, orderBy, limit } = body;
  if (!search?.column || !search?.term) {
    return jsonResponse({ error: "Search requires 'column' and 'term'" }, 400);
  }

  let query = crm.from(table).select(select || "*").ilike(search.column, `%${search.term}%`);
  if (orderBy) query = applyOrdering(query, orderBy);
  query = query.limit(limit || 50);

  const { data, error } = await query;
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
      return createOptionalSelectFallback(table, false);
    }
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ data: data || [], count: data?.length || 0 });
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!breaker.canRequest()) {
    return circuitOpenResponse("crm-db", corsHeaders);
  }

  try {
    // Anti-scraping: bot UA check + rate limit por IP (camada externa antes do auth)
    const protection = await runBotProtection(req, {
      endpoint: 'crm-db-bridge',
      maxRequests: 120,
      windowSeconds: 60,
      blockSeconds: 1800,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    const auth = await authenticateRequest(req);
    if (auth.error) return auth.error;

    const CRM_URL = Deno.env.get("CRM_SUPABASE_URL");
    const CRM_SERVICE_KEY = Deno.env.get("CRM_SUPABASE_SERVICE_KEY");
    const CRM_KEY = CRM_SERVICE_KEY || Deno.env.get("CRM_SUPABASE_ANON_KEY");
    if (!CRM_URL || !CRM_KEY) {
      return jsonResponse({ error: "CRM database credentials not configured" }, 500);
    }

    const CRM_ANON = Deno.env.get("CRM_SUPABASE_ANON_KEY") || "";
    const keysMatch = CRM_SERVICE_KEY === CRM_ANON;
    console.log(`[crm-db-bridge] CRM_URL prefix: ${CRM_URL.substring(0, 30)}..., using ${CRM_SERVICE_KEY ? 'SERVICE_KEY' : 'ANON_KEY'} (len=${CRM_KEY.length}), anon_len=${CRM_ANON.length}, KEYS_MATCH=${keysMatch}, svc_last4=${CRM_KEY.slice(-4)}, anon_last4=${CRM_ANON.slice(-4)}`);

    // DIAGNOSTIC: test raw REST call to verify key works
    try {
      const testUrl = `${CRM_URL}/rest/v1/companies?select=id&limit=1`;
      const testResp = await fetch(testUrl, {
        headers: {
          'apikey': CRM_KEY,
          'Authorization': `Bearer ${CRM_KEY}`,
        },
      });
      const testBody = await testResp.text();
      console.log(`[DIAG] Raw REST: status=${testResp.status}, body=${testBody.substring(0, 200)}`);
    } catch (diagErr) {
      console.error(`[DIAG] Raw REST error:`, diagErr);
    }

    // Reusa client cacheado no escopo do módulo (singleton por isolate).
    // Warm-up no boot já abriu TLS+handshake, então a primeira request não
    // paga cold-start. Em rajada paralela, fetch keep-alive evita re-handshake.
    const crm = getCrmClient();
    if (!crm) {
      return jsonResponse({ error: "CRM database credentials not configured" }, 500);
    }

    // Validate body with Zod schema
    let rawBody: unknown;
    try { rawBody = await req.json(); } catch {
      return jsonResponse({ error: "Invalid JSON in request body" }, 400);
    }

    const CrmRequestSchema = z.object({
      operation: z.enum(["select", "search", "insert", "update", "delete", "batch"]),
      table: z.string().trim().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/i).optional(),
      id: z.string().uuid().optional(),
      filters: z.record(z.unknown()).optional(),
      select: z.string().max(2000).optional(),
      orderBy: z.union([z.string(), z.object({ column: z.string(), ascending: z.boolean().optional() })]).optional(),
      limit: z.number().int().min(1).max(1000).optional(),
      offset: z.number().int().min(0).optional(),
      search: z.object({ column: z.string(), term: z.string() }).optional(),
      relations: z.string().max(2000).optional(),
      data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional(),
      returning: z.string().max(2000).optional(),
      queries: z.array(z.record(z.unknown())).max(10).optional(),
    });

    const parsed = CrmRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, 400);
    }

    const body = parsed.data as CrmQuery;
    const { operation, table } = body;

    // Write permission check for vendedores
    if (["insert", "update", "delete"].includes(operation) && auth.userRole === "vendedor") {
      if (!VENDOR_WRITE_TABLES.includes(table)) {
        return jsonResponse({ error: "Permissão insuficiente para modificar esta tabela" }, 403);
      }
    }

    // Batch handler (no table validation needed — done per-query inside)
    if (operation === "batch") {
      return handleBatch(crm, body.queries || []);
    }

    // Table whitelist
    if (!ALLOWED_TABLES.includes(table)) {
      return jsonResponse({ error: `Table '${table}' is not allowed. Allowed: ${ALLOWED_TABLES.join(", ")}` }, 403);
    }

    // Route to operation handler
    let response: Response;
    switch (operation) {
      case "insert": response = await handleInsert(crm, body); break;
      case "update": response = await handleUpdate(crm, body); break;
      case "delete": response = await handleDelete(crm, body); break;
      case "select": response = await handleSelect(crm, body); break;
      case "search": response = await handleSearch(crm, body); break;
      default: return jsonResponse({ error: `Operation '${operation}' not supported.` }, 400);
    }
    if (response.status >= 500) breaker.recordFailure(); else breaker.recordSuccess();
    return response;
  } catch (error: unknown) {
    breaker.recordFailure();
    console.error("CRM Bridge error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});