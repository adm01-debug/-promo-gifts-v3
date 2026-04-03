import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

interface NotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  category?: string;
  source_system: string;
  source_entity_type?: string;
  source_entity_id?: string;
  channels?: string[];
  priority?: number;
  action_url?: string;
  action_label?: string;
  action_data?: any;
  scheduled_for?: string;
}

// CORS headers are now dynamic — use getCorsHeaders(req) inside the handler
// See _shared/cors.ts for the centralized configuration

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

    // 1. Buscar preferências do usuário
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.user_id)
      .single();

    // 2. Verificar DND
    const { data: isDND } = await supabase
      .rpc('is_dnd_active', { p_user_id: payload.user_id });

    if (isDND && payload.priority !== 3) {
      payload.scheduled_for = calculateNextAvailableTime(prefs);
    }

    // 3. Determinar canais baseado em preferências
    let channels = payload.channels || ['in_app'];
    
    if (prefs) {
      const categoryPrefs = prefs.preferences[payload.category || 'system'];
      if (categoryPrefs) {
        channels = filterChannelsByPreferences(channels, categoryPrefs, prefs);
      }
    }

    // 4. Verificar agrupamento
    let groupKey: string | null = null;
    if (prefs?.grouping_enabled && payload.category) {
      groupKey = `${payload.source_system}:${payload.category}:${payload.user_id}`;
      
      const { data: recentNotif } = await supabase
        .from('notifications')
        .select('id, group_count')
        .eq('group_key', groupKey)
        .eq('is_read', false)
        .gte('created_at', new Date(Date.now() - (prefs.grouping_window_minutes || 5) * 60000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentNotif) {
        await supabase
          .from('notifications')
          .update({
            group_count: recentNotif.group_count + 1,
            is_grouped: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recentNotif.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            grouped: true,
            notification_id: recentNotif.id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. Criar notificação
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        ...payload,
        channels,
        group_key: groupKey,
      })
      .select()
      .single();

    if (error) throw error;

    // 6. Processar canais
    const deliveryStatus: any = {};

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await sendEmail(notification, prefs);
            deliveryStatus.email = 'sent';
            break;
          case 'push':
            await sendPush(notification, prefs);
            deliveryStatus.push = 'sent';
            break;
          case 'sms':
            await sendSMS(notification, prefs);
            deliveryStatus.sms = 'sent';
            break;
          case 'whatsapp':
            await sendWhatsApp(notification, prefs);
            deliveryStatus.whatsapp = 'sent';
            break;
        }
      } catch (err) {
        console.error(`Erro ao enviar ${channel}:`, err);
        deliveryStatus[channel] = 'failed';
      }
    }

    // 7. Atualizar status de entrega
    await supabase
      .from('notifications')
      .update({
        delivered_at: new Date().toISOString(),
        delivery_status: deliveryStatus,
      })
      .eq('id', notification.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notification.id,
        delivery_status: deliveryStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendEmail(notification: any, prefs: any) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) return;
  
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Notificações <noreply@promobrindes.com.br>',
      to: prefs?.email || notification.user_email,
      subject: notification.title,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
          ${notification.action_url ? `
            <a href="${notification.action_url}" 
               style="display: inline-block; padding: 12px 24px; 
                      background: #3b82f6; color: white; 
                      text-decoration: none; border-radius: 6px;">
              ${notification.action_label || 'Ver detalhes'}
            </a>
          ` : ''}
        </div>
      `,
    }),
  });

  if (!res.ok) throw new Error('Falha ao enviar email');
}

async function sendPush(notification: any, prefs: any) {
  console.log('Push notification:', notification.id);
}

async function sendSMS(notification: any, prefs: any) {
  if (!prefs?.phone_number) return;

  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER');
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE) return;

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: prefs.phone_number,
        From: TWILIO_PHONE,
        Body: `${notification.title}\n${notification.message}`,
      }),
    }
  );

  if (!res.ok) throw new Error('Falha ao enviar SMS');
}

async function sendWhatsApp(notification: any, prefs: any) {
  if (!prefs?.whatsapp_number) return;

  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_WHATSAPP = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP) return;

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: `whatsapp:${prefs.whatsapp_number}`,
        From: TWILIO_WHATSAPP,
        Body: `*${notification.title}*\n${notification.message}`,
      }),
    }
  );

  if (!res.ok) throw new Error('Falha ao enviar WhatsApp');
}

function filterChannelsByPreferences(channels: string[], categoryPrefs: any, prefs: any) {
  return channels.filter(channel => {
    switch (channel) {
      case 'email': return prefs.email_enabled && categoryPrefs.channels.includes('email');
      case 'push': return prefs.push_enabled && categoryPrefs.channels.includes('push');
      case 'sms': return prefs.sms_enabled && categoryPrefs.channels.includes('sms');
      case 'whatsapp': return prefs.whatsapp_enabled && categoryPrefs.channels.includes('whatsapp');
      default: return true;
    }
  });
}

function calculateNextAvailableTime(prefs: any): string {
  const now = new Date();
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
}
