/**
 * RLS Policy Tests for 10 Critical Tables
 * 
 * Uses direct SQL with set_config to simulate different auth contexts,
 * validating that RLS policies enforce proper data isolation.
 * 
 * Tables tested:
 * 1. profiles
 * 2. user_roles
 * 3. organizations
 * 4. organization_members
 * 5. quotes
 * 6. orders
 * 7. order_items
 * 8. quote_items
 * 9. quote_approval_tokens
 * 10. admin_audit_log
 */
import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";

// We need the postgres module for direct SQL
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const pool = new Pool(DB_URL, 3, true);

async function query(sql: string): Promise<{ rows: Record<string, unknown>[] }> {
  const conn = await pool.connect();
  try {
    const result = await conn.queryObject(sql);
    return { rows: result.rows as Record<string, unknown>[] };
  } finally {
    conn.release();
  }
}

async function queryAs(userId: string, role: string, sql: string): Promise<Record<string, unknown>[]> {
  const conn = await pool.connect();
  try {
    // Set the auth context for RLS
    await conn.queryObject(`SELECT set_config('request.jwt.claims', '{"sub":"${userId}","role":"${role}"}', true)`);
    await conn.queryObject(`SET LOCAL ROLE authenticated`);
    await conn.queryObject(`SELECT set_config('request.jwt.claim.sub', '${userId}', true)`);
    const result = await conn.queryObject(sql);
    return result.rows as Record<string, unknown>[];
  } finally {
    // Reset role
    try { await conn.queryObject(`RESET ROLE`); } catch { /* ignore */ }
    conn.release();
  }
}

async function queryAsAnon(sql: string): Promise<Record<string, unknown>[]> {
  const conn = await pool.connect();
  try {
    await conn.queryObject(`SELECT set_config('request.jwt.claims', '{}', true)`);
    await conn.queryObject(`SET LOCAL ROLE anon`);
    const result = await conn.queryObject(sql);
    return result.rows as Record<string, unknown>[];
  } finally {
    try { await conn.queryObject(`RESET ROLE`); } catch { /* ignore */ }
    conn.release();
  }
}

// Test IDs (UUIDs that won't collide)
const SELLER_A_ID = "a0000000-0000-0000-0000-000000000001";
const SELLER_B_ID = "b0000000-0000-0000-0000-000000000002";
const ADMIN_ID =    "c0000000-0000-0000-0000-000000000003";
const ORG_ID =      "d0000000-0000-0000-0000-000000000004";

// ---------- Setup & Teardown ----------

