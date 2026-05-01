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

    // Fetch unread notifications grouped by user
    const { data: unreadNotifs, error } = await supabase
      .from('workspace_notifications')
      .select('user_id, id, title, message, type, category, created_at')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    if (!unreadNotifs || unreadNotifs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          digests_sent: 0,
          message: 'No unread notifications for digest'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by user
    const byUser = new Map<string, typeof unreadNotifs>();
    for (const notif of unreadNotifs) {
      const existing = byUser.get(notif.user_id) || [];
      existing.push(notif);
      byUser.set(notif.user_id, existing);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        users_with_unread: byUser.size,
        total_unread: unreadNotifs.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Digest error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
