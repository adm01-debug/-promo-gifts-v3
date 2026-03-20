/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { HmacSha256 } from "https://deno.land/std@0.177.0/hash/sha256.ts";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event_type, payload, notification_id } = await req.json();

    // Buscar webhooks ativos para este tipo de evento
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('is_active', true)
      .contains('events', [event_type]);

    if (webhooksError) throw webhooksError;

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          dispatched: 0,
          message: 'No active webhooks for this event'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const webhook of webhooks) {
      let attemptNumber = 1;
      let success = false;
      let lastError = null;

      while (attemptNumber <= webhook.max_retries && !success) {
        try {
          // Gerar HMAC signature se secret configurado
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'Promo-Brindes-Webhooks/1.0',
            'X-Event-Type': event_type,
          };

          if (webhook.secret) {
            const signature = generateHMACSignature(
              JSON.stringify(payload),
              webhook.secret
            );
            headers['X-Webhook-Signature'] = signature;
          }

          // Enviar webhook
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              event: event_type,
              timestamp: new Date().toISOString(),
              data: payload,
            }),
          });

          const responseBody = await response.text();

          // Log
          await supabase.from('webhook_logs').insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            status_code: response.status,
            response_body: responseBody,
            success: response.ok,
            attempt_number: attemptNumber,
          });

          if (response.ok) {
            success = true;
            
            // Atualizar stats
            await supabase
              .from('webhook_configs')
              .update({
                last_triggered_at: new Date().toISOString(),
                total_calls: webhook.total_calls + 1,
              })
              .eq('id', webhook.id);

            results.push({
              webhook_id: webhook.id,
              url: webhook.url,
              status: 'success',
              attempts: attemptNumber,
            });
          } else {
            lastError = `HTTP ${response.status}: ${responseBody}`;
            
            if (attemptNumber < webhook.max_retries) {
              // Wait before retry
              await new Promise(resolve => 
                setTimeout(resolve, webhook.retry_delay_seconds * 1000)
              );
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          lastError = errorMessage;
          
          // Log erro
          await supabase.from('webhook_logs').insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            status_code: null,
            response_body: errorMessage,
            success: false,
            attempt_number: attemptNumber,
          });

          if (attemptNumber < webhook.max_retries) {
            await new Promise(resolve => 
              setTimeout(resolve, webhook.retry_delay_seconds * 1000)
            );
          }
        }

        attemptNumber++;
      }

      if (!success) {
        // Atualizar contador de falhas
        await supabase
          .from('webhook_configs')
          .update({
            failed_calls: webhook.failed_calls + 1,
          })
          .eq('id', webhook.id);

        results.push({
          webhook_id: webhook.id,
          url: webhook.url,
          status: 'failed',
          attempts: attemptNumber - 1,
          error: lastError,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        dispatched: webhooks.length,
        results 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook dispatcher error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function generateHMACSignature(payload: string, secret: string): string {
  const hmac = new HmacSha256(secret);
  hmac.update(payload);
  return hmac.toString();
}