async function setupTestData() {
  // Create test users in auth.users (service role)
  await query(`
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, instance_id)
    VALUES 
      ('${SELLER_A_ID}', 'rls-seller-a@test.local', crypt('password123', gen_salt('bf')), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
      ('${SELLER_B_ID}', 'rls-seller-b@test.local', crypt('password123', gen_salt('bf')), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
      ('${ADMIN_ID}', 'rls-admin@test.local', crypt('password123', gen_salt('bf')), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
    ON CONFLICT (id) DO NOTHING
  `);

  // Create profiles
  await query(`
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES 
      ('${SELLER_A_ID}', 'rls-seller-a@test.local', 'Seller A', 'vendedor'),
      ('${SELLER_B_ID}', 'rls-seller-b@test.local', 'Seller B', 'vendedor'),
      ('${ADMIN_ID}', 'rls-admin@test.local', 'Admin User', 'admin')
    ON CONFLICT (user_id) DO NOTHING
  `);

  // Create roles
  await query(`
    INSERT INTO public.user_roles (user_id, role)
    VALUES 
      ('${SELLER_A_ID}', 'vendedor'),
      ('${SELLER_B_ID}', 'vendedor'),
      ('${ADMIN_ID}', 'admin')
    ON CONFLICT (user_id, role) DO NOTHING
  `);

  // Create organization
  await query(`
    INSERT INTO public.organizations (id, name, slug)
    VALUES ('${ORG_ID}', 'RLS Test Org', 'rls-test-org-${Date.now()}')
    ON CONFLICT (id) DO NOTHING
  `);

  // Add members
  await query(`
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES 
      ('${ORG_ID}', '${SELLER_A_ID}', 'member'),
      ('${ORG_ID}', '${SELLER_B_ID}', 'member'),
      ('${ORG_ID}', '${ADMIN_ID}', 'owner')
    ON CONFLICT DO NOTHING
  `);

  // Create quotes
  await query(`
    INSERT INTO public.quotes (id, seller_id, organization_id, client_name, status, quote_number)
    VALUES 
      ('e0000000-0000-0000-0000-000000000001', '${SELLER_A_ID}', '${ORG_ID}', 'Client A', 'draft', 'RLS-A/99'),
      ('e0000000-0000-0000-0000-000000000002', '${SELLER_B_ID}', '${ORG_ID}', 'Client B', 'draft', 'RLS-B/99')
    ON CONFLICT (id) DO NOTHING
  `);

  // Create quote items
  await query(`
    INSERT INTO public.quote_items (id, quote_id, product_name, quantity, unit_price)
    VALUES 
      ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Product A', 10, 5.00),
      ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Product B', 20, 10.00)
    ON CONFLICT (id) DO NOTHING
  `);

  // Create quote approval tokens
  await query(`
    INSERT INTO public.quote_approval_tokens (id, quote_id, seller_id, client_name)
    VALUES 
      ('f1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '${SELLER_A_ID}', 'Token A'),
      ('f1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '${SELLER_B_ID}', 'Token B')
    ON CONFLICT (id) DO NOTHING
  `);

  // Create orders
  await query(`
    INSERT INTO public.orders (id, seller_id, organization_id, client_name, order_number)
    VALUES 
      ('f2000000-0000-0000-0000-000000000001', '${SELLER_A_ID}', '${ORG_ID}', 'Order Client A', 'PED-RLS-0001'),
      ('f2000000-0000-0000-0000-000000000002', '${SELLER_B_ID}', '${ORG_ID}', 'Order Client B', 'PED-RLS-0002')
    ON CONFLICT (id) DO NOTHING
  `);

  // Create order items
  await query(`
    INSERT INTO public.order_items (id, order_id, organization_id, product_name, quantity)
    VALUES 
      ('f3000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', '${ORG_ID}', 'Order Item A', 5),
      ('f3000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000002', '${ORG_ID}', 'Order Item B', 10)
    ON CONFLICT (id) DO NOTHING
  `);

  // Create audit log entry
  await query(`
    INSERT INTO public.admin_audit_log (id, user_id, action, resource_type)
    VALUES ('f4000000-0000-0000-0000-000000000001', '${ADMIN_ID}', 'rls_test_action', 'rls_test')
    ON CONFLICT (id) DO NOTHING
  `);
}

async function teardownTestData() {
  const ids = `'${SELLER_A_ID}','${SELLER_B_ID}','${ADMIN_ID}'`;
  await query(`DELETE FROM public.admin_audit_log WHERE id = 'f4000000-0000-0000-0000-000000000001'`);
  await query(`DELETE FROM public.quote_approval_tokens WHERE id IN ('f1000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000002')`);
  await query(`DELETE FROM public.quote_items WHERE id IN ('f0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000002')`);
  await query(`DELETE FROM public.quotes WHERE id IN ('e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002')`);
  await query(`DELETE FROM public.order_items WHERE id IN ('f3000000-0000-0000-0000-000000000001','f3000000-0000-0000-0000-000000000002')`);
  await query(`DELETE FROM public.orders WHERE id IN ('f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000002')`);
  await query(`DELETE FROM public.organization_members WHERE organization_id = '${ORG_ID}'`);
  await query(`DELETE FROM public.organizations WHERE id = '${ORG_ID}'`);
  await query(`DELETE FROM public.user_roles WHERE user_id IN (${ids})`);
  await query(`DELETE FROM public.profiles WHERE user_id IN (${ids})`);
  await query(`DELETE FROM auth.users WHERE id IN (${ids})`);
}

// ============================================
// TESTS
// ============================================

Deno.test({
  name: "RLS Test Suite - Setup",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await setupTestData();
  },
});

// --- 1. PROFILES ---
Deno.test({
  name: "1. profiles: seller sees only own profile",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(SELLER_A_ID, "authenticated", 
      `SELECT user_id FROM public.profiles WHERE user_id IN ('${SELLER_A_ID}','${SELLER_B_ID}','${ADMIN_ID}')`
    );
    const userIds = rows.map(r => r.user_id);
    assert(userIds.includes(SELLER_A_ID), "Should see own profile");
    assertEquals(userIds.includes(SELLER_B_ID), false, "Should NOT see Seller B");
    assertEquals(userIds.includes(ADMIN_ID), false, "Should NOT see Admin");
  },
});

