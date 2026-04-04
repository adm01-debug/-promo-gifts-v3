/**
 * RLS Policy Tests for 10 Critical Tables
 * 
 * Uses SUPABASE_DB_URL (select/insert only) with SET LOCAL ROLE
 * to simulate authenticated/anon contexts against public tables.
 * Test data is pre-inserted via service-level queries, then
 * RLS is validated by switching to authenticated/anon roles.
 */
import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
const pool = new Pool(DB_URL, 3, true);

// Deterministic test UUIDs
const SELLER_A = "a0a00000-aaaa-aaaa-aaaa-000000000001";
const SELLER_B = "b0b00000-bbbb-bbbb-bbbb-000000000002";
const ADMIN_U  = "c0c00000-cccc-cccc-cccc-000000000003";
const ORG_ID   = "d0d00000-dddd-dddd-dddd-000000000004";
const QUOTE_A  = "e0e00000-0000-0000-0000-000000000001";
const QUOTE_B  = "e0e00000-0000-0000-0000-000000000002";
const QI_A     = "f0f00000-0000-0000-0000-000000000001";
const QI_B     = "f0f00000-0000-0000-0000-000000000002";
const TOKEN_A  = "f1f10000-0000-0000-0000-000000000001";
const TOKEN_B  = "f1f10000-0000-0000-0000-000000000002";
const ORDER_A  = "f2f20000-0000-0000-0000-000000000001";
const ORDER_B  = "f2f20000-0000-0000-0000-000000000002";
const OI_A     = "f3f30000-0000-0000-0000-000000000001";
const OI_B     = "f3f30000-0000-0000-0000-000000000002";
const AUDIT_ID = "f4f40000-0000-0000-0000-000000000001";

/** Run SQL as the default (privileged) connection */
async function run(sql: string) {
  const c = await pool.connect();
  try { await c.queryObject(sql); } finally { c.release(); }
}

/** SELECT as a simulated authenticated user */
async function selectAs(userId: string, sql: string): Promise<Record<string, unknown>[]> {
  const c = await pool.connect();
  try {
    await c.queryObject(`SELECT set_config('request.jwt.claims','{"sub":"${userId}","role":"authenticated"}',true)`);
    await c.queryObject(`SELECT set_config('request.jwt.claim.sub','${userId}',true)`);
    await c.queryObject(`SET LOCAL ROLE authenticated`);
    const r = await c.queryObject(sql);
    return r.rows as Record<string, unknown>[];
  } finally {
    try { await c.queryObject(`RESET ROLE`); } catch { /* ok */ }
    c.release();
  }
}

/** Try a write as authenticated – returns true if it succeeded without error */
async function writeAs(userId: string, sql: string): Promise<boolean> {
  const c = await pool.connect();
  try {
    await c.queryObject(`SELECT set_config('request.jwt.claims','{"sub":"${userId}","role":"authenticated"}',true)`);
    await c.queryObject(`SELECT set_config('request.jwt.claim.sub','${userId}',true)`);
    await c.queryObject(`SET LOCAL ROLE authenticated`);
    await c.queryObject(sql);
    return true;
  } catch {
    return false;
  } finally {
    try { await c.queryObject(`RESET ROLE`); } catch { /* ok */ }
    c.release();
  }
}

/** SELECT as anon */
async function selectAsAnon(sql: string): Promise<Record<string, unknown>[]> {
  const c = await pool.connect();
  try {
    await c.queryObject(`SELECT set_config('request.jwt.claims','{}',true)`);
    await c.queryObject(`SET LOCAL ROLE anon`);
    const r = await c.queryObject(sql);
    return r.rows as Record<string, unknown>[];
  } finally {
    try { await c.queryObject(`RESET ROLE`); } catch { /* ok */ }
    c.release();
  }
}

// ========= SETUP =========

