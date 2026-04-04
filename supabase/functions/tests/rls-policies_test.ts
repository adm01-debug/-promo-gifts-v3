/**
 * RLS Policy Validation Tests for 10 Critical Tables
 * 
 * Validates that RLS is enabled and policies are correctly structured
 * by inspecting pg_policy with pg_get_expr() for readable SQL expressions.
 * 
 * Tables: profiles, user_roles, organizations, organization_members,
 *         quotes, orders, order_items, quote_items,
 *         quote_approval_tokens, admin_audit_log
 */
import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
const pool = new Pool(DB_URL, 2, true);

interface PolicyRow {
  polname: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

async function getPolicies(table: string): Promise<PolicyRow[]> {
  const c = await pool.connect();
  try {
    const r = await c.queryObject<PolicyRow>(`
      SELECT 
        polname,
        CASE polcmd 
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          WHEN '*' THEN 'ALL'
        END as cmd,
        pg_get_expr(polqual, polrelid) as qual,
        pg_get_expr(polwithcheck, polrelid) as with_check
      FROM pg_policy 
      WHERE polrelid = ('public.' || '${table}')::regclass
      ORDER BY polname
    `);
    return r.rows;
  } finally {
    c.release();
  }
}

async function isRlsEnabled(table: string): Promise<boolean> {
  const c = await pool.connect();
  try {
    const r = await c.queryObject<{ relrowsecurity: boolean }>(`
      SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || '${table}')::regclass
    `);
    return r.rows[0]?.relrowsecurity ?? false;
  } finally {
    c.release();
  }
}

// ============================================
// CROSS-CUTTING: RLS enabled on ALL critical tables
// ============================================
Deno.test({ name: "CROSS: all 10 critical tables have RLS enabled", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const tables = [
    "profiles", "user_roles", "quotes", "orders", "order_items",
    "organizations", "organization_members", "admin_audit_log",
    "quote_items", "quote_approval_tokens",
  ];
  for (const t of tables) {
    const enabled = await isRlsEnabled(t);
    assertEquals(enabled, true, `RLS must be enabled on ${t}`);
  }
}});

// ============================================
// 1. PROFILES
// ============================================
Deno.test({ name: "1. profiles: has view-own + admin-read + update-own policies", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const policies = await getPolicies("profiles");
  assert(policies.length >= 3, `Expected >= 3 policies, got ${policies.length}: ${policies.map(p=>p.polname).join(', ')}`);

  const selfSelect = policies.find(p => p.cmd === 'SELECT' && p.qual?.includes("auth.uid()") && p.qual?.includes("user_id"));
  assert(selfSelect, "Must have user_id = auth.uid() SELECT policy");

  const adminRead = policies.find(p => p.cmd === 'SELECT' && p.qual?.includes("has_role"));
  assert(adminRead, "Must have admin SELECT policy using has_role()");

  const updateOwn = policies.find(p => p.cmd === 'UPDATE' && p.qual?.includes("auth.uid()"));
  assert(updateOwn, "Must have UPDATE policy with auth.uid()");
}});

// ============================================
// 2. USER_ROLES
// ============================================
Deno.test({ name: "2. user_roles: no open SELECT, admin-only management", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const policies = await getPolicies("user_roles");
  
  for (const p of policies) {
    const expr = `${p.qual ?? ''} ${p.with_check ?? ''}`;
    assert(
      expr.includes("has_role") || expr.includes("is_admin"),
      `Policy "${p.polname}" (${p.cmd}) must require admin: ${expr}`
    );
  }
}});

// ============================================
// 3. ORGANIZATIONS
// ============================================
Deno.test({ name: "3. organizations: member-scoped via get_user_org_ids", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const policies = await getPolicies("organizations");
  assert(policies.length >= 2, `Expected >= 2 policies, got ${policies.length}`);

  const selectPolicy = policies.find(p => p.cmd === 'SELECT');
  assert(selectPolicy, "Must have SELECT policy");
  assert(selectPolicy!.qual?.includes("get_user_org_ids"), 
    `SELECT must use get_user_org_ids: ${selectPolicy!.qual}`);

  const deletePolicy = policies.find(p => p.cmd === 'DELETE');
  assertEquals(deletePolicy, undefined, "Should NOT have DELETE policy on organizations");
}});

// ============================================
// 4. ORGANIZATION_MEMBERS
// ============================================
Deno.test({ name: "4. organization_members: owner-only write, member read", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const policies = await getPolicies("organization_members");

  const insertPolicy = policies.find(p => p.cmd === 'INSERT');
  assert(insertPolicy, "Must have INSERT policy");
  const insertExpr = `${insertPolicy!.qual ?? ''} ${insertPolicy!.with_check ?? ''}`;
  assert(insertExpr.includes("owner"), `INSERT must require owner role: ${insertExpr}`);

  const updatePolicy = policies.find(p => p.cmd === 'UPDATE');
  assert(updatePolicy, "Must have UPDATE policy");
  assert(updatePolicy!.qual?.includes("owner"), `UPDATE must require owner: ${updatePolicy!.qual}`);
}});

