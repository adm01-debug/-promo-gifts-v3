// Admin-only secrets manager for the Conexões hub.
// IMPORTANT: never returns secret values to the client. Only returns
// status (configured?) + a masked suffix for visual confirmation.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Whitelist of secret names that can be managed via this function.
// Anything else is rejected to prevent abuse.
const ALLOWED_SECRETS = new Set<string>([
  // Supabase (external dbs)
  "EXTERNAL_PROMOBRIND_URL",
  "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY",
  "EXTERNAL_PROMOBRIND_ANON_KEY",
  "EXTERNAL_CRM_URL",
  "EXTERNAL_CRM_SERVICE_ROLE_KEY",
  "EXTERNAL_CRM_ANON_KEY",
  // Bitrix24
  "BITRIX24_WEBHOOK_URL",
  "BITRIX24_DOMAIN",
  "BITRIX24_USER_ID",
  "BITRIX24_TOKEN",
  // n8n
  "N8N_BASE_URL",
  "N8N_API_KEY",
  // MCP
  "MCP_SHARED_SECRET",
  // Webhooks (per-id allowed via prefix below)
]);

const ALLOWED_PREFIXES = [
  "OUTBOUND_WEBHOOK_SECRET_",
  "INBOUND_WEBHOOK_HMAC_",
];

function isAllowedSecretName(name: string): boolean {
  if (ALLOWED_SECRETS.has(name)) return true;
  return ALLOWED_PREFIXES.some((p) => name.startsWith(p));
}

const BodySchema = z.object({
  action: z.enum(["list", "set", "delete", "status", "rotate", "rotation_history"]),
  names: z.array(z.string()).optional(),
  name: z.string().optional(),
  value: z.string().optional(),
  notes: z.string().max(500).optional(),
});

function maskValue(v: string | undefined | null): {
  has_value: boolean;
  masked_suffix: string | null;
  length: number;
} {
  if (!v) return { has_value: false, masked_suffix: null, length: 0 };
  const suffix = v.length >= 4 ? v.slice(-4) : v;
  return { has_value: true, masked_suffix: suffix, length: v.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const service = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem gerenciar credenciais" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Payload inválido", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { action, names, name, value } = parsed.data;

    if (action === "list" || action === "status") {
      const requested = names && names.length > 0
        ? names
        : Array.from(ALLOWED_SECRETS);
      const results = requested
        .filter(isAllowedSecretName)
        .map((n) => ({
          name: n,
          ...maskValue(Deno.env.get(n) ?? null),
        }));
      return new Response(
        JSON.stringify({ ok: true, secrets: results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "set") {
      if (!name || !isAllowedSecretName(name)) {
        return new Response(
          JSON.stringify({
            error:
              "Nome de secret não permitido. Use apenas nomes da whitelist do Conexões.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!value || value.length < 4) {
        return new Response(
          JSON.stringify({ error: "Valor inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      // NOTE: Edge functions cannot persistently mutate Supabase secrets
      // from runtime — that requires the platform API. We instead instruct
      // the admin UI to use Lovable's add_secret flow. For the runtime view,
      // we acknowledge the request and audit-log it.
      await service.from("admin_audit_log").insert({
        user_id: userData.user.id,
        action: "secret_set_request",
        resource_type: "secret",
        resource_id: name,
        details: { length: value.length, masked: maskValue(value) },
      });
      return new Response(
        JSON.stringify({
          ok: true,
          stored: false,
          requires_platform_action: true,
          message:
            "Secret recebido. Em projetos Lovable, use o botão 'Adicionar credencial' para persistir o valor de forma segura.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "delete") {
      if (!name || !isAllowedSecretName(name)) {
        return new Response(
          JSON.stringify({ error: "Nome de secret não permitido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      await service.from("admin_audit_log").insert({
        user_id: userData.user.id,
        action: "secret_delete_request",
        resource_type: "secret",
        resource_id: name,
        details: {},
      });
      return new Response(
        JSON.stringify({
          ok: true,
          stored: false,
          requires_platform_action: true,
          message: "Use o painel de Secrets do Lovable para remover o valor.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação desconhecida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