Deno.test({ name: "SETUP: seed test data", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  // profiles (handle_new_user won't fire – insert directly)
  await run(`INSERT INTO public.profiles (user_id,email,full_name,role) VALUES
    ('${SELLER_A}','sa@t.l','Seller A','vendedor'),
    ('${SELLER_B}','sb@t.l','Seller B','vendedor'),
    ('${ADMIN_U}','ad@t.l','Admin','admin')
    ON CONFLICT (user_id) DO NOTHING`);

  await run(`INSERT INTO public.user_roles (user_id,role) VALUES
    ('${SELLER_A}','vendedor'),('${SELLER_B}','vendedor'),('${ADMIN_U}','admin')
    ON CONFLICT (user_id,role) DO NOTHING`);

  await run(`INSERT INTO public.organizations (id,name,slug) VALUES
    ('${ORG_ID}','RLS Org','rls-org-${Date.now()}') ON CONFLICT (id) DO NOTHING`);

  await run(`INSERT INTO public.organization_members (organization_id,user_id,role) VALUES
    ('${ORG_ID}','${SELLER_A}','member'),
    ('${ORG_ID}','${SELLER_B}','member'),
    ('${ORG_ID}','${ADMIN_U}','owner')
    ON CONFLICT DO NOTHING`);

  await run(`INSERT INTO public.quotes (id,seller_id,organization_id,client_name,status,quote_number) VALUES
    ('${QUOTE_A}','${SELLER_A}','${ORG_ID}','Client A','draft','RLSA/99'),
    ('${QUOTE_B}','${SELLER_B}','${ORG_ID}','Client B','draft','RLSB/99')
    ON CONFLICT (id) DO NOTHING`);

  await run(`INSERT INTO public.quote_items (id,quote_id,product_name,quantity,unit_price) VALUES
    ('${QI_A}','${QUOTE_A}','Prod A',10,5),('${QI_B}','${QUOTE_B}','Prod B',20,10)
    ON CONFLICT (id) DO NOTHING`);

  await run(`INSERT INTO public.quote_approval_tokens (id,quote_id,seller_id,client_name) VALUES
    ('${TOKEN_A}','${QUOTE_A}','${SELLER_A}','Tok A'),
    ('${TOKEN_B}','${QUOTE_B}','${SELLER_B}','Tok B')
    ON CONFLICT (id) DO NOTHING`);

  await run(`INSERT INTO public.orders (id,seller_id,organization_id,client_name,order_number) VALUES
    ('${ORDER_A}','${SELLER_A}','${ORG_ID}','Ord A','PED-RLS-0001'),
    ('${ORDER_B}','${SELLER_B}','${ORG_ID}','Ord B','PED-RLS-0002')
    ON CONFLICT (id) DO NOTHING`);

  await run(`INSERT INTO public.order_items (id,order_id,organization_id,product_name,quantity) VALUES
    ('${OI_A}','${ORDER_A}','${ORG_ID}','OI A',5),
    ('${OI_B}','${ORDER_B}','${ORG_ID}','OI B',10)
    ON CONFLICT (id) DO NOTHING`);

  await run(`INSERT INTO public.admin_audit_log (id,user_id,action,resource_type) VALUES
    ('${AUDIT_ID}','${ADMIN_U}','test','rls') ON CONFLICT (id) DO NOTHING`);
}});

// ========= 1. PROFILES =========

Deno.test({ name: "1a profiles: seller sees only own", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(SELLER_A, `SELECT user_id FROM public.profiles WHERE user_id IN ('${SELLER_A}','${SELLER_B}','${ADMIN_U}')`);
  const ids = rows.map(r => r.user_id);
  assert(ids.includes(SELLER_A), "own profile visible");
  assertEquals(ids.includes(SELLER_B), false, "other seller hidden");
}});

Deno.test({ name: "1b profiles: admin sees all", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(ADMIN_U, `SELECT user_id FROM public.profiles WHERE user_id IN ('${SELLER_A}','${SELLER_B}','${ADMIN_U}')`);
  assertEquals(rows.length, 3, "admin sees all 3");
}});

