import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-step-up-token',
  'Access-Control-Expose-Headers': 'x-request-id',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stats = {
      deleted_read_old: 0,
    };

    // Delete read notifications older than 90 days using the existing RPC
    const { error: cleanupError } = await supabase.rpc('cleanup_old_notifications');

    if (cleanupError) {
      console.warn('Cleanup RPC warning:', cleanupError.message);
    } else {
      stats.deleted_read_old = -1; // RPC doesn't return count
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        stats 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
