import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

    if (!externalUrl || !externalKey) {
      throw new Error("Missing EXTERNAL_SUPABASE_URL or EXTERNAL_SUPABASE_SERVICE_KEY");
    }

    // Use the Supabase SQL endpoint (pg-meta) to run ALTER TABLE
    // The service key gives us access to the SQL endpoint
    const sqlStatements = [
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured_expires_at timestamptz DEFAULT NULL",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bestseller_expires_at timestamptz DEFAULT NULL",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_on_sale_expires_at timestamptz DEFAULT NULL",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new_expires_at timestamptz DEFAULT NULL",
    ];

    const results: any[] = [];

    for (const sql of sqlStatements) {
      // Use the /rest/v1/rpc endpoint won't work for DDL
      // Use the /pg endpoint (pg-meta REST API)
      const pgMetaUrl = `${externalUrl}/pg/query`;
      
      const response = await fetch(pgMetaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${externalKey}`,
          'apikey': externalKey,
        },
        body: JSON.stringify({ query: sql }),
      });

      const responseText = await response.text();
      results.push({
        sql,
        status: response.status,
        response: responseText.substring(0, 500),
      });
    }

    // Verify columns now exist
    const supabase = createClient(externalUrl, externalKey);
    const { data: verify, error: verifyError } = await supabase
      .from("products")
      .select("id, is_featured_expires_at, is_bestseller_expires_at, is_on_sale_expires_at, is_new_expires_at")
      .limit(1);

    return new Response(JSON.stringify({
      success: !verifyError,
      results,
      verification: verifyError ? { error: verifyError.message } : { columns_exist: true, sample: verify },
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