Deno.test({
  name: "1. profiles: admin sees all profiles",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(ADMIN_ID, "authenticated",
      `SELECT user_id FROM public.profiles WHERE user_id IN ('${SELLER_A_ID}','${SELLER_B_ID}','${ADMIN_ID}')`
    );
    const userIds = rows.map(r => r.user_id);
    assert(userIds.includes(SELLER_A_ID), "Admin should see Seller A");
    assert(userIds.includes(SELLER_B_ID), "Admin should see Seller B");
    assert(userIds.includes(ADMIN_ID), "Admin should see self");
  },
});

// --- 2. USER_ROLES ---
Deno.test({
  name: "2. user_roles: seller cannot read roles",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(SELLER_A_ID, "authenticated",
      `SELECT * FROM public.user_roles WHERE user_id IN ('${SELLER_A_ID}','${SELLER_B_ID}','${ADMIN_ID}')`
    );
    assertEquals(rows.length, 0, "Seller should NOT see any user_roles");
  },
});

Deno.test({
  name: "2. user_roles: seller cannot escalate privileges",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    let errored = false;
    try {
      await queryAs(SELLER_A_ID, "authenticated",
        `INSERT INTO public.user_roles (user_id, role) VALUES ('${SELLER_A_ID}', 'admin')`
      );
    } catch {
      errored = true;
    }
    assertEquals(errored, true, "Seller should NOT be able to self-assign admin role");
  },
});

// --- 3. ORGANIZATIONS ---
Deno.test({
  name: "3. organizations: member sees own org only",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(SELLER_A_ID, "authenticated",
      `SELECT id FROM public.organizations WHERE id = '${ORG_ID}'`
    );
    assertEquals(rows.length, 1, "Member should see their org");
  },
});

Deno.test({
  name: "3. organizations: non-member cannot see org",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    // Use a random UUID that's not a member
    const fakeUserId = "99990000-0000-0000-0000-000000000099";
    const rows = await queryAs(fakeUserId, "authenticated",
      `SELECT id FROM public.organizations WHERE id = '${ORG_ID}'`
    );
    assertEquals(rows.length, 0, "Non-member should NOT see org");
  },
});

// --- 4. ORGANIZATION_MEMBERS ---
Deno.test({
  name: "4. organization_members: member can view org members",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(SELLER_A_ID, "authenticated",
      `SELECT user_id FROM public.organization_members WHERE organization_id = '${ORG_ID}'`
    );
    assert(rows.length >= 3, "Member should see all org members");
  },
});

Deno.test({
  name: "4. organization_members: non-owner cannot add members",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    let errored = false;
    try {
      await queryAs(SELLER_A_ID, "authenticated",
        `INSERT INTO public.organization_members (organization_id, user_id, role) 
         VALUES ('${ORG_ID}', '99990000-0000-0000-0000-000000000088', 'member')`
      );
    } catch {
      errored = true;
    }
    assertEquals(errored, true, "Non-owner should NOT add members");
  },
});

// --- 5. QUOTES (org-scoped) ---
Deno.test({
  name: "5. quotes: seller sees only own quotes (not other seller's)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(SELLER_A_ID, "authenticated",
      `SELECT id, seller_id FROM public.quotes WHERE id IN ('e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002')`
    );
    assert(rows.length >= 1, "Should see at least own quote");
    const allOwn = rows.every(r => r.seller_id === SELLER_A_ID);
    assertEquals(allOwn, true, "Seller A should only see own quotes");
  },
});

Deno.test({
  name: "5. quotes: admin sees all org quotes",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(ADMIN_ID, "authenticated",
      `SELECT id, seller_id FROM public.quotes WHERE organization_id = '${ORG_ID}'`
    );
    const sellerIds = [...new Set(rows.map(r => r.seller_id))];
    assert(sellerIds.includes(SELLER_A_ID), "Admin should see Seller A's quotes");
    assert(sellerIds.includes(SELLER_B_ID), "Admin should see Seller B's quotes");
  },
});

Deno.test({
  name: "5. quotes: seller cannot modify another seller's quote",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    // Try to update seller B's quote as seller A
    await queryAs(SELLER_A_ID, "authenticated",
      `UPDATE public.quotes SET client_name = 'HACKED' WHERE id = 'e0000000-0000-0000-0000-000000000002'`
    );
    // Verify it wasn't changed
    const check = await query(
      `SELECT client_name FROM public.quotes WHERE id = 'e0000000-0000-0000-0000-000000000002'`
    );
    assert(check.rows[0]?.client_name !== "HACKED", "Seller B's quote should NOT be modified");
  },
});

