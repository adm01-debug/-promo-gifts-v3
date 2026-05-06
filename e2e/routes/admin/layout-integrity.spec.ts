import { test, expect } from "@playwright/test";
import { loginAs } from "../../helpers/auth";

test.describe("Admin Layout Integrity", () => {
  test("Admin Conexoes page has exactly one sidebar and one header", async ({ page }) => {
    await loginAs(page, "dev");
    await page.goto("/admin/conexoes");
    await page.waitForLoadState("networkidle");

    const brandHeaders = page.locator('[data-testid="sidebar-brand-header"]');
    const headers = page.locator('[data-testid="header-mobile-search-trigger"]');
    
    await expect(brandHeaders).toHaveCount(1);
    await expect(headers).toHaveCount(1);
  });

  test("Admin Conexoes Status page has exactly one sidebar and one header", async ({ page }) => {
    await loginAs(page, "dev");
    await page.goto("/admin/conexoes/status");
    await page.waitForLoadState("networkidle");

    const brandHeaders = page.locator('[data-testid="sidebar-brand-header"]');
    const headers = page.locator('[data-testid="header-mobile-search-trigger"]');
    
    await expect(brandHeaders).toHaveCount(1);
    await expect(headers).toHaveCount(1);
  });

  test("Admin RBAC Routes page has exactly one sidebar and one header", async ({ page }) => {
    await loginAs(page, "dev");
    await page.goto("/admin/rbac-routes");
    await page.waitForLoadState("networkidle");

    const brandHeaders = page.locator('[data-testid="sidebar-brand-header"]');
    const headers = page.locator('[data-testid="header-mobile-search-trigger"]');
    
    await expect(brandHeaders).toHaveCount(1);
    await expect(headers).toHaveCount(1);
  });
});
