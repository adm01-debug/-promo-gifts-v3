import { test, expect } from "@playwright/test";
import { loginAs } from "../../helpers/auth";

test.describe("Admin Layout Integrity", () => {
  test("Admin Conexoes page has exactly one sidebar and one header", async ({ page }) => {
    await loginAs(page, "dev");
    await page.goto("/admin/conexoes");
    await page.waitForLoadState("networkidle");

    // Sidebars should have role="navigation" or be identifiable by a specific testid if available.
    // SidebarReorganized has id="sidebar-container" or similar? Let's check for the brand header which is unique per sidebar.
    const sidebars = page.locator('aside, [role="navigation"] nav').filter({ hasText: "Promo Gifts" });
    // Or better, search for the logo/brand header container
    const brandHeaders = page.locator('[data-testid="sidebar-brand-header"]');
    
    // Some pages might not have data-testids, so we fallback to a more generic approach if needed
    // But let's assume we can count based on structure.
    
    // Header check
    const headers = page.locator('header').filter({ has: page.locator('button[aria-label="Ativar busca global"]') });
    
    await expect(brandHeaders).toHaveCount(1);
    await expect(headers).toHaveCount(1);
  });

  test("Admin Conexoes Status page has exactly one sidebar and one header", async ({ page }) => {
    await loginAs(page, "dev");
    await page.goto("/admin/conexoes/status");
    await page.waitForLoadState("networkidle");

    const brandHeaders = page.locator('[data-testid="sidebar-brand-header"]');
    const headers = page.locator('header').filter({ has: page.locator('button[aria-label="Ativar busca global"]') });
    
    await expect(brandHeaders).toHaveCount(1);
    await expect(headers).toHaveCount(1);
  });

  test("Admin RBAC Routes page has exactly one sidebar and one header", async ({ page }) => {
    await loginAs(page, "dev");
    await page.goto("/admin/rbac-routes");
    await page.waitForLoadState("networkidle");

    const brandHeaders = page.locator('[data-testid="sidebar-brand-header"]');
    const headers = page.locator('header').filter({ has: page.locator('button[aria-label="Ativar busca global"]') });
    
    await expect(brandHeaders).toHaveCount(1);
    await expect(headers).toHaveCount(1);
  });
});
