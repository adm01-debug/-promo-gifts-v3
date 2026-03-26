// supabase/functions/_shared/cors.ts
// Centralized CORS configuration — restrict to known origins

const ALLOWED_ORIGINS = [
  'https://criar-together-now.lovable.app',
  'https://id-preview--1be35a65-1f65-4c2b-9a79-7d563930aacd.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

const CORS_HEADERS_BASE = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Returns CORS headers with origin validation.
 * If the request origin is in the allowlist, it is reflected back.
 * Otherwise, the first allowed origin is used (blocks browser requests from unknown origins).
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin') || req?.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    ...CORS_HEADERS_BASE,
    'Access-Control-Allow-Origin': allowedOrigin,
  };
}

/**
 * Handle CORS preflight (OPTIONS) request.
 * Returns a Response if it's an OPTIONS request, null otherwise.
 */
export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}

/**
 * Legacy wildcard CORS headers for public-facing endpoints
 * (webhooks, public quote views, public kit views).
 * Use sparingly — only for endpoints that MUST be accessible from any origin.
 */
export const publicCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
