import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Whitelist de tabelas permitidas
const ALLOWED_TABLES = [
  "companies",
  "contacts",
  "company_addresses",
  "company_social_media",
  "contact_emails",
  "contact_phones",
  "customers",
  "suppliers",
  "carriers",
  // Quote tables
  "quotes",
  "quote_items",
  "quote_item_personalizations",
  "quote_history",
  "quote_approval_tokens",
  "quote_templates",
];

interface CrmQuery {
  table: string;
  operation: "select" | "search" | "insert" | "update" | "delete";
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: string | { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  search?: { column: string; term: string };
  relations?: string;
  // Write operations
  data?: Record<string, unknown> | Record<string, unknown>[];
  returning?: string;
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
    const { table, operation, id, filters, select, orderBy, limit, offset, search, relations, data, returning } = body;

    // Validar tabela
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Table '${table}' is not allowed. Allowed: ${ALLOWED_TABLES.join(", ")}` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== INSERT =====
    if (operation === "insert") {
      if (!data) {
        return new Response(
          JSON.stringify({ error: "Insert requires 'data' field" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Auto-generate quote_number for quotes table
      if (table === "quotes") {
        const now = new Date();
        const year = now.getFullYear();
        const yearShort = String(year).slice(-2);

        // Get the last quote number for this year from CRM
        const { data: lastQuotes } = await crm
          .from("quotes")
          .select("quote_number")
          .ilike("quote_number", `%/${yearShort}`)
          .order("quote_number", { ascending: false })
          .limit(1);

        let nextNumber = 10001;

        if (lastQuotes && lastQuotes.length > 0) {
          const rawNum = (lastQuotes[0].quote_number || "").split("/")[0].trim();
          const lastNum = parseInt(rawNum || "10000", 10);
          if (!isNaN(lastNum) && lastNum >= 10000) {
            nextNumber = lastNum + 1;
          }
        }

        const generatedNumber = `${nextNumber}/${yearShort}`.trim();

        // Apply to single or batch insert
        if (Array.isArray(data)) {
          // batch: only set on items missing quote_number
          (data as Record<string, unknown>[]).forEach((row) => {
            if (!row.quote_number || row.quote_number === "") {
              row.quote_number = generatedNumber;
            }
          });
        } else {
          const row = data as Record<string, unknown>;
          if (!row.quote_number || row.quote_number === "") {
            row.quote_number = generatedNumber;
          }
        }
      }

      let query = crm.from(table).insert(data as any).select(returning || "*");

      const { data: result, error } = await query;

      // After insert, if this is quotes table and we generated a quote_number,
      // force-update it because the external CRM trigger may overwrite with old format
      if (!error && result && result.length > 0 && table === "quotes") {
        const insertedRow = result[0] as Record<string, unknown>;
        const targetNumber = Array.isArray(data)
          ? (data[0] as Record<string, unknown>).quote_number
          : (data as Record<string, unknown>).quote_number;

        if (
          targetNumber &&
          targetNumber !== "" &&
          insertedRow.quote_number !== targetNumber
        ) {
          // Force the correct number via update
          await crm
            .from("quotes")
            .update({ quote_number: targetNumber })
            .eq("id", insertedRow.id as string);

          insertedRow.quote_number = targetNumber;
        }
      }

      if (error) {
        console.error("CRM insert error:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data: result, count: result?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== UPDATE =====
    if (operation === "update") {
      if (!data) {
        return new Response(
          JSON.stringify({ error: "Update requires 'data' field" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let query = crm.from(table).update(data as any);

      // Apply filters
      if (id) {
        query = query.eq("id", id);
      } else if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value === null) {
            query = query.is(key, null);
          } else if (typeof value === "object" && value !== null) {
            const filterObj = value as Record<string, unknown>;
            if ("eq" in filterObj) query = query.eq(key, filterObj.eq);
            if ("in" in filterObj) query = query.in(key, filterObj.in as unknown[]);
            if ("neq" in filterObj) query = query.neq(key, filterObj.neq as string);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      const { data: result, error } = await query.select(returning || "*");

      if (error) {
        console.error("CRM update error:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data: result, count: result?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== DELETE =====
    if (operation === "delete") {
      let query = crm.from(table).delete();

      // Apply filters
      if (id) {
        query = query.eq("id", id);
      } else if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value === null) {
            query = query.is(key, null);
          } else if (typeof value === "object" && value !== null) {
            const filterObj = value as Record<string, unknown>;
            if ("eq" in filterObj) query = query.eq(key, filterObj.eq);
            if ("in" in filterObj) query = query.in(key, filterObj.in as unknown[]);
          } else {
            query = query.eq(key, value);
          }
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Delete requires 'id' or 'filters' to prevent mass deletion" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await query;

      if (error) {
        console.error("CRM delete error:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data: null, success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== SELECT =====
    if (operation === "select") {
      const selectFields = select || (relations ? `${select || "*"}, ${relations}` : "*");
      let query = crm.from(table).select(selectFields);

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

      if (search) {
        query = query.ilike(search.column, `%${search.term}%`);
      }

      if (orderBy) {
        if (typeof orderBy === "string") {
          query = query.order(orderBy);
        } else {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }
      }

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

    // ===== SEARCH =====
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
      JSON.stringify({ error: `Operation '${operation}' not supported.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("CRM Bridge error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
