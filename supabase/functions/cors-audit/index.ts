// supabase/functions/cors-audit/index.ts
//
// Diagnostic endpoint — returns the CORS configuration of every edge function
// in the project so you can audit which custom headers are accepted and spot
// any function that's missing a recently-added header.
//
// Auth: admin/dev only (uses authorize() with admin role).
//
// Response shape:
//   {
//     shared: { allowHeaders, exposeHeaders, allowMethods, exposeHeadersList? },
//     snapshot: { generated_at, total, counts, functions: [...] },
//     audit: {
//       missing_in_inline: { header: [funcName, ...] }, // headers present in
//                                                       // shared but missing
//                                                       // from inline funcs
//       extra_in_inline: { header: [funcName, ...] }    // headers in inline
//                                                       // not in shared (often
//                                                       // legitimate, e.g.
//                                                       // x-signature-256)
//     }
//   }
//
// Build/refresh the snapshot with:  node scripts/build-cors-snapshot.mjs

import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { CORS_INTROSPECTION, getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import snapshot from "../_shared/cors-snapshot.json" with { type: "json" };

type SnapshotFunction = {
  name: string;
  mode: "shared" | "inline" | "none";
  allowHeaders: string[];
  exposeHeaders: string[];
  allowMethods: string | null;
  allowOrigin: string | null;
};

type Snapshot = {
  generated_at: string;
  total: number;
  counts: { shared: number; inline: number; none: number };
  functions: SnapshotFunction[];
};

function buildAudit(snap: Snapshot) {
  const sharedAllow = new Set(
    CORS_INTROSPECTION.allowHeadersList.map((h) => h.toLowerCase()),
  );
  const sharedExpose = new Set(
    CORS_INTROSPECTION.exposeHeaders.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean),
  );

  const missing_in_inline: Record<string, string[]> = {};
  const extra_in_inline: Record<string, string[]> = {};

  for (const fn of snap.functions) {
    if (fn.mode !== "inline") continue;

    const inlineAllow = new Set(fn.allowHeaders);
    // Missing: in shared, not in inline
    for (const h of sharedAllow) {
      if (!inlineAllow.has(h)) {
        (missing_in_inline[h] ||= []).push(fn.name);
      }
    }
    // Extra: in inline, not in shared
    for (const h of inlineAllow) {
      if (!sharedAllow.has(h)) {
        (extra_in_inline[h] ||= []).push(fn.name);
      }
    }

    // Expose-headers: missing
    for (const h of sharedExpose) {
      if (!fn.exposeHeaders.includes(h)) {
        (missing_in_inline[`expose:${h}`] ||= []).push(fn.name);
      }
    }
  }

  return { missing_in_inline, extra_in_inline };
}

Deno.serve(async (req) => {
  const log = createStructuredLogger(req, { fn: "cors-audit" });

  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  // Admin-only: use authorize() with role gate
  const auth = await authorize(req, { requireRole: ["admin", "dev"] });
  if (!auth.ok) {
    log.warn("cors_audit_denied", { reason: auth.reason });
    return new Response(
      JSON.stringify({ error: "forbidden", reason: auth.reason }),
      { status: auth.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const snap = snapshot as Snapshot;
  const audit = buildAudit(snap);

  log.info("cors_audit_ok", {
    total: snap.total,
    inline: snap.counts.inline,
    missing_count: Object.values(audit.missing_in_inline).reduce((a, b) => a + b.length, 0),
    extra_count: Object.values(audit.extra_in_inline).reduce((a, b) => a + b.length, 0),
  });

  return new Response(
    JSON.stringify({
      shared: {
        allowHeaders: CORS_INTROSPECTION.allowHeaders,
        allowHeadersList: CORS_INTROSPECTION.allowHeadersList,
        allowMethods: CORS_INTROSPECTION.allowMethods,
        exposeHeaders: CORS_INTROSPECTION.exposeHeaders,
      },
      snapshot: snap,
      audit,
    }, null, 2),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
