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

    // Use PostgREST's underlying connection to run DDL via rpc
    // Since we can't run DDL via PostgREST, we'll use the Management API
    // Actually, let's use the Supabase SQL endpoint
    const projectRef = new URL(externalUrl).hostname.split('.')[0];
    
    // Try adding columns via REST - we'll use a workaround:
    // First check if columns exist by selecting them
    const supabase = createClient(externalUrl, externalKey);
    
    const testColumns = ['is_featured_expires_at', 'is_bestseller_expires_at', 'is_on_sale_expires_at', 'is_new_expires_at'];
    
    // Test which columns already exist
    const { data: testData, error: testError } = await supabase
      .from("products")
      .select("id, " + testColumns.join(", "))
      .limit(1);

    if (!testError) {
      return new Response(JSON.stringify({
        success: true,
        message: "All columns already exist!",
        sample: testData,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Columns don't exist - we need to add them via SQL
    // Use the database URL directly if available
    const dbUrl = Deno.env.get("EXTERNAL_DB_URL");
    
    return new Response(JSON.stringify({
      success: false,
      message: "Columns don't exist yet. PostgREST error: " + testError.message,
      hint: "Need ALTER TABLE access via SQL endpoint or database URL",
      columns_needed: testColumns,
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200 
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
