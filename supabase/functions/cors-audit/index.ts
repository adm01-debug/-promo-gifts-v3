// supabase/functions/cors-audit/index.ts
//
// Diagnostic endpoint — returns the CORS configuration of every edge function
// in the project so you can audit which custom headers are accepted and quickly
// spot any function that's missing a recently-added header.
//
// Auth: dev role only (uses authorize({ requireRole: "dev" })).
//
// Response shape:
//   {
//     shared: { allowHeaders, allowHeadersList, allowMethods, exposeHeaders },
//     snapshot: { generated_at, total, counts, functions: [...] },
//     audit: {
//       missing_in_inline: { header: [funcName, ...] }, // headers in shared
//                                                       // missing from inline
//       extra_in_inline: { header: [funcName, ...] }    // headers in inline
//                                                       // not in shared (often
//                                                       // legitimate, e.g.
//                                                       // x-signature-256)
//     }
//   }
//
// Refresh the snapshot with:  node scripts/build-cors-snapshot.mjs
// (run after editing inline-CORS funcs or adding a new edge function).

import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import {
  CORS_INTROSPECTION,
  getCorsHeaders,
  handleCorsPreflightIfNeeded,
} from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import snapshot from "../_shared/cors-snapshot.json" with { type: "json" };

interface SnapshotFunction {
  name: string;
  mode: "shared" | "inline" | "none";
  allowHeaders: string[];
  exposeHeaders: string[];
  allowMethods: string | null;
  allowOrigin: string | null;
}

interface Snapshot {
  generated_at: string;
  total: number;
  counts: { shared: number; inline: number; none: number };
  functions: SnapshotFunction[];
}

function buildAudit(snap: Snapshot) {
  const sharedAllow = new Set(
    CORS_INTROSPECTION.allowHeadersList.map((h) => h.toLowerCase()),
  );
  const sharedExpose = new Set(
    CORS_INTROSPECTION.exposeHeaders
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );

  const missing_in_inline: Record<string, string[]> = {};
  const extra_in_inline: Record<string, string[]> = {};

  for (const fn of snap.functions) {
    if (fn.mode !== "inline") continue;

    const inlineAllow = new Set(fn.allowHeaders);
    for (const h of sharedAllow) {
      if (!inlineAllow.has(h)) {
        (missing_in_inline[h] ||= []).push(fn.name);
      }
    }
    for (const h of inlineAllow) {
      if (!sharedAllow.has(h)) {
        (extra_in_inline[h] ||= []).push(fn.name);
      }
    }
    for (const h of sharedExpose) {
      if (!fn.exposeHeaders.includes(h)) {
        (missing_in_inline[`expose:${h}`] ||= []).push(fn.name);
      }
    }
  }

  return { missing_in_inline, extra_in_inline };
}

Deno.serve(async (req) => {
  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "cors-audit", requestId, req });

  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  const auth = await authorize(req, { requireRole: "dev" });
  if (!auth.ok) {
    log.warn("cors_audit_denied", {});
    return auth.response;
  }

  const snap = snapshot as Snapshot;
  const audit = buildAudit(snap);

  const missingCount = Object.values(audit.missing_in_inline).reduce(
    (a, b) => a + b.length,
    0,
  );
  const extraCount = Object.values(audit.extra_in_inline).reduce(
    (a, b) => a + b.length,
    0,
  );

  log.info("cors_audit_ok", {
    total: snap.total,
    shared: snap.counts.shared,
    inline: snap.counts.inline,
    missing_count: missingCount,
    extra_count: extraCount,
  });

  return log.respond(
    new Response(
      JSON.stringify(
        {
          shared: {
            allowHeaders: CORS_INTROSPECTION.allowHeaders,
            allowHeadersList: CORS_INTROSPECTION.allowHeadersList,
            allowMethods: CORS_INTROSPECTION.allowMethods,
            exposeHeaders: CORS_INTROSPECTION.exposeHeaders,
          },
          snapshot: snap,
          audit,
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    ),
  );
});
