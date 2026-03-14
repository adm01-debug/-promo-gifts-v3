import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const key = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
    if (!url || !key) throw new Error("Missing external DB credentials");

    const client = createClient(url, key);

    // Add variant_id and supplier_code columns to product_videos
    const { error: e1 } = await client.rpc("exec_sql" as any, {
      sql: "ALTER TABLE product_videos ADD COLUMN IF NOT EXISTS variant_id uuid DEFAULT NULL;"
    });

    // Try direct approach if RPC not available
    if (e1) {
      // Use postgrest to check if columns exist
      const { data: sample } = await client.from("product_videos").select("*").limit(1);
      const hasVariantId = sample && sample.length > 0 && 'variant_id' in sample[0];
      const hasSupplierCode = sample && sample.length > 0 && 'supplier_code' in sample[0];

      return new Response(JSON.stringify({
        success: false,
        message: "Cannot execute DDL via RPC. Columns status:",
        variant_id_exists: hasVariantId,
        supplier_code_exists: hasSupplierCode,
        instruction: "Run manually on external DB: ALTER TABLE product_videos ADD COLUMN IF NOT EXISTS variant_id uuid DEFAULT NULL; ALTER TABLE product_videos ADD COLUMN IF NOT EXISTS supplier_code text DEFAULT NULL;"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
