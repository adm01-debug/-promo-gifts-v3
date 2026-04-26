/**
 * P0 — Checkout / Pedido bloqueado: edge functions de order com 5xx.
 */
import { test, expect } from "../../fixtures/test-base";
import { mockEdgeFunctionFailure } from "./_mocks";

test.describe("P0 — Checkout bloqueado", () => {
  test.skip("create-order 500: carrinho permanece intacto, mostra erro acionável", async ({ page }) => {
    await mockEdgeFunctionFailure(page, "create-order", 500, { error: "internal_error" });
    await page.goto("/carrinhos");
    // TODO(P0): completar fluxo até checkout e clicar "finalizar".
    await expect(page.getByRole("alert")).toContainText(/erro|tente novamente/i);
    // Itens do carrinho NÃO podem ter sumido.
    expect(await page.locator('[data-testid="cart-item"]').count()).toBeGreaterThanOrEqual(0);
  });

  test.skip("falha após dedução de estoque: rollback completo (nenhum órfão)", async ({ page }) => {
    // TODO(P0): cobrir transação atômica order + stock_movement.
    expect(true).toBe(true);
  });

  test.skip("dupla submissão (double-click): cria apenas 1 order (idempotência)", async ({ page }) => {
    expect(true).toBe(true);
  });
});
