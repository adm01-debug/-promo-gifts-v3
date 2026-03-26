import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

// CORS headers are now dynamic — use getCorsHeaders(req) inside the handler
// See _shared/cors.ts for the centralized configuration

// Rate limit configuration
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  login: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
  ai: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  approval: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
};

// In-memory store (note: resets on function cold start)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'anonymous';
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint } = await req.json();
    const clientIP = getClientIP(req);
    const config = RATE_LIMITS[endpoint] || RATE_LIMITS.api;
    
    const key = `${endpoint}:${clientIP}`;
    const now = Date.now();
    
    let record = requestCounts.get(key);
    
    // Reset if window expired
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + config.windowMs };
    }
    
    record.count++;
    requestCounts.set(key, record);
    
    // Clean old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of requestCounts.entries()) {
        if (now > v.resetAt) requestCounts.delete(k);
      }
    }
    
    const allowed = record.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - record.count);
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);

    if (!allowed) {
      // Log blocked request
      console.log(`Rate limit exceeded for ${clientIP} on ${endpoint}`);
      
      return new Response(
        JSON.stringify({
          allowed: false,
          error: 'Rate limit exceeded',
          remaining: 0,
          retryAfter,
          resetAt: new Date(record.resetAt).toISOString(),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': record.resetAt.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining,
        resetAt: new Date(record.resetAt).toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': record.resetAt.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('Rate limit check error:', error);
    return new Response(
      JSON.stringify({ allowed: true, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
