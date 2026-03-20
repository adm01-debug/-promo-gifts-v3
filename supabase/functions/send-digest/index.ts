/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM
    const currentDay = now.getDay(); // 0=Dom, 6=Sáb

    // Buscar usuários com digest habilitado para este horário
    const { data: users, error: usersError } = await supabase
      .from('notification_preferences')
      .select('user_id, digest_time, digest_frequency, digest_days')
      .eq('digest_enabled', true);

    if (usersError) throw usersError;

    const results = [];

    for (const user of users || []) {
      // Verificar se é o horário do digest
      const digestTime = user.digest_time?.substring(0, 5);
      if (digestTime !== currentTime) continue;

      // Para digest semanal, verificar dia
      if (user.digest_frequency === 'weekly') {
        if (!user.digest_days || !user.digest_days.includes(currentDay)) {
          continue;
        }
      }

      // Buscar notificações não lidas das últimas 24h
      const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('is_read', false)
        .gte('created_at', cutoffDate.toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (!notifications || notifications.length === 0) continue;

      // Agrupar por categoria
      const byCategory: Record<string, any[]> = {};
      for (const notif of notifications) {
        const cat = notif.category || 'system';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(notif);
      }

      // Gerar HTML do digest
      const html = generateDigestHTML(notifications, byCategory);

      // Enviar email
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        continue;
      }

      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Resumo Diário <digest@promobrindes.com.br>',
            to: (user as any).user_email || 'user@example.com',
            subject: `📬 Resumo: ${notifications.length} notificações`,
            html,
          }),
        });

        if (emailResponse.ok) {
          results.push({ 
            user_id: user.user_id, 
            status: 'sent',
            count: notifications.length 
          });
        } else {
          results.push({ 
            user_id: user.user_id, 
            status: 'failed' 
          });
        }
      } catch (err) {
        console.error(`Failed to send digest to ${user.user_id}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({ 
          user_id: user.user_id, 
          status: 'error',
          error: errorMessage 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        digests_sent: results.length,
        results 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Digest error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function generateDigestHTML(notifications: any[], byCategory: Record<string, any[]>) {
  const categoryNames: Record<string, string> = {
    approval: '🔔 Aprovações',
    alert: '⚠️ Alertas',
    reminder: '📌 Lembretes',
    system: '⚙️ Sistema',
    social: '👥 Social',
  };

  let categoriesHTML = '';
  for (const [cat, notifs] of Object.entries(byCategory)) {
    const categoryName = categoryNames[cat] || cat;
    categoriesHTML += `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 12px;">
          ${categoryName} (${notifs.length})
        </h3>
        <div style="background: #f9fafb; border-radius: 8px; padding: 12px;">
    `;

    for (const notif of notifs.slice(0, 5)) { // Max 5 por categoria
      categoriesHTML += `
        <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #111827;">${notif.title}</strong><br>
          <span style="color: #6b7280; font-size: 14px;">${notif.message}</span>
        </div>
      `;
    }

    if (notifs.length > 5) {
      categoriesHTML += `
        <div style="padding: 8px 0; color: #6b7280; font-size: 14px;">
          + ${notifs.length - 5} mais...
        </div>
      `;
    }

    categoriesHTML += `</div></div>`;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #111827; font-size: 24px; margin-bottom: 8px;">
            📬 Resumo de Notificações
          </h1>
          <p style="color: #6b7280; font-size: 14px;">
            Você tem ${notifications.length} notificações não lidas
          </p>
        </div>

        ${categoriesHTML}

        <div style="text-align: center; margin-top: 32px; padding-top: 24px; 
                    border-top: 1px solid #e5e7eb;">
          <a href="https://app.promobrindes.com.br/notifications" 
             style="display: inline-block; padding: 12px 24px; background: #3b82f6; 
                    color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Ver Todas as Notificações
          </a>
        </div>

        <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
          <p>Você está recebendo este email porque habilitou o resumo diário de notificações.</p>
          <p>
            <a href="#" style="color: #9ca3af; text-decoration: underline;">
              Gerenciar Preferências
            </a>
          </p>
        </div>
      </body>
    </html>
  `;
}
