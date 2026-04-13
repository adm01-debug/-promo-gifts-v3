import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const BodySchema = z.object({
  event_type: z.string().min(1, "event_type is required"),
  payload: z.unknown().optional(),
  notification_id: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { event_type, payload } = parsed.data;

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
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'Promo-Brindes-Webhooks/1.0',
            'X-Event-Type': event_type,
          };

          if (webhook.secret) {
            const signature = await generateHMACSignature(
              JSON.stringify(payload),
              webhook.secret
            );
            headers['X-Webhook-Signature'] = signature;
          }

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
              await new Promise(resolve => 
                setTimeout(resolve, webhook.retry_delay_seconds * 1000)
              );
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          lastError = errorMessage;
          
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

async function generateHMACSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return encodeHex(new Uint8Array(signature));
}