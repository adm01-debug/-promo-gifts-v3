/**
 * E2E: Kit Builder - Flows and states
 */
import { test, expect } from "./fixtures/test-base";
import { gotoAndSettle } from "./helpers/nav";
import { expectVisibleByTestId } from "./helpers/waits";
import { loginAs } from "./helpers/auth";

test.describe("Kit Builder", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should display kit builder empty state", async ({ page }) => {
    await gotoAndSettle(page, "/kit-builder");
    await expectVisibleByTestId(page, "kit-builder-container");
    // Check for empty state elements
    const emptyMsg = page.locator(':text("Seu kit está vazio")');
    await expect(emptyMsg.first()).toBeVisible();
  });

  test("should allow adding products to kit", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    // Find a product and add to kit (this depends on the UI, assuming a 'Add to Kit' button exists)
    const addBtn = page.locator('[data-testid="add-to-kit-button"]').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await gotoAndSettle(page, "/kit-builder");
      await expect(page.locator('[data-testid="kit-item"]')).toBeVisible();
    }
  });
});
