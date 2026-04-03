import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";

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
// TYPES
// ============================================

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

  // Fix quote_number if it was overridden by DB default
  if (!error && result?.length && table === "quotes") {
    const insertedRow = result[0] as Record<string, unknown>;
    const targetNumber = Array.isArray(data)
      ? (data[0] as Record<string, unknown>).quote_number
      : (data as Record<string, unknown>).quote_number;

    if (targetNumber && targetNumber !== "" && insertedRow.quote_number !== targetNumber) {
      await crm.from("quotes").update({ quote_number: targetNumber }).eq("id", insertedRow.id as string);
      insertedRow.quote_number = targetNumber;
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
  let query = crm.from(table).select(selectFields);

  if (id) {
    const { data, error } = await query.eq("id", id).maybeSingle();
    if (error) {
      if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
        return createOptionalSelectFallback(table, true);
      }
      return jsonResponse({ error: error.message }, 500);
    }
    if (!data) {
      return jsonResponse({ error: "Record not found" }, 404);
    }
    return jsonResponse({ data, count: 1 });
  }

  if (filters) query = applyFilters(query, filters);
  if (search) query = query.ilike(search.column, `%${search.term}%`);
  if (orderBy) query = applyOrdering(query, orderBy);
  if (limit) query = query.limit(limit);
  if (offset) query = query.range(offset, offset + (limit || 50) - 1);

  const { data, error, count } = await query;
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

  try {
    const auth = await authenticateRequest(req);
    if (auth.error) return auth.error;

    const CRM_URL = Deno.env.get("CRM_SUPABASE_URL");
    const CRM_KEY = Deno.env.get("CRM_SUPABASE_ANON_KEY");
    if (!CRM_URL || !CRM_KEY) {
      return jsonResponse({ error: "CRM database credentials not configured" }, 500);
    }

    const crm = createClient(CRM_URL, CRM_KEY);
    const body = await req.json() as CrmQuery;
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
    switch (operation) {
      case "insert": return handleInsert(crm, body);
      case "update": return handleUpdate(crm, body);
      case "delete": return handleDelete(crm, body);
      case "select": return handleSelect(crm, body);
      case "search": return handleSearch(crm, body);
      default: return jsonResponse({ error: `Operation '${operation}' not supported.` }, 400);
    }
  } catch (error: unknown) {
    console.error("CRM Bridge error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});