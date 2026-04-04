import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";

const NotificationSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  message: z.string().min(1).max(5000),
  type: z.string().max(50).optional().default('info'),
  category: z.string().max(50).optional().default('system'),
  source_system: z.string().min(1).max(100),
  source_entity_type: z.string().max(100).optional(),
  source_entity_id: z.string().max(100).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'push', 'sms', 'whatsapp'])).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  action_url: z.string().url().max(2000).optional(),
  action_label: z.string().max(100).optional(),
  action_data: z.record(z.unknown()).optional(),
  scheduled_for: z.string().datetime().optional(),
});

function jsonRes(corsHeaders: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

    const rawBody = await req.json();
    const parsed = NotificationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonRes(corsHeaders, { error: 'Invalid payload', details: parsed.error.flatten().fieldErrors }, 400);
    }

    const payload = parsed.data;

    // 1. Buscar preferências do usuário
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.user_id)
      .single();

    // 2. Verificar DND
    const { data: isDND } = await supabase
      .rpc('is_dnd_active', { p_user_id: payload.user_id });

    let scheduledFor = payload.scheduled_for;
    if (isDND && payload.priority !== 3) {
      scheduledFor = calculateNextAvailableTime(prefs);
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

        return jsonRes(corsHeaders, { 
          success: true, 
          grouped: true,
          notification_id: recentNotif.id 
        });
      }
    }

    // 5. Criar notificação
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        ...payload,
        scheduled_for: scheduledFor,
        channels,
        group_key: groupKey,
      })
      .select()
      .single();

    if (error) throw error;

    // 6. Processar canais
    const deliveryStatus: Record<string, string> = {};

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
      } catch (_err) {
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

    return jsonRes(corsHeaders, { 
      success: true, 
      notification_id: notification.id,
      delivery_status: deliveryStatus
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonRes(corsHeaders, { error: errorMessage }, 500);
  }
});

// deno-lint-ignore no-explicit-any
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

// deno-lint-ignore no-explicit-any
async function sendPush(_notification: any, _prefs: any) {
  // Push not yet implemented
}

// deno-lint-ignore no-explicit-any
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

// deno-lint-ignore no-explicit-any
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

// deno-lint-ignore no-explicit-any
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

// deno-lint-ignore no-explicit-any
function calculateNextAvailableTime(_prefs: any): string {
  const now = new Date();
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
}
