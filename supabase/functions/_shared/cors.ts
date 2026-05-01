// supabase/functions/_shared/cors.ts
// Centralized CORS configuration — restrict to known origins
//
// Observability: this module emits structured JSON logs (single-line) so they
// are searchable in Supabase function logs. Three event types:
//   - cors_boot           → emitted once per cold start (config snapshot)
//   - cors_preflight_ok   → 204 OPTIONS reply with allowed origin reflected
//   - cors_preflight_warn → preflight from unknown origin OR requesting a
//                           header that is NOT in Access-Control-Allow-Headers
// The boot log makes it trivial to confirm which `Access-Control-Allow-Headers`
// list is live in a given function deployment, and the preflight_warn log
// catches the most common cause of "Failed to fetch" errors.

const EXACT_ALLOWED_ORIGINS = new Set([
  'https://criar-together-now.lovable.app',
  'https://id-preview--1be35a65-1f65-4c2b-9a79-7d563930aacd.lovable.app',
  'https://1be35a65-1f65-4c2b-9a79-7d563930aacd.lovableproject.com',
  'https://promogifts.com.br',
  'https://www.promogifts.com.br',
  'https://promogifts.atomicabr.com.br',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
]);

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+\.atomicabr\.com\.br$/i,
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
];

const ALLOWED_HEADERS_LIST = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'x-request-id',
  'x-step-up-token',
  'x-supabase-client-platform',
  'x-supabase-client-platform-version',
  'x-supabase-client-runtime',
  'x-supabase-client-runtime-version',
];

const ALLOWED_HEADERS_SET = new Set(ALLOWED_HEADERS_LIST.map((h) => h.toLowerCase()));
const ALLOWED_HEADERS_VALUE = ALLOWED_HEADERS_LIST.join(', ');

const CORS_HEADERS_BASE = {
  'Access-Control-Allow-Headers': ALLOWED_HEADERS_VALUE,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'x-request-id',
};

// ---------- Structured logging ----------

function logCorsEvent(event: string, fields: Record<string, unknown>): void {
  // Single-line JSON keeps logs grep-friendly in Supabase log explorer.
  // We intentionally use `console.log` (not error) for boot/ok and
  // `console.warn` for warn so log levels filter correctly.
  const payload = { source: 'cors', event, ts: new Date().toISOString(), ...fields };
  const line = `[cors] ${JSON.stringify(payload)}`;
  if (event.endsWith('_warn') || event.endsWith('_blocked')) {
    console.warn(line);
  } else {
    console.log(line);
  }
}

// Emit a boot snapshot exactly once per cold start. This makes it trivial to
// confirm which Access-Control-Allow-Headers list is live in a given
// deployment, without having to ship a test request first.
let bootLogged = false;
function logBootIfNeeded(): void {
  if (bootLogged) return;
  bootLogged = true;
  logCorsEvent('cors_boot', {
    allow_headers: ALLOWED_HEADERS_VALUE,
    allow_headers_count: ALLOWED_HEADERS_LIST.length,
    allow_methods: CORS_HEADERS_BASE['Access-Control-Allow-Methods'],
    expose_headers: CORS_HEADERS_BASE['Access-Control-Expose-Headers'],
    exact_origins_count: EXACT_ALLOWED_ORIGINS.size,
    pattern_origins_count: ALLOWED_ORIGIN_PATTERNS.length,
  });
}
// Fire on module load (idempotent thanks to the flag above).
logBootIfNeeded();

function isAllowedOrigin(origin: string): boolean {
  return EXACT_ALLOWED_ORIGINS.has(origin) || ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

/**
 * Returns CORS headers with origin validation.
 * If the request origin is in the allowlist, it is reflected back.
 * Otherwise, the first allowed origin is used (blocks browser requests from unknown origins).
 *
 * Side-effect: when called inside an OPTIONS request, also emits a structured
 * preflight log so we get observability even in functions that do their own
 * inline `if (req.method === "OPTIONS") return new Response(...)` instead of
 * calling `handleCorsPreflightIfNeeded()`.
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin') || req?.headers.get('origin') || '';
  const fallbackOrigin = 'https://criar-together-now.lovable.app';
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : fallbackOrigin;

  if (req?.method === 'OPTIONS') {
    logPreflightFromRequest(req, origin);
  }

  return {
    ...CORS_HEADERS_BASE,
    'Access-Control-Allow-Origin': allowedOrigin,
  };
}

/**
 * Internal helper: emit cors_preflight_{ok,warn} based on the OPTIONS request.
 * Idempotent per call — the caller is responsible for calling at most once.
 */
function logPreflightFromRequest(req: Request, origin: string): void {
  const requestedHeadersRaw =
    req.headers.get('Access-Control-Request-Headers') ||
    req.headers.get('access-control-request-headers') ||
    '';
  const requestedMethod =
    req.headers.get('Access-Control-Request-Method') ||
    req.headers.get('access-control-request-method') ||
    '';
  const requestedHeaders = requestedHeadersRaw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const missingHeaders = requestedHeaders.filter((h) => !ALLOWED_HEADERS_SET.has(h));
  const originAllowed = !origin || isAllowedOrigin(origin);
  const requestId =
    req.headers.get('X-Request-Id') || req.headers.get('x-request-id') || null;

  const baseFields = {
    request_id: requestId,
    origin: origin || null,
    origin_allowed: originAllowed,
    requested_method: requestedMethod || null,
    requested_headers: requestedHeaders,
    missing_headers: missingHeaders,
  };

  if (!originAllowed || missingHeaders.length > 0) {
    logCorsEvent('cors_preflight_warn', {
      ...baseFields,
      reason: !originAllowed ? 'origin_not_allowed' : 'header_not_allowed',
      hint:
        missingHeaders.length > 0
          ? `Add to ALLOWED_HEADERS_LIST in _shared/cors.ts: ${missingHeaders.join(', ')}`
          : 'Add origin to EXACT_ALLOWED_ORIGINS or ALLOWED_ORIGIN_PATTERNS',
    });
  } else {
    logCorsEvent('cors_preflight_ok', baseFields);
  }
}

/**
 * Handle CORS preflight (OPTIONS) request.
 * Returns a Response if it's an OPTIONS request, null otherwise.
 *
 * Emits a structured log on every preflight so failures are easy to diagnose:
 *  - `cors_preflight_warn` when the Origin is unknown or when the browser
 *    requests a header that we do NOT allow (this is the #1 cause of
 *    "Failed to fetch" errors in the client).
 *  - `cors_preflight_ok` when the response is healthy.
 */
export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  // getCorsHeaders() emits the structured preflight log on its own when the
  // request method is OPTIONS, so we don't duplicate the log here.
  return new Response(null, { headers: getCorsHeaders(req) });
}

