import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

interface NotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  category?: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NotificationPayload = await req.json();

    if (!payload.user_id || !payload.title || !payload.message) {
      return new Response(
        JSON.stringify({ error: 'user_id, title, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check DND status
    const { data: isDND } = await supabase.rpc('is_dnd_active');

    if (isDND) {
      console.log(`User ${payload.user_id} is in DND mode, notification queued`);
    }

    // Insert into workspace_notifications (the actual table)
    const { data: notification, error } = await supabase
      .from('workspace_notifications')
      .insert({
        user_id: payload.user_id,
        title: payload.title,
        message: payload.message,
        type: payload.type || 'info',
        category: payload.category || 'system',
        action_url: payload.action_url || null,
        metadata: payload.metadata || {},
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notification.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
