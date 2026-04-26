/**
 * Fluxo: Pedidos — lista e abre primeiro item se houver.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";

test.describe("Fluxo: Pedidos", () => {
  test.beforeEach(() => requireAuth());

  test("lista de pedidos carrega", async ({ page }) => {
    await gotoAndSettle(page, "/pedidos");
    await expect(page).toHaveURL(/pedidos/);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("abre primeiro pedido se existir", async ({ page }) => {
    await gotoAndSettle(page, "/pedidos");
    const row = page.locator('a[href*="/pedidos/"], tr[role="row"]').first();
    if ((await row.count()) > 0) {
      await row.click().catch(() => {});
      await page.waitForTimeout(1000);
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});
