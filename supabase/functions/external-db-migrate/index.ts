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

    const supabase = createClient(externalUrl, externalKey);

    // Use RPC to execute SQL - create a helper function first via RPC
    // Actually, let's try executing raw SQL via the supabase-js client's internal postgres connection
    // The cleanest way: use rpc to call a function that runs DDL
    
    // Approach: Create a temporary function, run it, then drop it
    const sql = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_featured_expires_at') THEN
          ALTER TABLE products ADD COLUMN is_featured_expires_at timestamptz DEFAULT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_bestseller_expires_at') THEN
          ALTER TABLE products ADD COLUMN is_bestseller_expires_at timestamptz DEFAULT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_on_sale_expires_at') THEN
          ALTER TABLE products ADD COLUMN is_on_sale_expires_at timestamptz DEFAULT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_new_expires_at') THEN
          ALTER TABLE products ADD COLUMN is_new_expires_at timestamptz DEFAULT NULL;
        END IF;
      END $$;
    `;

    // Try multiple SQL execution methods
    const attempts: any[] = [];

    // Method 1: Direct SQL via REST API /sql endpoint (Supabase pg-meta)
    const projectRef = new URL(externalUrl).hostname.split('.')[0];
    
    // Method 2: Try the /rest/v1/rpc/exec_sql if it exists
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', { sql_text: sql });
    attempts.push({ method: 'rpc_exec_sql', data: rpcData, error: rpcError?.message });

    // Method 3: Try via management API
    const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
    const mgmtResponse = await fetch(mgmtUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${externalKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const mgmtText = await mgmtResponse.text();
    attempts.push({ method: 'management_api', status: mgmtResponse.status, response: mgmtText.substring(0, 500) });

    // Verify
    const { data: verify, error: verifyError } = await supabase
      .from("products")
      .select("id, is_featured_expires_at, is_bestseller_expires_at, is_on_sale_expires_at, is_new_expires_at")
      .limit(1);

    return new Response(JSON.stringify({
      success: !verifyError,
      attempts,
      verification: verifyError ? { error: verifyError.message } : { columns_exist: true, sample: verify },
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
