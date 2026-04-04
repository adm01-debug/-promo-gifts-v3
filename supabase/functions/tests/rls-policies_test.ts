/**
 * RLS Policy Tests for 10 Critical Tables
 * 
 * Tests validate that each role (admin, manager, vendedor) can only
 * access data they're authorized to see/modify.
 * 
 * Strategy: Uses service_role to set up test data, then uses
 * anon/authenticated clients to verify RLS enforcement.
 */
import {
  assertEquals,
  assertExists,
  assert,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ---------- helpers ----------

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("EXTERNAL_SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authedClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
  return client;
}

// Test user credentials (created by setup)
const TEST_PASSWORD = "TestPassword123!";
const SELLER_A_EMAIL = `rls-test-seller-a-${Date.now()}@test.local`;
const SELLER_B_EMAIL = `rls-test-seller-b-${Date.now()}@test.local`;
const ADMIN_EMAIL = `rls-test-admin-${Date.now()}@test.local`;

let sellerAId: string;
let sellerBId: string;
let adminId: string;
let orgId: string;

// ---------- setup / teardown ----------

async function setupTestUsers() {
  const svc = serviceClient();

  // Create test users
  const { data: userA, error: errA } = await svc.auth.admin.createUser({
    email: SELLER_A_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (errA) throw new Error(`Failed to create seller A: ${errA.message}`);
  sellerAId = userA.user!.id;

  const { data: userB, error: errB } = await svc.auth.admin.createUser({
    email: SELLER_B_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (errB) throw new Error(`Failed to create seller B: ${errB.message}`);
  sellerBId = userB.user!.id;

  const { data: userAdmin, error: errAdmin } = await svc.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (errAdmin) throw new Error(`Failed to create admin: ${errAdmin.message}`);
  adminId = userAdmin.user!.id;

  // Assign admin role
  await svc.from("user_roles").upsert({
    user_id: adminId,
    role: "admin",
  }, { onConflict: "user_id,role" });

  // Create organization
  const { data: org } = await svc.from("organizations").insert({
    name: "RLS Test Org",
    slug: `rls-test-org-${Date.now()}`,
  }).select("id").single();
  orgId = org!.id;

  // Add both sellers to org
  await svc.from("organization_members").insert([
    { organization_id: orgId, user_id: sellerAId, role: "member" },
    { organization_id: orgId, user_id: sellerBId, role: "member" },
    { organization_id: orgId, user_id: adminId, role: "owner" },
  ]);
}

async function teardownTestUsers() {
  const svc = serviceClient();
  
  // Clean up in reverse dependency order
  await svc.from("quote_approval_tokens").delete().in("seller_id", [sellerAId, sellerBId, adminId]);
  await svc.from("quote_items").delete().in("quote_id", 
    (await svc.from("quotes").select("id").in("seller_id", [sellerAId, sellerBId, adminId])).data?.map(q => q.id) ?? []
  );
  await svc.from("quotes").delete().in("seller_id", [sellerAId, sellerBId, adminId]);
  await svc.from("order_items").delete().eq("organization_id", orgId);
  await svc.from("orders").delete().in("seller_id", [sellerAId, sellerBId, adminId]);
  await svc.from("admin_audit_log").delete().in("user_id", [sellerAId, sellerBId, adminId]);
  await svc.from("organization_members").delete().eq("organization_id", orgId);
  await svc.from("organizations").delete().eq("id", orgId);
  await svc.from("profiles").delete().in("user_id", [sellerAId, sellerBId, adminId]);
  await svc.from("user_roles").delete().in("user_id", [sellerAId, sellerBId, adminId]);
  
  // Delete test users
  await svc.auth.admin.deleteUser(sellerAId);
  await svc.auth.admin.deleteUser(sellerBId);
  await svc.auth.admin.deleteUser(adminId);
}

// ============================================
// TESTS
// ============================================

Deno.test({
  name: "RLS Test Suite",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    // Setup
    await setupTestUsers();

    try {
      // --- 1. PROFILES ---
      await t.step("profiles: seller can only read own profile", async () => {
        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { data } = await clientA.from("profiles").select("user_id");
        
        assert(data !== null, "Should return data");
        assert(data.length >= 1, "Should have at least own profile");
        
        // Should NOT contain seller B's profile
        const hasSellerB = data.some((p: { user_id: string }) => p.user_id === sellerBId);
        assertEquals(hasSellerB, false, "Seller A should NOT see Seller B's profile");
        
        // Should contain own profile
        const hasOwnProfile = data.some((p: { user_id: string }) => p.user_id === sellerAId);
        assertEquals(hasOwnProfile, true, "Seller A should see own profile");
      });

      await t.step("profiles: admin can read all profiles", async () => {
        const adminClient = await authedClient(ADMIN_EMAIL, TEST_PASSWORD);
        const { data } = await adminClient.from("profiles").select("user_id");
        
        assert(data !== null, "Admin should return data");
        assert(data.length >= 3, "Admin should see at least 3 test profiles");
        
        const userIds = data.map((p: { user_id: string }) => p.user_id);
        assert(userIds.includes(sellerAId), "Admin should see seller A");
        assert(userIds.includes(sellerBId), "Admin should see seller B");
      });

      await t.step("profiles: seller cannot update another seller's profile", async () => {
        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { error } = await clientA
          .from("profiles")
          .update({ department: "HACKED" })
          .eq("user_id", sellerBId);
        
        // Should either error or affect 0 rows (RLS blocks it)
        // No error means 0 rows matched due to RLS
        const { data: check } = await serviceClient()
          .from("profiles")
          .select("department")
          .eq("user_id", sellerBId)
          .single();
        assert(check?.department !== "HACKED", "Seller B's profile should NOT be modified by Seller A");
      });

      // --- 2. USER_ROLES ---
      await t.step("user_roles: seller cannot read roles", async () => {
        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { data } = await clientA.from("user_roles").select("*");
        
        // user_roles has no SELECT policy for non-admins
        // Should return empty or error
        assertEquals(data?.length ?? 0, 0, "Seller should NOT see any user_roles");
      });

      await t.step("user_roles: seller cannot insert roles", async () => {
        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { error } = await clientA.from("user_roles").insert({
          user_id: sellerAId,
          role: "admin",
        });
        
        assert(error !== null, "Seller should NOT be able to insert admin role");
      });

      // --- 3. ORGANIZATIONS ---
      await t.step("organizations: members can see their org", async () => {
        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { data } = await clientA.from("organizations").select("id, name");
        
        assert(data !== null, "Should return data");
        const hasOrg = data.some((o: { id: string }) => o.id === orgId);
        assertEquals(hasOrg, true, "Member should see their organization");
      });

      await t.step("organizations: non-member cannot see org", async () => {
        // Create a user outside the org
        const svc = serviceClient();
        const outsiderEmail = `rls-test-outsider-${Date.now()}@test.local`;
        const { data: outsider } = await svc.auth.admin.createUser({
          email: outsiderEmail,
          password: TEST_PASSWORD,
          email_confirm: true,
        });
        const outsiderId = outsider!.user!.id;

        try {
          const outsiderClient = await authedClient(outsiderEmail, TEST_PASSWORD);
          const { data } = await outsiderClient.from("organizations").select("id");
          
          const hasOrg = (data ?? []).some((o: { id: string }) => o.id === orgId);
          assertEquals(hasOrg, false, "Non-member should NOT see the org");
        } finally {
          await svc.from("profiles").delete().eq("user_id", outsiderId);
          await svc.from("user_roles").delete().eq("user_id", outsiderId);
          await svc.auth.admin.deleteUser(outsiderId);
        }
      });

      // --- 4. ORGANIZATION_MEMBERS ---
      await t.step("organization_members: members can see org members", async () => {
        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { data } = await clientA
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", orgId);
        
        assert(data !== null && data.length >= 2, "Member should see org members");
      });

      await t.step("organization_members: non-owner cannot add members", async () => {
        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { error } = await clientA.from("organization_members").insert({
          organization_id: orgId,
          user_id: sellerAId,
          role: "owner",
        });
        
        assert(error !== null, "Non-owner should NOT be able to add members");
      });

      // --- 5. QUOTES (org-scoped) ---
      await t.step("quotes: seller sees only own org quotes", async () => {
        const svc = serviceClient();
        
        // Create quotes for seller A and seller B
        const { data: quoteA } = await svc.from("quotes").insert({
          seller_id: sellerAId,
          organization_id: orgId,
          client_name: "Client A",
          status: "draft",
        }).select("id").single();
        
        const { data: quoteB } = await svc.from("quotes").insert({
          seller_id: sellerBId,
          organization_id: orgId,
          client_name: "Client B",
          status: "draft",
        }).select("id").single();

        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { data } = await clientA.from("quotes").select("id, seller_id");
        
        assert(data !== null, "Should return data");
        
        // Seller A should see own quotes
        const hasOwnQuote = data.some((q: { id: string }) => q.id === quoteA!.id);
        assertEquals(hasOwnQuote, true, "Seller A should see own quote");
        
        // Seller A should NOT see Seller B's quotes
        const hasOtherQuote = data.some((q: { id: string }) => q.id === quoteB!.id);
        assertEquals(hasOtherQuote, false, "Seller A should NOT see Seller B's quote");
      });

      await t.step("quotes: admin can see all quotes", async () => {
        const adminClient = await authedClient(ADMIN_EMAIL, TEST_PASSWORD);
        const { data } = await adminClient
          .from("quotes")
          .select("id, seller_id")
          .eq("organization_id", orgId);
        
        assert(data !== null && data.length >= 2, "Admin should see all org quotes");
      });

      await t.step("quotes: seller cannot update another seller's quote", async () => {
        const svc = serviceClient();
        const { data: quotes } = await svc
          .from("quotes")
          .select("id")
          .eq("seller_id", sellerBId)
          .eq("organization_id", orgId)
          .limit(1);
        
        if (quotes && quotes.length > 0) {
          const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
          const { error } = await clientA
            .from("quotes")
            .update({ client_name: "HACKED" })
            .eq("id", quotes[0].id);
          
          const { data: check } = await svc
            .from("quotes")
            .select("client_name")
            .eq("id", quotes[0].id)
            .single();
          assert(check?.client_name !== "HACKED", "Seller A should NOT modify Seller B's quote");
        }
      });

      // --- 6. ORDERS (org-scoped) ---
      await t.step("orders: seller sees only own org orders", async () => {
        const svc = serviceClient();
        
        await svc.from("orders").insert({
          seller_id: sellerAId,
          organization_id: orgId,
          client_name: "Order Client A",
        });
        
        await svc.from("orders").insert({
          seller_id: sellerBId,
          organization_id: orgId,
          client_name: "Order Client B",
        });

        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { data } = await clientA.from("orders").select("seller_id");
        
        assert(data !== null, "Should return data");
        const allOwn = data.every((o: { seller_id: string }) => o.seller_id === sellerAId);
        assertEquals(allOwn, true, "Seller A should only see own orders");
      });

      // --- 7. ORDER_ITEMS (org-scoped) ---
      await t.step("order_items: org member can see org items", async () => {
        const svc = serviceClient();

        // Get an order from seller A
        const { data: orders } = await svc
          .from("orders")
          .select("id")
          .eq("seller_id", sellerAId)
          .eq("organization_id", orgId)
          .limit(1);

        if (orders && orders.length > 0) {
          await svc.from("order_items").insert({
            order_id: orders[0].id,
            organization_id: orgId,
            product_name: "Test Product",
            quantity: 5,
          });

          const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
          const { data } = await clientA
            .from("order_items")
            .select("id, organization_id")
            .eq("organization_id", orgId);
          
          assert(data !== null && data.length >= 1, "Org member should see org order items");
        }
      });

      // --- 8. QUOTE_ITEMS (via quote ownership) ---
      await t.step("quote_items: seller can only manage items on own quotes", async () => {
        const svc = serviceClient();
        
        // Get quotes
        const { data: quotesA } = await svc
          .from("quotes")
          .select("id")
          .eq("seller_id", sellerAId)
          .limit(1);
        
        const { data: quotesB } = await svc
          .from("quotes")
          .select("id")
          .eq("seller_id", sellerBId)
          .limit(1);

        if (quotesA?.length && quotesB?.length) {
          // Insert items for both quotes
          await svc.from("quote_items").insert({
            quote_id: quotesA[0].id,
            product_name: "Item A",
            quantity: 1,
            unit_price: 10,
          });
          
          await svc.from("quote_items").insert({
            quote_id: quotesB[0].id,
            product_name: "Item B",
            quantity: 1,
            unit_price: 20,
          });

          const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
          const { data } = await clientA.from("quote_items").select("product_name, quote_id");
          
          assert(data !== null, "Should return data");
          // Should only see items from own quotes
          const allFromOwnQuotes = data.every(
            (item: { quote_id: string }) => item.quote_id === quotesA[0].id
          );
          assertEquals(allFromOwnQuotes, true, "Seller A should only see items from own quotes");
        }
      });

      // --- 9. QUOTE_APPROVAL_TOKENS (seller-scoped) ---
      await t.step("quote_approval_tokens: seller sees only own tokens", async () => {
        const svc = serviceClient();
        
        const { data: quotesA } = await svc
          .from("quotes")
          .select("id")
          .eq("seller_id", sellerAId)
          .limit(1);

        const { data: quotesB } = await svc
          .from("quotes")
          .select("id")
          .eq("seller_id", sellerBId)
          .limit(1);

        if (quotesA?.length && quotesB?.length) {
          await svc.from("quote_approval_tokens").insert({
            quote_id: quotesA[0].id,
            seller_id: sellerAId,
            client_name: "Token Client A",
          });
          
          await svc.from("quote_approval_tokens").insert({
            quote_id: quotesB[0].id,
            seller_id: sellerBId,
            client_name: "Token Client B",
          });

          const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
          const { data } = await clientA
            .from("quote_approval_tokens")
            .select("seller_id, client_name");
          
          assert(data !== null, "Should return data");
          const allOwn = data.every(
            (t: { seller_id: string }) => t.seller_id === sellerAId
          );
          assertEquals(allOwn, true, "Seller A should only see own tokens");
        }
      });

      // --- 10. ADMIN_AUDIT_LOG (admin-only) ---
      await t.step("admin_audit_log: seller cannot read audit logs", async () => {
        const svc = serviceClient();
        
        // Insert a test audit entry
        await svc.from("admin_audit_log").insert({
          user_id: adminId,
          action: "test_action",
          resource_type: "rls_test",
        });

        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { data } = await clientA.from("admin_audit_log").select("id");
        
        assertEquals(data?.length ?? 0, 0, "Seller should NOT see audit logs");
      });

      await t.step("admin_audit_log: admin can read audit logs", async () => {
        const adminClient = await authedClient(ADMIN_EMAIL, TEST_PASSWORD);
        const { data } = await adminClient.from("admin_audit_log").select("id");
        
        assert(data !== null && data.length >= 1, "Admin should see audit logs");
      });

      await t.step("admin_audit_log: seller cannot insert audit logs", async () => {
        const clientA = await authedClient(SELLER_A_EMAIL, TEST_PASSWORD);
        const { error } = await clientA.from("admin_audit_log").insert({
          user_id: sellerAId,
          action: "malicious_action",
          resource_type: "exploit",
        });
        
        assert(error !== null, "Seller should NOT be able to insert audit logs");
      });

      // --- CROSS-CUTTING: Anon access ---
      await t.step("anon: cannot access any critical table", async () => {
        const anon = anonClient();
        
        const tables = [
          "profiles", "user_roles", "quotes", "orders", 
          "order_items", "organizations", "admin_audit_log",
        ];
        
        for (const table of tables) {
          const { data, error } = await anon.from(table).select("id").limit(1);
          const count = data?.length ?? 0;
          assertEquals(count, 0, `Anon should NOT see data in ${table}`);
        }
      });

    } finally {
      // Teardown
      await teardownTestUsers();
    }
  },
});
