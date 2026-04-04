import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { RateLimiter, applyRateLimit } from "../_shared/rate-limiter.ts";
import { z } from "npm:zod@3.23.8";

const LoginAttemptSchema = z.object({
  email: z.string().email().max(255),
  user_id: z.string().uuid().nullish(),
  ip_address: z.string().max(45).default("unknown"),
  success: z.boolean(),
  failure_reason: z.string().max(500).nullish(),
  user_agent: z.string().max(512).nullish(),
});

// Rate limiter: 10 login log attempts per minute per IP
const loginLogLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: 'login-log',
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  try {
    // Rate limit by IP
    const rateLimitResponse = await applyRateLimit(req, loginLogLimiter);
    if (rateLimitResponse) {
      const headers = new Headers(rateLimitResponse.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
      return new Response(rateLimitResponse.body, {
        status: rateLimitResponse.status,
        headers,
      });
    }

    const parsed = LoginAttemptSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { email, user_id, ip_address, success, failure_reason, user_agent } = parsed.data;

    // Sanitize inputs
    const sanitizedEmail = emailStr.slice(0, 255);
    const sanitizedIP = String(ip_address || "unknown").slice(0, 45);
    const sanitizedUA = user_agent ? String(user_agent).slice(0, 512) : null;
    const sanitizedReason = failure_reason ? String(failure_reason).slice(0, 500) : null;

    // Validate user_id format if provided (must be UUID-like)
    let sanitizedUserId: string | null = null;
    if (user_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(String(user_id))) {
        sanitizedUserId = String(user_id);
      }
    }

    // Use service_role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabaseAdmin.from("login_attempts").insert({
      email: sanitizedEmail,
      user_id: sanitizedUserId,
      ip_address: sanitizedIP,
      success,
      failure_reason: sanitizedReason,
      user_agent: sanitizedUA,
    });

    if (error) {
      console.error("Failed to log login attempt:", error.message);
      return new Response(
        JSON.stringify({ error: "Failed to log attempt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("log-login-attempt error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