// --- 6. ORDERS (org-scoped) ---
Deno.test({
  name: "6. orders: seller sees only own orders",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(SELLER_A_ID, "authenticated",
      `SELECT id, seller_id FROM public.orders WHERE id IN ('f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000002')`
    );
    const allOwn = rows.every(r => r.seller_id === SELLER_A_ID);
    assertEquals(allOwn, true, "Seller A should only see own orders");
  },
});

Deno.test({
  name: "6. orders: seller cannot delete another's order",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await queryAs(SELLER_A_ID, "authenticated",
      `DELETE FROM public.orders WHERE id = 'f2000000-0000-0000-0000-000000000002'`
    );
    const check = await query(`SELECT id FROM public.orders WHERE id = 'f2000000-0000-0000-0000-000000000002'`);
    assertEquals(check.rows.length, 1, "Seller B's order should still exist");
  },
});

// --- 7. ORDER_ITEMS (org-scoped) ---
Deno.test({
  name: "7. order_items: org member can see org items",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(SELLER_A_ID, "authenticated",
      `SELECT id FROM public.order_items WHERE organization_id = '${ORG_ID}'`
    );
    assert(rows.length >= 1, "Org member should see org order items");
  },
});

// --- 8. QUOTE_ITEMS (via quote ownership) ---
Deno.test({
  name: "8. quote_items: seller sees only items from own quotes",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(SELLER_A_ID, "authenticated",
      `SELECT qi.id, qi.product_name, qi.quote_id 
       FROM public.quote_items qi 
       WHERE qi.id IN ('f0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000002')`
    );
    const allFromOwnQuotes = rows.every(
      r => r.quote_id === "e0000000-0000-0000-0000-000000000001"
    );
    assertEquals(allFromOwnQuotes, true, "Should only see items from own quotes");
  },
});

// --- 9. QUOTE_APPROVAL_TOKENS (seller-scoped) ---
Deno.test({
  name: "9. quote_approval_tokens: seller sees only own tokens",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(SELLER_A_ID, "authenticated",
      `SELECT id, seller_id FROM public.quote_approval_tokens 
       WHERE id IN ('f1000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000002')`
    );
    const allOwn = rows.every(r => r.seller_id === SELLER_A_ID);
    assertEquals(allOwn, true, "Seller should only see own tokens");
  },
});

Deno.test({
  name: "9. quote_approval_tokens: seller cannot delete another's token",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await queryAs(SELLER_A_ID, "authenticated",
      `DELETE FROM public.quote_approval_tokens WHERE id = 'f1000000-0000-0000-0000-000000000002'`
    );
    const check = await query(`SELECT id FROM public.quote_approval_tokens WHERE id = 'f1000000-0000-0000-0000-000000000002'`);
    assertEquals(check.rows.length, 1, "Seller B's token should still exist");
  },
});

// --- 10. ADMIN_AUDIT_LOG (admin-only) ---
Deno.test({
  name: "10. admin_audit_log: seller cannot read audit logs",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(SELLER_A_ID, "authenticated",
      `SELECT id FROM public.admin_audit_log WHERE id = 'f4000000-0000-0000-0000-000000000001'`
    );
    assertEquals(rows.length, 0, "Seller should NOT see audit logs");
  },
});

Deno.test({
  name: "10. admin_audit_log: admin can read audit logs",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const rows = await queryAs(ADMIN_ID, "authenticated",
      `SELECT id FROM public.admin_audit_log WHERE id = 'f4000000-0000-0000-0000-000000000001'`
    );
    assert(rows.length >= 1, "Admin should see audit logs");
  },
});

Deno.test({
  name: "10. admin_audit_log: seller cannot insert audit logs",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    let errored = false;
    try {
      await queryAs(SELLER_A_ID, "authenticated",
        `INSERT INTO public.admin_audit_log (user_id, action, resource_type) 
         VALUES ('${SELLER_A_ID}', 'malicious', 'exploit')`
      );
    } catch {
      errored = true;
    }
    assertEquals(errored, true, "Seller should NOT insert audit logs");
  },
});

// --- CROSS-CUTTING: Anon access ---
Deno.test({
  name: "CROSS: anon cannot access critical tables",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const tables = [
      "profiles", "user_roles", "quotes", "orders", 
      "order_items", "organizations", "admin_audit_log",
      "quote_items", "quote_approval_tokens", "organization_members",
    ];
    
    for (const table of tables) {
      const rows = await queryAsAnon(`SELECT * FROM public.${table} LIMIT 1`);
      assertEquals(rows.length, 0, `Anon should NOT see data in ${table}`);
    }
  },
});

// --- Teardown ---
Deno.test({
  name: "RLS Test Suite - Teardown",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    await teardownTestData();
    await pool.end();
  },
});
