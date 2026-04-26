/**
 * Role-based access tests for technical edge functions.
 *
 * Garante que apenas usuários com papel `dev` conseguem invocar:
 *   - mcp-keys-issue / mcp-keys-revoke / mcp-keys-rotate / mcp-keys-update
 *   - connections-hub-audit
 *   - secrets-manager
 *
 * E que `supervisor` / `agente` recebem 403 (forbidden) das mesmas.
 *
 * Também valida que a tabela `query_telemetry` (SELECT) está acessível
 * apenas para `dev` via PostgREST (defesa em profundidade da RLS).
 *
 * Estratégia:
 *   1. Cria 3 usuários sintéticos via auth.admin.createUser.
 *   2. Atribui roles via INSERT em public.user_roles (service_role).
 *   3. Faz signInWithPassword para obter JWT de cada um.
 *   4. Faz POST autenticado contra cada edge function e valida o status.
 *   5. Limpa os usuários ao final.
 *
 * Importante: rodar com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no env
 * (presentes no runtime de testes Supabase).
 */

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

interface Fixture {
  email: string;
  password: string;
  userId: string;
  jwt: string;
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const cleanupIds: string[] = [];

async function makeUser(role: "dev" | "supervisor" | "agente"): Promise<Fixture> {
  const stamp = Date.now() + Math.floor(Math.random() * 10_000);
  const email = `rbac-test-${role}-${stamp}@promogifts.test`;
  const password = `Test!${stamp}aA1`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    throw new Error(`Falha criando usuário ${role}: ${createErr?.message}`);
  }
  const userId = created.user.id;
  cleanupIds.push(userId);

  // Atribui role (apaga eventuais defaults setados por trigger)
  await admin.from("user_roles").delete().eq("user_id", userId);
  const { error: roleErr } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role });
  if (roleErr) {
    throw new Error(`Falha atribuindo role ${role}: ${roleErr.message}`);
  }

  // Login para obter JWT
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInErr } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr || !session.session) {
    throw new Error(`Falha login ${role}: ${signInErr?.message}`);
  }

  return { email, password, userId, jwt: session.session.access_token };
}

async function cleanup() {
  for (const id of cleanupIds.splice(0)) {
    await admin.from("user_roles").delete().eq("user_id", id);
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
}

async function callFn(
  name: string,
  jwt: string,
  body: Record<string, unknown> = {},
): Promise<Response> {
  return await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// ============================================================
// FIXTURES
// ============================================================
let DEV: Fixture;
let SUPERVISOR: Fixture;
let AGENTE: Fixture;

Deno.test({
  name: "setup: cria fixtures dev/supervisor/agente",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    DEV = await makeUser("dev");
    SUPERVISOR = await makeUser("supervisor");
    AGENTE = await makeUser("agente");
    assert(DEV.jwt && SUPERVISOR.jwt && AGENTE.jwt, "JWTs gerados");
  },
});

// ============================================================
// MCP KEYS — apenas dev
// ============================================================
const MCP_FUNCTIONS = [
  "mcp-keys-issue",
  "mcp-keys-revoke",
  "mcp-keys-rotate",
  "mcp-keys-update",
];

for (const fn of MCP_FUNCTIONS) {
  Deno.test({
    name: `${fn}: supervisor recebe 403`,
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const res = await callFn(fn, SUPERVISOR.jwt, { dummy: true });
      const text = await res.text();
      assertEquals(res.status, 403, `${fn} → supervisor: esperava 403, veio ${res.status}. Body: ${text.slice(0, 200)}`);
    },
  });

  Deno.test({
    name: `${fn}: agente recebe 403`,
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const res = await callFn(fn, AGENTE.jwt, { dummy: true });
      const text = await res.text();
      assertEquals(res.status, 403, `${fn} → agente: esperava 403, veio ${res.status}. Body: ${text.slice(0, 200)}`);
    },
  });

  Deno.test({
    name: `${fn}: dev passa do role gate (não retorna 403)`,
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      // Body intencionalmente inválido — esperamos 400/422 (validação) ou 200,
      // mas NÃO 403, provando que o role-check passou.
      const res = await callFn(fn, DEV.jwt, { dummy: true });
      const text = await res.text();
      assert(
        res.status !== 403,
        `${fn} → dev: não deveria receber 403. Status=${res.status}. Body=${text.slice(0, 200)}`,
      );
    },
  });
}

// ============================================================
// connections-hub-audit — apenas dev (requireDev)
// ============================================================
Deno.test({
  name: "connections-hub-audit: supervisor recebe 403",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await callFn("connections-hub-audit", SUPERVISOR.jwt);
    const text = await res.text();
    assertEquals(res.status, 403, `Body: ${text.slice(0, 200)}`);
  },
});

Deno.test({
  name: "connections-hub-audit: agente recebe 403",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await callFn("connections-hub-audit", AGENTE.jwt);
    const text = await res.text();
    assertEquals(res.status, 403, `Body: ${text.slice(0, 200)}`);
  },
});

Deno.test({
  name: "connections-hub-audit: dev é autorizado (status != 403)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await callFn("connections-hub-audit", DEV.jwt);
    const text = await res.text();
    assert(res.status !== 403, `Status=${res.status}. Body: ${text.slice(0, 200)}`);
  },
});

// ============================================================
// secrets-manager — apenas dev (hardening: era admin, agora dev)
// ============================================================
Deno.test({
  name: "secrets-manager: supervisor recebe 403",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await callFn("secrets-manager", SUPERVISOR.jwt, { action: "list" });
    const text = await res.text();
    assertEquals(res.status, 403, `Body: ${text.slice(0, 200)}`);
  },
});

Deno.test({
  name: "secrets-manager: agente recebe 403",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await callFn("secrets-manager", AGENTE.jwt, { action: "list" });
    const text = await res.text();
    assertEquals(res.status, 403, `Body: ${text.slice(0, 200)}`);
  },
});

Deno.test({
  name: "secrets-manager: dev passa do role gate (status != 403)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await callFn("secrets-manager", DEV.jwt, { action: "list" });
    const text = await res.text();
    assert(res.status !== 403, `Status=${res.status}. Body: ${text.slice(0, 200)}`);
  },
});

// ============================================================
// query_telemetry — RLS dev-only (PostgREST direto)
// ============================================================
async function readTelemetry(jwt: string): Promise<{ status: number; rows: unknown[] }> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/query_telemetry?select=id&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        apikey: ANON_KEY,
      },
    },
  );
  const body = await res.json().catch(() => []);
  return { status: res.status, rows: Array.isArray(body) ? body : [] };
}

Deno.test({
  name: "query_telemetry: supervisor → 0 linhas (RLS bloqueia)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { status, rows } = await readTelemetry(SUPERVISOR.jwt);
    assertEquals(status, 200, "PostgREST não retorna 403, mas RLS filtra");
    assertEquals(rows.length, 0, "supervisor não deve ver telemetria");
  },
});

Deno.test({
  name: "query_telemetry: agente → 0 linhas (RLS bloqueia)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { status, rows } = await readTelemetry(AGENTE.jwt);
    assertEquals(status, 200);
    assertEquals(rows.length, 0, "agente não deve ver telemetria");
  },
});

Deno.test({
  name: "query_telemetry: dev → autorizado (rows >= 0, sem erro)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { status } = await readTelemetry(DEV.jwt);
    assertEquals(status, 200, "dev tem permissão de SELECT");
  },
});

// ============================================================
// teardown
// ============================================================
Deno.test({
  name: "teardown: remove usuários sintéticos",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await cleanup();
  },
});
