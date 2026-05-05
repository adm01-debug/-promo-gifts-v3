import { test, expect } from "./fixtures/test-base";
import { gotoAndSettle } from "./helpers/nav";
import { loginAs } from "./helpers/auth";

test.describe("Tooltip Delay Validation", () => {
  test("tooltip does not appear immediately and appears after long delay on Header", async ({ page }) => {
    // We need to be logged in to see the Header with tooltips
    await loginAs(page, "admin");
    await gotoAndSettle(page, "/");
    
    // The Heart icon in Header usually has a tooltip "Favoritos Alt+F"
    const favoriteBtn = page.locator('button[aria-label="Favoritar"]');
    await expect(favoriteBtn).toBeVisible();
    
    await favoriteBtn.hover();
    
    // Should NOT be visible after 500ms
    await page.waitForTimeout(500);
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).not.toBeVisible();
    
    // Should be visible after 1600ms (1500ms delay + buffer)
    await page.waitForTimeout(1100);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Favoritos");
  });

  test("tooltip does not appear on quick hover on Header", async ({ page }) => {
    await loginAs(page, "admin");
    await gotoAndSettle(page, "/");
    
    const favoriteBtn = page.locator('button[aria-label="Favoritar"]');
    await expect(favoriteBtn).toBeVisible();
    
    await favoriteBtn.hover();
    await page.waitForTimeout(300);
    await page.mouse.move(0, 0); // Move away quickly
    
    await page.waitForTimeout(2000); // Wait enough time to ensure it didn't trigger
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).not.toBeVisible();
  });
});
