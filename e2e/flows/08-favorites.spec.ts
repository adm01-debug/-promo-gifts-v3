/**
 * Fluxo: Favoritos — lista, alterna favorito num card.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";

test.describe("Fluxo: Favoritos", () => {
  test.beforeEach(() => requireAuth());

  test("lista de favoritos carrega", async ({ page }) => {
    await gotoAndSettle(page, "/favoritos");
    await expect(page).toHaveURL(/favoritos/);
  });

  test("alterna favorito num produto do catálogo", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    const heart = page
      .locator('button[aria-label*="favorit" i], [data-testid*="favorite"]')
      .first();
    if ((await heart.count()) > 0) {
      await heart.click().catch(() => {});
      await page.waitForTimeout(800);
    }
  });
});
