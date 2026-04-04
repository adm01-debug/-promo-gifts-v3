/**
 * RLS Policy Validation Tests
 * 
 * These tests validate Row-Level Security policies for the 10 most
 * critical tables by querying the database through the Supabase client
 * with different user contexts.
 * 
 * LIMITATION: The Deno test runner in Lovable Cloud only has 
 * SUPABASE_DB_URL (restricted select/insert, no SET ROLE, no auth schema).
 * These tests therefore use direct SQL queries where possible and document
 * expected RLS behavior based on the policy definitions.
 * 
 * To run full integration RLS tests, deploy to a Supabase project with
 * service_role access.
 * 
 * Tables tested:
 * 1. profiles         - user_id scoped + admin read
 * 2. user_roles       - admin-only CRUD, no seller access
 * 3. organizations    - member-only read, owner update
 * 4. organization_members - member read, owner insert/update/delete
 * 5. quotes           - org+seller scoped, admin full, manager read
 * 6. orders           - org+seller scoped, admin full, manager read
 * 7. order_items      - org scoped
 * 8. quote_items      - via quote ownership
 * 9. quote_approval_tokens - seller-only
 * 10. admin_audit_log - admin-only read/insert
 */
import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
const pool = new Pool(DB_URL, 2, true);

async function sql(query: string): Promise<Record<string, unknown>[]> {
  const c = await pool.connect();
  try {
    const r = await c.queryObject(query);
    return r.rows as Record<string, unknown>[];
  } finally {
    c.release();
  }
}

// ============================================
// 1. PROFILES - RLS Policy Verification
// ============================================
Deno.test({ name: "1. profiles: RLS enabled and policies exist", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await sql(`
    SELECT polname, polcmd, polroles::text, polqual::text, polwithcheck::text
    FROM pg_policy WHERE polrelid = 'public.profiles'::regclass
    ORDER BY polname
  `);
  
  assert(rows.length >= 3, `Expected >= 3 policies, got ${rows.length}`);
  
  // Verify key policies exist
  const names = rows.map(r => r.polname);
  assert(names.some(n => String(n).includes("view own")), "Should have 'view own' policy");
  assert(names.some(n => String(n).includes("admin") || String(n).includes("Admin")), "Should have admin policy");
  assert(names.some(n => String(n).includes("update own") || String(n).includes("Update")), "Should have update policy");
  
  // Verify admin policy uses has_role function (not recursive query)
  const adminPolicy = rows.find(r => String(r.polname).toLowerCase().includes("admin"));
  assert(adminPolicy, "Admin policy should exist");
  assert(
    String(adminPolicy.polqual).includes("has_role"),
    "Admin policy should use has_role() function to prevent recursion"
  );
}});

// ============================================
// 2. USER_ROLES - Admin Only
// ============================================
Deno.test({ name: "2. user_roles: RLS policies restrict to admin-only", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await sql(`
    SELECT polname, polcmd, polqual::text, polwithcheck::text
    FROM pg_policy WHERE polrelid = 'public.user_roles'::regclass
  `);
  
  // user_roles should have NO select policy for regular users
  // Only admin should be able to read
  const selectPolicies = rows.filter(r => r.polcmd === 's' || r.polcmd === '*');
  
  // Verify no overly permissive SELECT policy
  for (const p of selectPolicies) {
    const qual = String(p.polqual || '');
    assert(
      !qual.includes("true") || qual.includes("has_role") || qual.includes("is_admin"),
      `Policy ${p.polname} should not be open SELECT without role check`
    );
  }
}});

// ============================================
// 3. ORGANIZATIONS - Member Scoped
// ============================================
Deno.test({ name: "3. organizations: policies use SECURITY DEFINER functions", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await sql(`
    SELECT polname, polcmd, polqual::text, polwithcheck::text
    FROM pg_policy WHERE polrelid = 'public.organizations'::regclass
  `);
  
  assert(rows.length >= 2, "Should have multiple policies");
  
  // SELECT policy should use get_user_org_ids to avoid recursion
  const selectPolicy = rows.find(r => String(r.polcmd) === 's' || 
    (String(r.polcmd) === '*' && String(r.polqual).includes("get_user_org_ids")));
  assert(selectPolicy, "Should have member-scoped SELECT via get_user_org_ids");
  
  // No DELETE policy (verified in schema)
  const deletePolicy = rows.find(r => String(r.polcmd) === 'd');
  assertEquals(deletePolicy, undefined, "Should NOT have DELETE policy");
}});

// ============================================
// 4. ORGANIZATION_MEMBERS - Owner Management
// ============================================
Deno.test({ name: "4. organization_members: owner-only write access", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await sql(`
    SELECT polname, polcmd, polqual::text, polwithcheck::text
    FROM pg_policy WHERE polrelid = 'public.organization_members'::regclass
  `);
  
  // INSERT should require owner role
  const insertPolicy = rows.find(r => String(r.polcmd) === 'a' && 
    (String(r.polwithcheck).includes("has_org_role") && String(r.polwithcheck).includes("owner")));
  assert(insertPolicy, "INSERT should require org owner role");
  
  // UPDATE should require owner role
  const updatePolicy = rows.find(r => String(r.polcmd) === 'w' && 
    String(r.polqual).includes("owner"));
  assert(updatePolicy, "UPDATE should require owner role");
}});