Deno.test({ name: "1c profiles: seller can't update other", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await writeAs(SELLER_A, `UPDATE public.profiles SET department='HACKED' WHERE user_id='${SELLER_B}'`);
  const check = await selectAs(SELLER_B, `SELECT department FROM public.profiles WHERE user_id='${SELLER_B}'`);
  assert(check[0]?.department !== 'HACKED', "not modified");
}});

// ========= 2. USER_ROLES =========

Deno.test({ name: "2a user_roles: seller sees nothing", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(SELLER_A, `SELECT * FROM public.user_roles LIMIT 5`);
  assertEquals(rows.length, 0, "seller can't read roles");
}});

Deno.test({ name: "2b user_roles: seller can't self-escalate", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const ok = await writeAs(SELLER_A, `INSERT INTO public.user_roles (user_id,role) VALUES ('${SELLER_A}','admin')`);
  assertEquals(ok, false, "privilege escalation blocked");
}});

// ========= 3. ORGANIZATIONS =========

Deno.test({ name: "3a organizations: member sees own org", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(SELLER_A, `SELECT id FROM public.organizations WHERE id='${ORG_ID}'`);
  assertEquals(rows.length, 1);
}});

Deno.test({ name: "3b organizations: non-member can't see", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs("99990000-0000-0000-0000-000000000099", `SELECT id FROM public.organizations WHERE id='${ORG_ID}'`);
  assertEquals(rows.length, 0);
}});

// ========= 4. ORG MEMBERS =========

Deno.test({ name: "4a org_members: member sees members", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(SELLER_A, `SELECT user_id FROM public.organization_members WHERE organization_id='${ORG_ID}'`);
  assert(rows.length >= 3);
}});

Deno.test({ name: "4b org_members: non-owner can't add", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const ok = await writeAs(SELLER_A, `INSERT INTO public.organization_members (organization_id,user_id,role) VALUES ('${ORG_ID}','99990000-0000-0000-0000-000000000088','member')`);
  assertEquals(ok, false, "non-owner insert blocked");
}});

// ========= 5. QUOTES =========

Deno.test({ name: "5a quotes: seller sees only own", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(SELLER_A, `SELECT id,seller_id FROM public.quotes WHERE id IN ('${QUOTE_A}','${QUOTE_B}')`);
  assert(rows.length >= 1);
  assert(rows.every(r => r.seller_id === SELLER_A), "only own quotes");
}});

Deno.test({ name: "5b quotes: admin sees all org quotes", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(ADMIN_U, `SELECT seller_id FROM public.quotes WHERE organization_id='${ORG_ID}'`);
  const sellers = [...new Set(rows.map(r => r.seller_id))];
  assert(sellers.includes(SELLER_A) && sellers.includes(SELLER_B), "admin sees both");
}});

Deno.test({ name: "5c quotes: seller can't update other's quote", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await writeAs(SELLER_A, `UPDATE public.quotes SET client_name='HACKED' WHERE id='${QUOTE_B}'`);
  const c = await selectAs(ADMIN_U, `SELECT client_name FROM public.quotes WHERE id='${QUOTE_B}'`);
  assert(c[0]?.client_name !== 'HACKED');
}});

// ========= 6. ORDERS =========

Deno.test({ name: "6a orders: seller sees only own", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(SELLER_A, `SELECT seller_id FROM public.orders WHERE id IN ('${ORDER_A}','${ORDER_B}')`);
  assert(rows.every(r => r.seller_id === SELLER_A));
}});

Deno.test({ name: "6b orders: seller can't delete other's", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await writeAs(SELLER_A, `DELETE FROM public.orders WHERE id='${ORDER_B}'`);
  const c = await selectAs(ADMIN_U, `SELECT id FROM public.orders WHERE id='${ORDER_B}'`);
  assertEquals(c.length, 1, "order still exists");
}});

