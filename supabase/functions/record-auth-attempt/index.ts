import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { z } from "npm:zod@3.23.8";

const RecordAttemptSchema = z.object({
  email: z.string().email(),
  ip: z.string().optional(),
  success: z.boolean(),
  reason: z.string().optional(),
  ua: z.string().optional(),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;

  try {
    const body = await req.json();
    const parsed = RecordAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.rpc("record_auth_attempt", {
      _email: parsed.data.email,
      _ip: parsed.data.ip || "unknown",
      _success: parsed.data.success,
      _reason: parsed.data.reason || null,
      _ua: parsed.data.ua || null,
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
