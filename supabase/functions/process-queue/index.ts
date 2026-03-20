/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar notificações agendadas que já passaram do horário
    const { data: scheduledNotifs, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .lte('scheduled_for', new Date().toISOString())
      .is('delivered_at', null)
      .limit(100);

    if (fetchError) throw fetchError;

    if (!scheduledNotifs || scheduledNotifs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0,
          message: 'No scheduled notifications to process'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const notif of scheduledNotifs) {
      try {
        // Chamar send-notification para processar
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: notif.user_id,
              title: notif.title,
              message: notif.message,
              type: notif.type,
              category: notif.category,
              source_system: notif.source_system,
              source_entity_type: notif.source_entity_type,
              source_entity_id: notif.source_entity_id,
              channels: notif.channels,
              priority: notif.priority,
              action_url: notif.action_url,
              action_label: notif.action_label,
              action_data: notif.action_data,
            }),
          }
        );

        if (response.ok) {
          // Marcar como entregue
          await supabase
            .from('notifications')
            .update({ 
              delivered_at: new Date().toISOString(),
              scheduled_for: null 
            })
            .eq('id', notif.id);

          results.push({ id: notif.id, status: 'success' });
        } else {
          results.push({ id: notif.id, status: 'failed' });
        }
      } catch (err) {
        console.error(`Error processing notification ${notif.id}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({ id: notif.id, status: 'error', error: errorMessage });
      }
    }

    // 2. Processar notificações com falha (retry)
    const { data: failedNotifs } = await supabase
      .from('notifications')
      .select('*')
      .not('delivery_status', 'is', null)
      .filter('delivery_status', 'cs', '"failed"')
      .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5 min atrás
      .limit(50);

    if (failedNotifs && failedNotifs.length > 0) {
      for (const notif of failedNotifs) {
        // Retry apenas canais que falharam
        const failedChannels = Object.entries(notif.delivery_status || {})
          .filter(([_, status]) => status === 'failed')
          .map(([channel]) => channel);

        if (failedChannels.length > 0) {
          try {
            await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ...notif,
                  channels: failedChannels,
                }),
              }
            );
          } catch (err) {
            console.error(`Retry failed for ${notif.id}:`, err);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Queue processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
