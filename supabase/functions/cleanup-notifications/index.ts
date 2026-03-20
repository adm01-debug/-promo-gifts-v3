/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stats = {
      deleted_notifications: 0,
      deleted_webhook_logs: 0,
      archived_notifications: 0,
    };

    // 1. Deletar notificações lidas com mais de 90 dias
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const { count: deletedNotifs } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('is_read', true)
      .lt('created_at', cutoffDate.toISOString());

    stats.deleted_notifications = deletedNotifs || 0;

    // 2. Arquivar notificações não lidas muito antigas (>180 dias)
    const archiveCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    
    // Aqui você pode implementar arquivamento para outra tabela
    // Por ora, vamos apenas marcar com flag de expiração
    const { count: archived } = await supabase
      .from('notifications')
      .update({ expires_at: new Date().toISOString() }, { count: 'exact' })
      .is('expires_at', null)
      .eq('is_read', false)
      .lt('created_at', archiveCutoff.toISOString());

    stats.archived_notifications = archived || 0;

    // 3. Limpar webhook logs antigos (>30 dias)
    const webhookCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { count: deletedLogs } = await supabase
      .from('webhook_logs')
      .delete({ count: 'exact' })
      .lt('created_at', webhookCutoff.toISOString());

    stats.deleted_webhook_logs = deletedLogs || 0;

    // 4. Resetar contadores de webhooks que não falharam nos últimos 7 dias
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    await supabase
      .from('webhook_configs')
      .update({ failed_calls: 0 })
      .gt('failed_calls', 0)
      .or(`last_triggered_at.is.null,last_triggered_at.lt.${weekAgo.toISOString()}`);

    // 5. Deletar notificações expiradas
    const { count: expiredCount } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    stats.deleted_notifications += (expiredCount || 0);

    return new Response(
      JSON.stringify({ 
        success: true, 
        timestamp: new Date().toISOString(),
        stats 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
