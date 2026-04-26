/**
 * Fluxo: Orçamentos — listar, abrir criação, validar form.
 * NÃO submete (evita poluir BD); valida apenas a navegação e UI.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";

test.describe("Fluxo: Orçamentos", () => {
  test.beforeEach(() => requireAuth());

  test("lista orçamentos carrega", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos");
    await expect(page).toHaveURL(/orcamentos/);
    // header esperado
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("acessa kanban", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos/kanban");
    await expect(page).toHaveURL(/kanban/);
  });

  test("acessa dashboard de orçamentos", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos/dashboard");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("abre criador de orçamento", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos/novo");
    await expect(page).toHaveURL(/orcamentos\/novo/);
    // Stepper ou inputs do builder devem aparecer
    await expect(
      page.locator('input, [role="tablist"], [data-testid*="step"]').first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
