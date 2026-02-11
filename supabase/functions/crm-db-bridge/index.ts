import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Whitelist de tabelas permitidas
const ALLOWED_TABLES = [
  "companies",
  "company_contacts",
  "company_addresses",
  "company_social_media",
  "contact_emails",
  "contact_phones",
  "customers",
  "suppliers",
  "carriers",
];

interface CrmQuery {
  table: string;
  operation: "select" | "search";
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: string | { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  search?: { column: string; term: string };
  // Para joins simples
  relations?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CRM_URL = Deno.env.get("CRM_SUPABASE_URL");
    const CRM_KEY = Deno.env.get("CRM_SUPABASE_ANON_KEY");

    if (!CRM_URL || !CRM_KEY) {
      return new Response(
        JSON.stringify({ error: "CRM database credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const crm = createClient(CRM_URL, CRM_KEY);
    const body: CrmQuery = await req.json();
    const { table, operation, id, filters, select, orderBy, limit, offset, search, relations } = body;

    // Validar tabela
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Table '${table}' is not allowed. Allowed: ${ALLOWED_TABLES.join(", ")}` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (operation === "select") {
      const selectFields = select || (relations ? `${select || "*"}, ${relations}` : "*");
      let query = crm.from(table).select(selectFields);

      // Busca por ID
      if (id) {
        const { data, error } = await query.eq("id", id).single();
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: error.code === "PGRST116" ? 404 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ data, count: 1 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Filtros
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value === null) {
            query = query.is(key, null);
          } else if (typeof value === "object" && value !== null) {
            const filterObj = value as Record<string, unknown>;
            if ("in" in filterObj) query = query.in(key, filterObj.in as unknown[]);
            if ("ilike" in filterObj) query = query.ilike(key, filterObj.ilike as string);
            if ("eq" in filterObj) query = query.eq(key, filterObj.eq);
            if ("neq" in filterObj) query = query.neq(key, filterObj.neq as string);
            if ("gt" in filterObj) query = query.gt(key, filterObj.gt as string);
            if ("gte" in filterObj) query = query.gte(key, filterObj.gte as string);
            if ("lt" in filterObj) query = query.lt(key, filterObj.lt as string);
            if ("lte" in filterObj) query = query.lte(key, filterObj.lte as string);
            if ("not_null" in filterObj) query = query.not(key, "is", null);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      // Busca textual
      if (search) {
        query = query.ilike(search.column, `%${search.term}%`);
      }

      // Ordenação
      if (orderBy) {
        if (typeof orderBy === "string") {
          query = query.order(orderBy);
        } else {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }
      }

      // Paginação
      if (limit) query = query.limit(limit);
      if (offset) query = query.range(offset, offset + (limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data: data || [], count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (operation === "search") {
      if (!search?.column || !search?.term) {
        return new Response(
          JSON.stringify({ error: "Search requires 'column' and 'term'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let query = crm.from(table).select(select || "*").ilike(search.column, `%${search.term}%`);

      if (orderBy) {
        if (typeof orderBy === "string") {
          query = query.order(orderBy);
        } else {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }
      }

      query = query.limit(limit || 50);

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data: data || [], count: data?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Operation '${operation}' not supported. Use 'select' or 'search'.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("CRM Bridge error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
