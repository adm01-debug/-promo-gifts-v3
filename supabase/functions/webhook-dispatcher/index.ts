// webhook-dispatcher: dispatches an event to all active outbound_webhooks
// subscribed to that event. HMAC signs payload with webhook secret. Retries
// with backoff and logs each attempt to webhook_deliveries.
// Called publicly from DB triggers (no JWT) — but only acts on events
// declared in outbound_webhooks rows that the admin created.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  event: z.string().min(1),
  payload: z.unknown().optional(),
});

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return encodeHex(new Uint8Array(sig));
}

async function payloadHash(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return encodeHex(new Uint8Array(hash));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { event, payload } = parsed.data;

    const { data: hooks, error } = await supabase
      .from("outbound_webhooks")
      .select("*")
      .eq("active", true)
      .contains("events", [event]);
    if (error) throw error;

    if (!hooks || hooks.length === 0) {
      return new Response(JSON.stringify({ ok: true, dispatched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyJson = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload ?? null,
    });
    const phash = await payloadHash(bodyJson);
    const results: Array<Record<string, unknown>> = [];

    for (const hook of hooks) {
      const policy = hook.retry_policy ?? { max_attempts: 3, backoff_seconds: [5, 30, 120] };
      const max = Math.max(1, Math.min(5, Number(policy.max_attempts ?? 3)));
      const backoff = Array.isArray(policy.backoff_seconds) ? policy.backoff_seconds : [5, 30, 120];
      let success = false;
      let attempt = 0;

      while (attempt < max && !success) {
        attempt++;
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "User-Agent": "PromoGifts-Webhooks/1.0",
            "X-Event": event,
            "X-Webhook-Id": hook.id,
            "X-Delivery-Attempt": String(attempt),
          };
          const secret = hook.secret_ref ? Deno.env.get(hook.secret_ref) : null;
          if (secret) headers["X-Signature-256"] = "sha256=" + await hmacSign(bodyJson, secret);

          const res = await fetch(hook.url, { method: "POST", headers, body: bodyJson });
          const respText = (await res.text()).slice(0, 4000);

          await supabase.from("webhook_deliveries").insert({
            webhook_id: hook.id,
            event,
            payload: payload ?? null,
            payload_hash: phash,
            status_code: res.status,
            response_body_truncated: respText,
            attempt,
            success: res.ok,
            error_message: res.ok ? null : `HTTP ${res.status}`,
          });

          if (res.ok) {
            success = true;
            await supabase.from("outbound_webhooks").update({
              last_triggered_at: new Date().toISOString(),
              total_success: (hook.total_success ?? 0) + 1,
            }).eq("id", hook.id);
            results.push({ webhook_id: hook.id, status: "success", attempt });
          } else if (attempt < max) {
            const delay = (backoff[attempt - 1] ?? backoff[backoff.length - 1] ?? 30) * 1000;
            await new Promise((r) => setTimeout(r, delay));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          await supabase.from("webhook_deliveries").insert({
            webhook_id: hook.id, event, payload: payload ?? null, payload_hash: phash,
            status_code: null, response_body_truncated: msg.slice(0, 4000),
            attempt, success: false, error_message: msg,
          });
          if (attempt < max) {
            const delay = (backoff[attempt - 1] ?? 30) * 1000;
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }

      if (!success) {
        await supabase.from("outbound_webhooks").update({
          total_failure: (hook.total_failure ?? 0) + 1,
        }).eq("id", hook.id);
        results.push({ webhook_id: hook.id, status: "failed", attempts: attempt });
      }
    }

    return new Response(JSON.stringify({ ok: true, dispatched: hooks.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
