/**
 * E2E/Integration test: Discount Approval Workflow
 *
 * Testa o fluxo completo: vendedor solicita > admin aprova/rejeita > notificações.
 *
 * Modos:
 *  1) MOCK (default em CI): simula a sequência de chamadas ao Supabase com mocks
 *     orquestrados, validando a ORDEM e o PAYLOAD de cada operação do hook
 *     `useDiscountApproval`.
 *  2) LIVE (opt-in): se as variáveis de ambiente abaixo estiverem definidas,
 *     o teste executa contra o Supabase real, autenticando dois usuários fixos
 *     criados via painel Auth + a função RPC `seed_discount_test_users`.
 *
 * Para rodar em modo LIVE:
 *   INTEGRATION_TEST_SUPABASE_URL=...
 *   INTEGRATION_TEST_SUPABASE_ANON_KEY=...
 *   INTEGRATION_TEST_SELLER_PASSWORD=...
 *   INTEGRATION_TEST_ADMIN_PASSWORD=...
 *   bunx vitest run tests/integration/discountApprovalFlow.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─────────────────────────────────────────────────────────────
// Mock infra
// ─────────────────────────────────────────────────────────────

const SELLER_ID = "seller-test-uuid";
const ADMIN_ID = "admin-test-uuid";
const QUOTE_ID = "quote-test-uuid";
const REQUEST_ID = "request-test-uuid";

// Track every supabase.from(...) operation for assertions
type Op = {
  table: string;
  method: string;
  payload?: unknown;
  filter?: { col: string; val: unknown };
};
const ops: Op[] = [];

// Build a chainable query builder that records the operation
function makeBuilder(table: string, results: Record<string, unknown> = {}) {
  let currentMethod = "select";
  let currentPayload: unknown = undefined;
  let currentFilter: { col: string; val: unknown } | undefined;

  const record = () => {
    ops.push({ table, method: currentMethod, payload: currentPayload, filter: currentFilter });
  };

  const builder: any = {
    select: vi.fn((_cols?: string) => {
      currentMethod = currentMethod === "select" ? "select" : currentMethod;
      return builder;
    }),
    insert: vi.fn((payload: unknown) => {
      currentMethod = "insert";
      currentPayload = payload;
      record();
      return builder;
    }),
    update: vi.fn((payload: unknown) => {
      currentMethod = "update";
      currentPayload = payload;
      return builder;
    }),
    eq: vi.fn((col: string, val: unknown) => {
      currentFilter = { col, val };
      // record the update / select-with-filter
      if (currentMethod === "update") record();
      return builder;
    }),
    in: vi.fn((_col: string, _vals: unknown[]) => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue({ data: results.single ?? null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: results.maybeSingle ?? null, error: null }),
    then: vi.fn((resolve: (v: { data: unknown; error: null }) => unknown) =>
      resolve({ data: results.list ?? [], error: null })
    ),
  };
  return builder;
}

// Hoisted holder so the vi.mock factory (which is hoisted to top) can read it
const hoisted = vi.hoisted(() => ({
  fromImpl: ((_table: string) => ({})) as (table: string) => unknown,
}));

const mockFrom = vi.fn((table: string) => {
  switch (table) {
    case "discount_approval_requests":
      return makeBuilder(table, {
        single: {
          id: REQUEST_ID,
          quote_id: QUOTE_ID,
          seller_id: SELLER_ID,
          requested_discount_percent: 15,
          max_allowed_percent: 10,
          status: "approved",
        },
      });
    case "user_roles":
      return makeBuilder(table, {
        list: [{ user_id: ADMIN_ID }],
      });
    case "profiles":
      return makeBuilder(table, {
        maybeSingle: { full_name: "Vendedor Teste" },
      });
    case "quotes":
    case "quote_history":
    case "workspace_notifications":
      return makeBuilder(table);
    default:
      return makeBuilder(table);
  }
});

// Wire after definition
hoisted.fromImpl = (table: string) => mockFrom(table);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => hoisted.fromImpl(table) },
}));

vi.mock("@/contexts/AuthContext", () => {
  let currentUser = { id: SELLER_ID, email: "seller-test@discount-approval.test" };
  return {
    useAuth: vi.fn(() => ({ user: currentUser, loading: false, isAdmin: currentUser.id === ADMIN_ID })),
    __setUser: (u: { id: string; email: string }) => { currentUser = u; },
  };
});

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

// Now import after mocks
import { useDiscountApproval } from "@/hooks/useDiscountApproval";
import * as AuthCtx from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function setUser(role: "seller" | "admin") {
  const user = role === "seller"
    ? { id: SELLER_ID, email: "seller-test@discount-approval.test" }
    : { id: ADMIN_ID, email: "admin-test@discount-approval.test" };
  // @ts-expect-error - test helper exposed by mock
  AuthCtx.__setUser(user);
}

beforeEach(() => {
  ops.length = 0;
  vi.clearAllMocks();
  setUser("seller");
});

// ─────────────────────────────────────────────────────────────
// 1. Vendedor solicita aprovação (happy path)
// ─────────────────────────────────────────────────────────────
describe("E2E: Vendedor solicita aprovação de desconto", () => {
  it("cria request, atualiza quote, loga histórico e notifica admins", async () => {
    setUser("seller");
    const { result } = renderHook(() => useDiscountApproval());

    let success = false;
    await act(async () => {
      success = await result.current.requestApproval(QUOTE_ID, 15, 10, "Cliente VIP");
    });

    expect(success).toBe(true);
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Solicitação de aprovação enviada")
    );

    // Operação 1: insert em discount_approval_requests
    const reqInsert = ops.find(o => o.table === "discount_approval_requests" && o.method === "insert");
    expect(reqInsert).toBeDefined();
    expect(reqInsert?.payload).toMatchObject({
      quote_id: QUOTE_ID,
      seller_id: SELLER_ID,
      requested_discount_percent: 15,
      max_allowed_percent: 10,
      seller_notes: "Cliente VIP",
    });

    // Operação 2: update do quote para pending_approval
    const quoteUpdate = ops.find(o => o.table === "quotes" && o.method === "update");
    expect(quoteUpdate?.payload).toEqual({ status: "pending_approval" });
    expect(quoteUpdate?.filter).toEqual({ col: "id", val: QUOTE_ID });

    // Operação 3: insert em quote_history
    const history = ops.find(o => o.table === "quote_history" && o.method === "insert");
    expect(history?.payload).toMatchObject({
      action: "discount_approval_requested",
      field_changed: "discount",
      new_value: "15%",
    });

    // Operação 4: notificações para admins
    const notifs = ops.find(o => o.table === "workspace_notifications" && o.method === "insert");
    expect(notifs).toBeDefined();
    const payload = notifs?.payload as Array<{ user_id: string; category: string }>;
    expect(Array.isArray(payload)).toBe(true);
    expect(payload[0]).toMatchObject({
      user_id: ADMIN_ID,
      category: "discount",
    });
  });

  it("falha graciosamente se não houver usuário autenticado", async () => {
    // @ts-expect-error - test helper
    AuthCtx.__setUser(null);
    vi.spyOn(AuthCtx, "useAuth").mockReturnValueOnce({
      user: null, loading: false, isAdmin: false,
    } as any);

    const { result } = renderHook(() => useDiscountApproval());
    let success = true;
    await act(async () => {
      success = await result.current.requestApproval(QUOTE_ID, 15, 10);
    });
    expect(success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Admin aprova
// ─────────────────────────────────────────────────────────────
describe("E2E: Admin aprova solicitação", () => {
  it("atualiza request, muda quote para 'pending', loga histórico e notifica vendedor", async () => {
    setUser("admin");
    const { result } = renderHook(() => useDiscountApproval());

    let success = false;
    await act(async () => {
      success = await result.current.respondToApproval(REQUEST_ID, true, "Aprovado");
    });

    expect(success).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Desconto aprovado!");

    // Update no request
    const reqUpdate = ops.find(o => o.table === "discount_approval_requests" && o.method === "update");
    expect(reqUpdate?.payload).toMatchObject({
      status: "approved",
      admin_id: ADMIN_ID,
      admin_notes: "Aprovado",
    });
    expect(reqUpdate?.payload).toHaveProperty("responded_at");

    // Quote vai para pending
    const quoteUpdate = ops.find(o => o.table === "quotes" && o.method === "update");
    expect(quoteUpdate?.payload).toEqual({ status: "pending" });

    // Histórico de aprovação
    const history = ops.find(o => o.table === "quote_history" && o.method === "insert");
    expect(history?.payload).toMatchObject({
      action: "discount_approved",
      field_changed: "discount",
    });

    // Notificação ao vendedor
    const notif = ops.find(o => o.table === "workspace_notifications" && o.method === "insert");
    expect(notif?.payload).toMatchObject({
      user_id: SELLER_ID,
      type: "success",
      category: "discount",
    });
    expect((notif?.payload as { title: string }).title).toContain("aprovado");
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Admin rejeita
// ─────────────────────────────────────────────────────────────
describe("E2E: Admin rejeita solicitação", () => {
  beforeEach(() => {
    // Override do builder para retornar status rejeitado no .single()
    mockFrom.mockImplementation((table: string) => {
      if (table === "discount_approval_requests") {
        return makeBuilder(table, {
          single: {
            id: REQUEST_ID,
            quote_id: QUOTE_ID,
            seller_id: SELLER_ID,
            requested_discount_percent: 20,
            max_allowed_percent: 10,
            status: "rejected",
          },
        });
      }
      return makeBuilder(table);
    });
  });

  it("muda quote para 'draft' e notifica vendedor com type=error", async () => {
    setUser("admin");
    const { result } = renderHook(() => useDiscountApproval());

    let success = false;
    await act(async () => {
      success = await result.current.respondToApproval(REQUEST_ID, false, "Margem insuficiente");
    });

    expect(success).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Desconto rejeitado");

    const quoteUpdate = ops.find(o => o.table === "quotes" && o.method === "update");
    expect(quoteUpdate?.payload).toEqual({ status: "draft" });

    const notif = ops.find(o => o.table === "workspace_notifications" && o.method === "insert");
    expect(notif?.payload).toMatchObject({
      user_id: SELLER_ID,
      type: "error",
      category: "discount",
    });
    expect((notif?.payload as { message: string }).message).toContain("Margem insuficiente");
  });
});

// ─────────────────────────────────────────────────────────────
// 4. LIVE mode (opcional, contra Supabase real)
// ─────────────────────────────────────────────────────────────

const LIVE_URL = process.env.INTEGRATION_TEST_SUPABASE_URL;
const LIVE_KEY = process.env.INTEGRATION_TEST_SUPABASE_ANON_KEY;
const SELLER_PWD = process.env.INTEGRATION_TEST_SELLER_PASSWORD;
const ADMIN_PWD = process.env.INTEGRATION_TEST_ADMIN_PASSWORD;

const liveDescribe = LIVE_URL && LIVE_KEY && SELLER_PWD && ADMIN_PWD ? describe : describe.skip;

liveDescribe("E2E LIVE: fluxo real contra Supabase", () => {
  it("seed > seller request > admin approve > notification", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(LIVE_URL!, LIVE_KEY!);

    // 1. Seed
    const sellerLogin = await supa.auth.signInWithPassword({
      email: "seller-test@discount-approval.test",
      password: SELLER_PWD!,
    });
    expect(sellerLogin.error).toBeNull();
    const sellerId = sellerLogin.data.user!.id;

    const seedRes = await supa.rpc("seed_discount_test_users");
    expect((seedRes.data as { ok: boolean }).ok).toBe(true);

    // 2. Cleanup previous test data
    await supa.rpc("cleanup_discount_test_data");

    // 3. Create a quote
    const { data: quote, error: qErr } = await supa
      .from("quotes")
      .insert({
        seller_id: sellerId,
        client_name: "Cliente E2E",
        subtotal: 1000,
        total: 850,
        discount_percent: 15,
        discount_amount: 150,
        status: "draft",
      })
      .select("id")
      .single();
    expect(qErr).toBeNull();
    expect(quote?.id).toBeTruthy();

    // 4. Seller solicita aprovação
    const { error: reqErr } = await supa
      .from("discount_approval_requests")
      .insert({
        quote_id: quote!.id,
        seller_id: sellerId,
        requested_discount_percent: 15,
        max_allowed_percent: 10,
        seller_notes: "Test E2E",
      });
    expect(reqErr).toBeNull();

    // 5. Admin loga e aprova
    await supa.auth.signOut();
    const adminLogin = await supa.auth.signInWithPassword({
      email: "admin-test@discount-approval.test",
      password: ADMIN_PWD!,
    });
    expect(adminLogin.error).toBeNull();
    const adminId = adminLogin.data.user!.id;

    const { data: pending } = await supa
      .from("discount_approval_requests")
      .select("id")
      .eq("quote_id", quote!.id)
      .single();
    expect(pending?.id).toBeTruthy();

    const { error: updErr } = await supa
      .from("discount_approval_requests")
      .update({
        status: "approved",
        admin_id: adminId,
        admin_notes: "OK E2E",
        responded_at: new Date().toISOString(),
      })
      .eq("id", pending!.id);
    expect(updErr).toBeNull();

    // 6. Verifica notificações criadas pelo trigger notify_discount_approval_request
    const { data: notifs } = await supa
      .from("workspace_notifications")
      .select("user_id, type, category")
      .eq("user_id", sellerId)
      .eq("category", "quotes")
      .order("created_at", { ascending: false })
      .limit(1);
    expect(notifs?.length).toBeGreaterThan(0);
    expect(notifs![0].type).toBe("success");

    // 7. Cleanup
    await supa.rpc("cleanup_discount_test_data");
  }, 30_000);
});
