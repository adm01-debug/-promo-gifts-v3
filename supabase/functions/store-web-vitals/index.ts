import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";

const MetricSchema = z.object({
  name: z.string().min(1).max(50),
  value: z.number().finite(),
  rating: z.string().max(20).optional(),
  delta: z.number().finite().optional(),
  navigationType: z.string().max(50).optional(),
  url: z.string().url().max(2000).optional(),
});

const BodySchema = z.union([MetricSchema, z.array(MetricSchema).max(50)]);

function jsonRes(corsHeaders: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonRes(corsHeaders, { error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonRes(corsHeaders, { error: "Unauthorized" }, 401);
    }

    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonRes(corsHeaders, { error: "Invalid metrics data", details: parsed.error.flatten() }, 400);
    }

    const metrics = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

    if (metrics.length === 0) {
      return jsonRes(corsHeaders, { ok: true, count: 0 });
    }

    const rows = metrics.map((m) => ({
      user_id: user.id,
      metric_name: m.name,
      metric_value: m.value,
      rating: m.rating ?? null,
      delta: m.delta ?? null,
      navigation_type: m.navigationType ?? null,
      page_url: m.url ?? null,
      user_agent: req.headers.get("User-Agent"),
    }));

    const { error: insertError } = await supabase
      .from("web_vitals")
      .insert(rows);

    if (insertError) {
      return jsonRes(corsHeaders, { error: insertError.message }, 400);
    }

    return jsonRes(corsHeaders, { ok: true, count: rows.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return jsonRes(corsHeaders, { error: msg }, 500);
  }
});
