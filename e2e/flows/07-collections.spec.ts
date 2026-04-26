/**
 * Fluxo: Coleções — lista, abre criação.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";

test.describe("Fluxo: Coleções", () => {
  test.beforeEach(() => requireAuth());

  test("lista de coleções carrega", async ({ page }) => {
    await gotoAndSettle(page, "/colecoes");
    await expect(page).toHaveURL(/colecoes/);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });
});
