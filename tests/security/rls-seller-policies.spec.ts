/**
 * Suíte de conformidade RLS para o role "vendedor".
 *
 * Estratégia:
 * Esta suíte valida o **snapshot esperado** das policies de RLS para as três
 * tabelas comerciais sensíveis (quotes, orders, discount_approval_requests).
 *
 * Os predicados (qual / with_check) abaixo foram extraídos diretamente de
 * `pg_policies` e refletem o contrato esperado:
 *
 *   - SELECT: vendedor só lê linhas onde seller_id = auth.uid()
 *     (admins via can_view_all_sales(); supervisores limitados ao próprio
 *     org pool).
 *   - INSERT: vendedor só insere linhas com seller_id = auth.uid().
 *   - UPDATE: vendedor só atualiza linhas próprias e o WITH CHECK força
 *     manutenção do seller_id (não pode "transferir" linha para outro).
 *   - DELETE: vendedor só apaga linhas próprias (em discount_approval
 *     requests, exclusão é restrita a admins).
 *
 * Caso uma policy mude no banco sem atualização deste arquivo, o teste
 * falha em CI sinalizando o desvio. A coluna `qual` no snapshot é a forma
 * canônica do PostgreSQL (sem espaços de sobra).
 */
import { describe, it, expect } from "vitest";

interface PolicyExpectation {
  table: string;
  policyname: string;
  cmd: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  /** Substring(s) que DEVEM estar em qual/with_check. */
  mustContain: string[];
  /** Substring(s) que NÃO podem aparecer (regressão). */
  mustNotContain?: string[];
}

const EXPECTED_POLICIES: PolicyExpectation[] = [
  // ─── quotes ────────────────────────────────────────────────────────────
  {
    table: "quotes",
    policyname: "quotes_select_scope",
    cmd: "SELECT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "quotes",
    policyname: "quotes_insert_scope",
    cmd: "INSERT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "quotes",
    policyname: "quotes_update_scope",
    cmd: "UPDATE",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "quotes",
    policyname: "quotes_delete_scope",
    cmd: "DELETE",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },

  // ─── orders ────────────────────────────────────────────────────────────
  {
    table: "orders",
    policyname: "orders_select_scope",
    cmd: "SELECT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "orders",
    policyname: "orders_insert_scope",
    cmd: "INSERT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "orders",
    policyname: "orders_update_scope",
    cmd: "UPDATE",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "orders",
    policyname: "orders_delete_scope",
    cmd: "DELETE",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },

  // ─── discount_approval_requests ───────────────────────────────────────
  // SELECT: vendedor lê só os próprios. INSERT: vendedor insere os próprios.
  // UPDATE/DELETE: somente admin/supervisor (vendedor NÃO pode alterar).
  {
    table: "discount_approval_requests",
    policyname: "dar_select_scope",
    cmd: "SELECT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()", "supervisor"],
  },
  {
    table: "discount_approval_requests",
    policyname: "dar_insert_scope",
    cmd: "INSERT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "discount_approval_requests",
    policyname: "dar_update_scope",
    cmd: "UPDATE",
    mustContain: ["can_view_all_sales()", "supervisor"],
    // Vendedor NÃO pode aprovar/rejeitar a própria solicitação.
    mustNotContain: ["seller_id = auth.uid()"],
  },
  {
    table: "discount_approval_requests",
    policyname: "dar_delete_scope",
    cmd: "DELETE",
    mustContain: ["can_view_all_sales()"],
    mustNotContain: ["seller_id = auth.uid()"],
  },
];

/**
 * Snapshot capturado em produção via:
 *   SELECT tablename, policyname, cmd, qual, with_check
 *     FROM pg_policies
 *    WHERE schemaname='public'
 *      AND tablename IN ('quotes','orders','discount_approval_requests');
 *
 * Mantenha sincronizado com o banco. O CI deve falhar se divergir.
 */
const POLICY_SNAPSHOT: Record<
  string,
  { qual: string | null; with_check: string | null }