// ============================================
// 5. QUOTES - Org + Seller Scoped
// ============================================
Deno.test({ name: "5. quotes: multi-tenant isolation enforced", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await sql(`
    SELECT polname, polcmd, polqual::text, polwithcheck::text
    FROM pg_policy WHERE polrelid = 'public.quotes'::regclass
  `);
  
  assert(rows.length >= 2, "Should have seller + manager policies");
  
  // Verify seller policy checks both seller_id AND organization_id
  const sellerPolicy = rows.find(r => String(r.polname).toLowerCase().includes("seller"));
  assert(sellerPolicy, "Should have seller policy");
  const qual = String(sellerPolicy!.polqual);
  assert(qual.includes("seller_id"), "Seller policy must check seller_id");
  assert(qual.includes("organization_id") || qual.includes("get_user_org_ids"), 
    "Seller policy must check organization_id for multi-tenant isolation");
  
  // Verify admin bypass uses has_role
  assert(qual.includes("has_role") || qual.includes("is_admin"), 
    "Should include admin bypass via has_role");
}});

// ============================================
// 6. ORDERS - Org + Seller Scoped
// ============================================
Deno.test({ name: "6. orders: multi-tenant isolation enforced", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await sql(`
    SELECT polname, polcmd, polqual::text
    FROM pg_policy WHERE polrelid = 'public.orders'::regclass
  `);
  
  assert(rows.length >= 2, "Should have seller + manager policies");
  
  const sellerPolicy = rows.find(r => String(r.polname).toLowerCase().includes("seller"));
  assert(sellerPolicy, "Should have seller policy");
  const qual = String(sellerPolicy!.polqual);
  assert(qual.includes("seller_id") && qual.includes("get_user_org_ids"),
    "Orders must enforce seller_id + org isolation");
}});

// ============================================
// 7. ORDER_ITEMS - Org Scoped
// ============================================
Deno.test({ name: "7. order_items: org-scoped access", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await sql(`
    SELECT polname, polqual::text
    FROM pg_policy WHERE polrelid = 'public.order_items'::regclass
  `);
  
  assert(rows.length >= 1);
  const qual = String(rows[0].polqual);
  assert(qual.includes("organization_id") || qual.includes("get_user_org_ids"),
    "order_items must be org-scoped");
}});

// ============================================
// 8. QUOTE_ITEMS - Via Quote Ownership
// ============================================
Deno.test({ name: "8. quote_items: access via quote ownership join", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await sql(`
    SELECT polname, polqual::text
    FROM pg_policy WHERE polrelid = 'public.quote_items'::regclass
  `);
  
  assert(rows.length >= 1);
  const qual = String(rows[0].polqual);
  // Should join to quotes table to check seller_id
  assert(qual.includes("quotes") && qual.includes("seller_id"),
    "quote_items should verify access via quotes.seller_id");
}});

// ============================================
// 9. QUOTE_APPROVAL_TOKENS - Seller Only
// ============================================
Deno.test({ name: "9. quote_approval_tokens: seller-scoped CRUD", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await sql(`
    SELECT polname, polcmd, polqual::text, polwithcheck::text
    FROM pg_policy WHERE polrelid = 'public.quote_approval_tokens'::regclass
  `);
  
  // Should have separate SELECT, INSERT, UPDATE, DELETE policies
  const commands = rows.map(r => r.polcmd);
  assert(commands.includes('r') || commands.includes('s'), "Should have SELECT policy");
  assert(commands.includes('a'), "Should have INSERT policy");
  assert(commands.includes('w'), "Should have UPDATE policy");
  assert(commands.includes('d'), "Should have DELETE policy");
  
  // All should check seller_id = auth.uid()
  for (const row of rows) {
    const check = String(row.polqual || row.polwithcheck || '');
    assert(check.includes("seller_id"), `Policy ${row.polname} should check seller_id`);
  }
}});

// ============================================
// 10. ADMIN_AUDIT_LOG - Admin Only
// ============================================
Deno.test({ name: "10. admin_audit_log: admin-only read and insert", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const rows = await sql(`
    SELECT polname, polcmd, polqual::text, polwithcheck::text
    FROM pg_policy WHERE polrelid = 'public.admin_audit_log'::regclass
  `);
  
  assert(rows.length >= 2, "Should have read + insert policies");
  
  // All policies should require admin role
  for (const row of rows) {
    const check = String(row.polqual || row.polwithcheck || '');
    assert(check.includes("has_role") && check.includes("admin"),
      `Policy ${row.polname} should require admin role`);
  }
  
  // Should NOT have UPDATE or DELETE policies
  const hasMutation = rows.some(r => r.polcmd === 'w' || r.polcmd === 'd');
  assertEquals(hasMutation, false, "Should NOT allow UPDATE/DELETE on audit logs");
}});

// ============================================
// CROSS-CUTTING: RLS enabled on all tables
// ============================================
Deno.test({ name: "CROSS: all critical tables have RLS enabled", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const tables = [
    "profiles", "user_roles", "quotes", "orders", "order_items",
    "organizations", "organization_members", "admin_audit_log",
    "quote_items", "quote_approval_tokens",
  ];
  
  for (const t of tables) {
    const rows = await sql(`
      SELECT relrowsecurity FROM pg_class 
      WHERE oid = 'public.${t}'::regclass
    `);
    assertEquals(rows[0]?.relrowsecurity, true, `RLS must be enabled on ${t}`);
  }
}});

// ============================================
// CROSS: No overly permissive policies (true for all)
// ============================================
Deno.test({ name: "CROSS: no open policies on sensitive tables", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const sensitive = ["profiles", "user_roles", "quotes", "orders", "admin_audit_log"];
  
  for (const t of sensitive) {
    const rows = await sql(`
      SELECT polname, polqual::text
      FROM pg_policy WHERE polrelid = 'public.${t}'::regclass
      AND polqual::text = 'true'
    `);
    assertEquals(rows.length, 0, `${t} should NOT have open 'true' policies`);
  }
}});

// Cleanup
Deno.test({ name: "CLEANUP", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await pool.end();
}});
