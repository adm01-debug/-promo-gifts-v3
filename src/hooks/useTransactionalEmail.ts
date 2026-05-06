/**
 * useTransactionalEmail — Hook para enviar emails transacionais.
 */
import { supabase } from '@/integrations/supabase/client';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';

const log = createClientLogger('hooks.useTransactionalEmail');


export type EmailEventType = 'quote_sent' | 'quote_approved' | 'quote_rejected' | 'order_created';

interface SendEmailParams {
  event_type: EmailEventType;
  recipient_email: string;
  recipient_name?: string;
  data: Record<string, unknown>;
}

export async function sendTransactionalEmail(params: SendEmailParams) {
  try {
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: params,
    });

    if (error) {
      log.error('send_failed', { error, params });
      return { success: false, error: error.message };
    }


    return { success: true, data };
  } catch (err) {
    log.error('unexpected_error', { err, params });
    return { success: false, error: 'Unexpected error' };
  }

}