// ============================================
// 5. QUOTES
// ============================================
Deno.test({ name: "5. quotes: seller_id + org isolation + admin bypass", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const policies = await getPolicies("quotes");
  assert(policies.length >= 2, `Expected >= 2 policies, got ${policies.length}`);

  const sellerSelect = policies.find(p => p.cmd === 'SELECT' && p.qual?.includes("seller_id"));
  assert(sellerSelect, "Must have seller-scoped SELECT policy");
  assert(sellerSelect!.qual!.includes("seller_id"), "Must check seller_id");
  assert(
    sellerSelect!.qual!.includes("organization_id") || sellerSelect!.qual!.includes("get_user_org_ids"),
    `Must enforce org isolation: ${sellerSelect!.qual}`
  );

  const allPoliciesText = policies.map(p => p.qual ?? '').join(' ');
  assert(
    allPoliciesText.includes("has_role") || allPoliciesText.includes("is_admin") || allPoliciesText.includes("is_manager_or_admin"),
    "Must include admin/manager bypass"
  );
}});

// ============================================
// 6. ORDERS
// ============================================
Deno.test({ name: "6. orders: seller_id + org isolation enforced", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const policies = await getPolicies("orders");
  assert(policies.length >= 2, `Expected >= 2 policies, got ${policies.length}`);

  const sellerSelect = policies.find(p => p.cmd === 'SELECT' && p.qual?.includes("seller_id"));
  assert(sellerSelect, "Must have seller-scoped SELECT");
  assert(
    sellerSelect!.qual!.includes("get_user_org_ids") || sellerSelect!.qual!.includes("organization_id"),
    `Must enforce org isolation: ${sellerSelect!.qual}`
  );
}});

// ============================================
// 7. ORDER_ITEMS
// ============================================
Deno.test({ name: "7. order_items: org-scoped access", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const policies = await getPolicies("order_items");
  assert(policies.length >= 1, "Must have at least 1 policy");

  const selectPolicy = policies.find(p => p.cmd === 'SELECT' || p.cmd === 'ALL');
  assert(selectPolicy, "Must have SELECT/ALL policy");
  assert(
    selectPolicy!.qual?.includes("organization_id") || selectPolicy!.qual?.includes("get_user_org_ids"),
    `Must be org-scoped: ${selectPolicy!.qual}`
  );
}});

// ============================================
// 8. QUOTE_ITEMS
// ============================================
Deno.test({ name: "8. quote_items: access via quote ownership (seller_id join)", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const policies = await getPolicies("quote_items");
  assert(policies.length >= 1, "Must have at least 1 policy");

  const selectPolicy = policies.find(p => p.cmd === 'SELECT' || p.cmd === 'ALL');
  assert(selectPolicy, "Must have SELECT/ALL policy");
  assert(
    selectPolicy!.qual?.includes("quotes") || selectPolicy!.qual?.includes("seller_id"),
    `Must verify via quote ownership: ${selectPolicy!.qual}`
  );
}});

// ============================================
// 9. QUOTE_APPROVAL_TOKENS
// ============================================
Deno.test({ name: "9. quote_approval_tokens: full CRUD scoped to seller_id", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const policies = await getPolicies("quote_approval_tokens");

  const cmds = policies.map(p => p.cmd);
  for (const required of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    assert(cmds.includes(required), `Must have ${required} policy`);
  }

  for (const p of policies) {
    const expr = `${p.qual ?? ''} ${p.with_check ?? ''}`;
    assert(expr.includes("seller_id"), `Policy "${p.polname}" (${p.cmd}) must check seller_id: ${expr}`);
  }
}});

// ============================================
// 10. ADMIN_AUDIT_LOG
// ============================================
Deno.test({ name: "10. admin_audit_log: admin-only read+insert, no update/delete", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const policies = await getPolicies("admin_audit_log");
  assert(policies.length >= 2, `Expected >= 2 policies, got ${policies.length}`);

  for (const p of policies) {
    const expr = `${p.qual ?? ''} ${p.with_check ?? ''}`;
    assert(
      expr.includes("has_role") && expr.includes("admin"),
      `Policy "${p.polname}" must require admin: ${expr}`
    );
  }

  const hasMutation = policies.some(p => p.cmd === 'UPDATE' || p.cmd === 'DELETE');
  assertEquals(hasMutation, false, "Audit logs must NOT allow UPDATE/DELETE");
}});

// ============================================
// CROSS: No overly permissive policies
// ============================================
Deno.test({ name: "CROSS: no open 'true' policies on sensitive tables", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const sensitive = ["profiles", "user_roles", "quotes", "orders", "admin_audit_log"];
  for (const t of sensitive) {
    const policies = await getPolicies(t);
    for (const p of policies) {
      assert(
        p.qual !== 'true',
        `${t}: policy "${p.polname}" has dangerously open 'true' USING clause`
      );
    }
  }
}});

// Cleanup
Deno.test({ name: "CLEANUP: close pool", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await pool.end();
}});
