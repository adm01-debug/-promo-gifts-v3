import { test, expect } from "@playwright/test";
import { gotoAndSettle } from "../helpers/nav";
import { loginViaUI } from "../helpers/auth";
import { waitForTestIdVisible } from "../helpers/waits";

test.describe("Tooltip Delay Validation", () => {
  test("tooltip does not appear immediately and appears after long delay", async ({ page }) => {
    await gotoAndSettle(page, "/login");
    
    // Check if we are on the login page or need to be logged in to see most tooltips
    // Let's use the password toggle as a test case if it has a tooltip
    const passwordToggle = page.locator('[data-testid="login-password-toggle"]');
    
    if (await passwordToggle.count() > 0) {
      await passwordToggle.hover();
      
      // Should NOT be visible after 500ms (previous default)
      await page.waitForTimeout(500);
      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).not.toBeVisible();
      
      // Should be visible after 1600ms (1500ms + buffer)
      await page.waitForTimeout(1100);
      await expect(tooltip).toBeVisible();
    }
  });

  test("tooltip does not appear on quick hover", async ({ page }) => {
    await gotoAndSettle(page, "/login");
    const passwordToggle = page.locator('[data-testid="login-password-toggle"]');
    
    if (await passwordToggle.count() > 0) {
      await passwordToggle.hover();
      await page.waitForTimeout(300);
      await page.mouse.move(0, 0); // Move away quickly
      
      await page.waitForTimeout(2000); // Wait enough time for a delayed trigger
      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).not.toBeVisible();
    }
  });
});