// ---------- Public / wildcard helpers (SSOT for inline-style endpoints) ----------

export interface PublicCorsOptions {
  /**
   * Extra header tokens to append to Access-Control-Allow-Headers.
   * Use for webhooks that accept custom headers like `x-signature-256`,
   * `x-event`, `x-webhook-secret`. Tokens are deduped + lowercased.
   */
  extraAllowHeaders?: string[];
  /**
   * Override Access-Control-Allow-Methods (default: same as restricted helper).
   * E.g. `"POST, OPTIONS"` for webhooks.
   */
  allowMethods?: string;
}

/**
 * Build CORS headers for **public/wildcard** endpoints (webhooks, public
 * resource viewers). Always exposes `x-request-id`.
 *
 * Use this helper instead of declaring an inline `corsHeaders` object — it
 * guarantees that every required header (`x-request-id`, `x-step-up-token`,
 * client telemetry headers) stays in sync with the rest of the platform.
 *
 * If you need origin allowlisting (browser-only endpoints), use
 * `getCorsHeaders(req)` instead.
 */
export function buildPublicCorsHeaders(opts: PublicCorsOptions = {}): Record<string, string> {
  const merged = new Set(ALLOWED_HEADERS_LIST.map((h) => h.toLowerCase()));
  for (const h of opts.extraAllowHeaders ?? []) {
    const t = h.trim().toLowerCase();
    if (t) merged.add(t);
  }
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': [...merged].join(', '),
    'Access-Control-Allow-Methods': opts.allowMethods ?? CORS_HEADERS_BASE['Access-Control-Allow-Methods'],
    'Access-Control-Expose-Headers': 'x-request-id',
  };
}

/**
 * Unified preflight handler — works for BOTH public-wildcard and
 * origin-restricted endpoints. Returns a 204 Response when the request is
 * OPTIONS, otherwise null. Always emits the structured preflight log.
 *
 * Examples:
 *   const pre = handleCorsPreflight(req); if (pre) return pre;                       // restricted
 *   const pre = handleCorsPreflight(req, { public: true }); if (pre) return pre;     // wildcard
 *   const pre = handleCorsPreflight(req, { public: true, extraAllowHeaders: ["x-signature-256"], allowMethods: "POST, OPTIONS" });
 */
export function handleCorsPreflight(
  req: Request,
  opts: { public?: boolean } & PublicCorsOptions = {},
): Response | null {
  if (req.method !== 'OPTIONS') return null;
  if (opts.public) {
    // Emit the same structured preflight log as the restricted path.
    const origin = req.headers.get('Origin') || req.headers.get('origin') || '';
    logPreflightFromRequest(req, origin);
    return new Response(null, { headers: buildPublicCorsHeaders(opts) });
  }
  // getCorsHeaders() emits the structured preflight log on its own when method=OPTIONS.
  return new Response(null, { headers: getCorsHeaders(req) });
}

/**
 * @deprecated Use `buildPublicCorsHeaders()` (or `handleCorsPreflight(req, { public: true })`).
 * Kept as a frozen alias for backwards compatibility.
 */
export const publicCorsHeaders = Object.freeze(buildPublicCorsHeaders());

/**
 * Exported for tests / introspection — never mutate at runtime.
 */
export const CORS_INTROSPECTION = Object.freeze({
  allowHeaders: ALLOWED_HEADERS_VALUE,
  allowHeadersList: Object.freeze([...ALLOWED_HEADERS_LIST]),
  allowMethods: CORS_HEADERS_BASE['Access-Control-Allow-Methods'],
  exposeHeaders: CORS_HEADERS_BASE['Access-Control-Expose-Headers'],
});

