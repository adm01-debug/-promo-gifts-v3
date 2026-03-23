import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, user_id, ip_address, success, failure_reason, user_agent } =
      await req.json();

    // Validate required fields
    if (!email || typeof success !== "boolean") {
      return new Response(
        JSON.stringify({ error: "email and success are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize inputs
    const sanitizedEmail = String(email).slice(0, 255);
    const sanitizedIP = String(ip_address || "unknown").slice(0, 45);
    const sanitizedUA = user_agent ? String(user_agent).slice(0, 512) : null;
    const sanitizedReason = failure_reason ? String(failure_reason).slice(0, 500) : null;

    // Use service_role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabaseAdmin.from("login_attempts").insert({
      email: sanitizedEmail,
      user_id: user_id || null,
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