// ========= 7. ORDER_ITEMS =========

Deno.test({ name: "7 order_items: org member sees org items", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(SELLER_A, `SELECT id FROM public.order_items WHERE organization_id='${ORG_ID}'`);
  assert(rows.length >= 1);
}});

// ========= 8. QUOTE_ITEMS =========

Deno.test({ name: "8 quote_items: seller sees only own quote items", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(SELLER_A, `SELECT quote_id FROM public.quote_items WHERE id IN ('${QI_A}','${QI_B}')`);
  assert(rows.every(r => r.quote_id === QUOTE_A), "only own");
}});

// ========= 9. QUOTE_APPROVAL_TOKENS =========

Deno.test({ name: "9a tokens: seller sees only own", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(SELLER_A, `SELECT seller_id FROM public.quote_approval_tokens WHERE id IN ('${TOKEN_A}','${TOKEN_B}')`);
  assert(rows.every(r => r.seller_id === SELLER_A));
}});

Deno.test({ name: "9b tokens: seller can't delete other's", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await writeAs(SELLER_A, `DELETE FROM public.quote_approval_tokens WHERE id='${TOKEN_B}'`);
  const c = await selectAs(SELLER_B, `SELECT id FROM public.quote_approval_tokens WHERE id='${TOKEN_B}'`);
  assertEquals(c.length, 1);
}});

// ========= 10. ADMIN_AUDIT_LOG =========

Deno.test({ name: "10a audit_log: seller can't read", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(SELLER_A, `SELECT id FROM public.admin_audit_log WHERE id='${AUDIT_ID}'`);
  assertEquals(rows.length, 0);
}});

Deno.test({ name: "10b audit_log: admin can read", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await selectAs(ADMIN_U, `SELECT id FROM public.admin_audit_log WHERE id='${AUDIT_ID}'`);
  assert(rows.length >= 1);
}});

Deno.test({ name: "10c audit_log: seller can't insert", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const ok = await writeAs(SELLER_A, `INSERT INTO public.admin_audit_log (user_id,action,resource_type) VALUES ('${SELLER_A}','evil','hack')`);
  assertEquals(ok, false);
}});

// ========= CROSS: ANON =========

Deno.test({ name: "CROSS: anon can't access any critical table", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  for (const t of ["profiles","user_roles","quotes","orders","order_items","organizations","admin_audit_log","quote_items","quote_approval_tokens","organization_members"]) {
    const rows = await selectAsAnon(`SELECT * FROM public.${t} LIMIT 1`);
    assertEquals(rows.length, 0, `anon blocked on ${t}`);
  }
}});

// ========= TEARDOWN =========

Deno.test({ name: "TEARDOWN: clean test data", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await run(`DELETE FROM public.admin_audit_log WHERE id='${AUDIT_ID}'`);
  await run(`DELETE FROM public.quote_approval_tokens WHERE id IN ('${TOKEN_A}','${TOKEN_B}')`);
  await run(`DELETE FROM public.quote_items WHERE id IN ('${QI_A}','${QI_B}')`);
  await run(`DELETE FROM public.quotes WHERE id IN ('${QUOTE_A}','${QUOTE_B}')`);
  await run(`DELETE FROM public.order_items WHERE id IN ('${OI_A}','${OI_B}')`);
  await run(`DELETE FROM public.orders WHERE id IN ('${ORDER_A}','${ORDER_B}')`);
  await run(`DELETE FROM public.organization_members WHERE organization_id='${ORG_ID}'`);
  await run(`DELETE FROM public.organizations WHERE id='${ORG_ID}'`);
  await run(`DELETE FROM public.user_roles WHERE user_id IN ('${SELLER_A}','${SELLER_B}','${ADMIN_U}')`);
  await run(`DELETE FROM public.profiles WHERE user_id IN ('${SELLER_A}','${SELLER_B}','${ADMIN_U}')`);
  await pool.end();
}});
