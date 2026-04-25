// Edge function: step-up auth (senha + OTP por e-mail) com re-checagem de role dev
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Action =
  | "promote_dev"
  | "demote_dev"
  | "mcp_full_issue"
  | "mcp_full_escalate"
  | "secret_rotation"
  | "secret_revoke";

interface RequestBody {
  step: "request" | "verify_password" | "verify_otp";
  action?: Action;
  target_ref?: string | null;
  challenge_id?: string;
  password?: string;
  otp?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "unauthorized" }, 401);

    // Re-checagem server-side de role dev
    const { data: isDev } = await admin.rpc("is_dev", { _user_id: user.id });
    if (!isDev) {
      await admin.from("step_up_audit_log").insert({
        user_id: user.id,
        event_type: "unauthorized",
        metadata: { reason: "not_dev_at_edge" },
      });
      return json({ error: "forbidden", reason: "dev_role_required" }, 403);
    }

    const body = (await req.json()) as RequestBody;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = req.headers.get("user-agent") ?? null;

    // ---------- STEP 1: request challenge + envia OTP por e-mail ----------
    if (body.step === "request") {
      if (!body.action) return json({ error: "action_required" }, 400);

      const { data, error } = await userClient.rpc("request_step_up_challenge", {
        _action: body.action,
        _target_ref: body.target_ref ?? null,
        _ip: ip,
        _user_agent: ua,
      });
      if (error) return json({ error: error.message }, 429);

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.challenge_id || !row?.otp_plain) {
        return json({ error: "challenge_failed" }, 500);
      }

      // Envia OTP por e-mail (best-effort via send-transactional-email se existir)
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "step-up-otp",
            recipientEmail: user.email,
            idempotencyKey: `stepup-${row.challenge_id}`,
            templateData: { otp: row.otp_plain, action: body.action, expiresInMinutes: 5 },
          },
        });
      } catch (_) {
        // Fallback: log no audit para o dev recuperar manualmente (operação interna)
        await admin.from("step_up_audit_log").insert({
          user_id: user.id,
          action: body.action,
          target_ref: body.target_ref ?? null,
          event_type: "failed",
          challenge_id: row.challenge_id,
          metadata: { reason: "email_dispatch_failed", otp_preview: row.otp_plain.slice(0, 2) + "****" },
        });
      }

      return json({ challenge_id: row.challenge_id, expires_at: row.expires_at });
    }

    // ---------- STEP 2: verifica senha ----------
    if (body.step === "verify_password") {
      if (!body.challenge_id || !body.password) return json({ error: "missing_fields" }, 400);
      if (!user.email) return json({ error: "no_email" }, 400);

      const verifier = createClient(SUPABASE_URL, ANON_KEY);
      const { error: pErr } = await verifier.auth.signInWithPassword({
        email: user.email,
        password: body.password,
      });
      if (pErr) {
        await admin.from("step_up_audit_log").insert({
          user_id: user.id,
          event_type: "failed",
          challenge_id: body.challenge_id,
          metadata: { reason: "wrong_password" },
        });
        return json({ error: "invalid_password" }, 401);
      }

      const { data: ok, error } = await userClient.rpc("mark_step_up_password_verified", {
        _challenge_id: body.challenge_id,
      });
      if (error || !ok) return json({ error: "challenge_invalid" }, 400);

      return json({ password_verified: true });
    }

    // ---------- STEP 3: verifica OTP -> emite token ----------
    if (body.step === "verify_otp") {
      if (!body.challenge_id || !body.otp) return json({ error: "missing_fields" }, 400);

      const { data, error } = await userClient.rpc("verify_step_up_otp", {
        _challenge_id: body.challenge_id,
        _otp: body.otp,
      });
      if (error) return json({ error: error.message }, 400);

      const row = Array.isArray(data) ? data[0] : data;
      return json({ token: row.token, expires_at: row.expires_at });
    }

    return json({ error: "invalid_step" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
