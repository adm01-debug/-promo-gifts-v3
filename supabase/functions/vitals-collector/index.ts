import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { z } from "npm:zod@3.23.8";
import { initEdgeOTel, withEdgeTracing } from "../_shared/telemetry.ts";

initEdgeOTel("vitals-collector");

const VitalSchema = z.object({
  name: z.string().max(20),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  requestId: z.string().optional(),
  url: z.string().url().optional(),
  userId: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  return await withEdgeTracing(req, "handle-vitals", async (span) => {
    const corsHeaders = getCorsHeaders(req);
    const preflight = handleCorsPreflightIfNeeded(req);
    if (preflight) return preflight;

    try {
      const body = await req.json();
      span.setAttribute("app.vital.name", body.name);
      span.setAttribute("app.vital.value", body.value);
      
      const parsed = VitalSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: parsed.error }), { status: 400, headers: corsHeaders });
      }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.rpc("record_app_vital", {
      _name: parsed.data.name,
      _value: parsed.data.value,
      _rating: parsed.data.rating || null,
      _req_id: parsed.data.requestId || null,
      _url: parsed.data.url || null,
      _ua: req.headers.get("user-agent") || "unknown",
      _uid: parsed.data.userId || null,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  });
});
