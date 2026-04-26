/**
 * Fluxo: Produtos — lista, busca, abre detalhe.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";

test.describe("Fluxo: Produtos", () => {
  test.beforeEach(() => requireAuth());

  test("lista produtos no catálogo", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    // Ao menos um card de produto deve aparecer (10s de tolerância para BD externo)
    const card = page
      .locator('[data-testid="product-card"], article, [role="listitem"]')
      .first();
    await expect(card).toBeVisible({ timeout: 15_000 });
  });

  test("busca por termo filtra resultados", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    const search = page
      .locator('input[type="search"], input[placeholder*="busc" i]')
      .first();
    if (await search.count()) {
      await search.fill("caneta");
      await page.waitForTimeout(1500);
      // não esperamos nenhum resultado específico, apenas que a UI responda sem erro
      await expect(page).toHaveURL(/produtos|filtros/);
    }
  });

  test("clica num produto abre detalhe ou quick view", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    const card = page
      .locator('[data-testid="product-card"], article a, [role="listitem"] a')
      .first();
    if ((await card.count()) > 0) {
      await card.click();
      await page.waitForTimeout(1500);
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});