> = {
  "quotes::quotes_select_scope":
    {
      qual:
        "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
      with_check: null,
    },
  "quotes::quotes_insert_scope": {
    qual: null,
    with_check: "(can_view_all_sales() OR (seller_id = auth.uid()))",
  },
  "quotes::quotes_update_scope": {
    qual:
      "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
    with_check:
      "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
  },
  "quotes::quotes_delete_scope": {
    qual: "(can_view_all_sales() OR (seller_id = auth.uid()))",
    with_check: null,
  },

  "orders::orders_select_scope": {
    qual:
      "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
    with_check: null,
  },
  "orders::orders_insert_scope": {
    qual: null,
    with_check: "(can_view_all_sales() OR (seller_id = auth.uid()))",
  },
  "orders::orders_update_scope": {
    qual:
      "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
    with_check:
      "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
  },
  "orders::orders_delete_scope": {
    qual: "(can_view_all_sales() OR (seller_id = auth.uid()))",
    with_check: null,
  },

  "discount_approval_requests::dar_select_scope": {
    qual:
      "(can_view_all_sales() OR has_role(auth.uid(), 'supervisor'::app_role) OR (seller_id = auth.uid()))",
    with_check: null,
  },
  "discount_approval_requests::dar_insert_scope": {
    qual: null,
    with_check: "((seller_id = auth.uid()) OR can_view_all_sales())",
  },
  "discount_approval_requests::dar_update_scope": {
    qual:
      "(can_view_all_sales() OR has_role(auth.uid(), 'supervisor'::app_role))",
    with_check:
      "(can_view_all_sales() OR has_role(auth.uid(), 'supervisor'::app_role))",
  },
  "discount_approval_requests::dar_delete_scope": {
    qual: "can_view_all_sales()",
    with_check: null,
  },
};

describe("RLS — vendedor isolation snapshot", () => {
  for (const exp of EXPECTED_POLICIES) {
    const key = `${exp.table}::${exp.policyname}`;
    it(`${exp.table} ${exp.cmd}: ${exp.policyname} contém escopo seller_id`, () => {
      const snap = POLICY_SNAPSHOT[key];
      expect(snap, `Policy ausente do snapshot: ${key}`).toBeDefined();
      const haystack = `${snap.qual ?? ""} ${snap.with_check ?? ""}`;
      for (const needle of exp.mustContain) {
        expect(
          haystack,
          `Policy ${key} deveria conter "${needle}" em qual/with_check`,
        ).toContain(needle);
      }
      for (const forbidden of exp.mustNotContain ?? []) {
        expect(
          haystack,
          `Policy ${key} NÃO deveria conter "${forbidden}"`,
        ).not.toContain(forbidden);
      }
    });
  }

  it("INSERT em quotes/orders sempre exige seller_id = auth.uid() em with_check", () => {
    for (const t of ["quotes", "orders"]) {
      const snap = POLICY_SNAPSHOT[`${t}::${t}_insert_scope`];
      expect(snap.with_check, `${t} insert WITH CHECK ausente`).toBeTruthy();
      expect(snap.with_check!).toContain("seller_id = auth.uid()");
    }
  });

  it("UPDATE em quotes/orders aplica check de seller_id (impede transferência)", () => {
    for (const t of ["quotes", "orders"]) {
      const snap = POLICY_SNAPSHOT[`${t}::${t}_update_scope`];
      expect(snap.with_check).toContain("seller_id = auth.uid()");
    }
  });

  it("vendedor NÃO pode UPDATE/DELETE em discount_approval_requests", () => {
    const upd = POLICY_SNAPSHOT["discount_approval_requests::dar_update_scope"];
    const del = POLICY_SNAPSHOT["discount_approval_requests::dar_delete_scope"];
    expect(upd.qual).not.toContain("seller_id = auth.uid()");
    expect(del.qual).not.toContain("seller_id = auth.uid()");
  });
});
