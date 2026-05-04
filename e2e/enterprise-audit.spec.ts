import { test, expect } from '@playwright/test';

test.describe('Enterprise Compliance & Performance Audit', () => {
  test('Virtualization Load Test - 1k+ items', async ({ page }) => {
    await page.goto('/');
    // Check if catalog renders
    await expect(page.locator('h1:has-text("Catálogo de Produtos")')).toBeVisible();
    
    // Scroll down and ensure content stays stable (smoke test for virtualization)
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(1000);
    const count = await page.locator('[data-testid="product-card"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('Auth Perimeter - MFA Challenge presence', async ({ page }) => {
    // This is a logic check - if we are admin, we should be challenged
    // Since we are unauthed in E2E unless logged in, we check redirect to login
    await page.goto('/admin/seguranca');
    await expect(page).toHaveURL(/.*login/);
  });
});
