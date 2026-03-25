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
      throw new Error("Missing env vars");
    }

    const sql = `
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured_expires_at timestamptz DEFAULT NULL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bestseller_expires_at timestamptz DEFAULT NULL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_on_sale_expires_at timestamptz DEFAULT NULL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new_expires_at timestamptz DEFAULT NULL;
    `;

    const attempts: any[] = [];

    // Try various pg-meta paths
    const paths = [
      '/pg-meta/default/query',
      '/pg/query',
      '/rest/v1/rpc/exec_sql',
    ];

    for (const path of paths) {
      try {
        const url = `${externalUrl}${path}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${externalKey}`,
            'apikey': externalKey,
            'x-connection-encrypted': 'false',
          },
          body: JSON.stringify({ query: sql }),
        });
        const text = await response.text();
        attempts.push({ path, status: response.status, body: text.substring(0, 300) });
        
        if (response.ok) break;
      } catch (e: any) {
        attempts.push({ path, error: e.message });
      }
    }

    // Verify
    const supabase = createClient(externalUrl, externalKey);
    const { data: verify, error: verifyError } = await supabase
      .from("products")
      .select("id, is_featured_expires_at, is_bestseller_expires_at, is_on_sale_expires_at, is_new_expires_at")
      .limit(1);

    return new Response(JSON.stringify({
      success: !verifyError,
      attempts,
      verification: verifyError ? { error: verifyError.message } : { ok: true, sample: verify },
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
