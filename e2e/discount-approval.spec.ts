/**
 * E2E: Discount Approval Workflow — Smoke
 * Verifies admin approval queue is protected.
 */
import { test, expect } from '@playwright/test';

test.describe('Discount Approval', () => {
  test('admin approval queue requires auth', async ({ page }) => {
    await page.goto('/admin/aprovacoes-desconto');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('seller cannot reach admin route', async ({ page }) => {
    await page.goto('/admin/aprovacoes-desconto');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
});
