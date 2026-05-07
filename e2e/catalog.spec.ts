/**
 * E2E: Catalog & Filters - All critical routes
 */
import { test, expect } from "./fixtures/test-base";
import { gotoAndSettle } from "./helpers/nav";
import { expectVisibleByTestId } from "./helpers/waits";
import { loginAs } from "./helpers/auth";

test.describe("Catalog & Filters", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should display product list and filters", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await expectVisibleByTestId(page, "product-grid");
    await expectVisibleByTestId(page, "product-filters");
  });

  test("should handle empty search results", async ({ page }) => {
    await gotoAndSettle(page, "/produtos?q=nonexistentproduct12345");
    // We expect some indicator of empty state
    const emptyState = page.locator('[data-testid="empty-catalog-state"], :text("Nenhum produto encontrado")');
    await expect(emptyState.first()).toBeVisible();
  });

  test("should navigate to product detail", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();
    await expect(page).toHaveURL(/\/produto\/.+/);
    await expectVisibleByTestId(page, "product-detail-container");
  });
});
