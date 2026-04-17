/**
 * E2E: Discount Approval Workflow — Smoke
 * Verifica que a aba de aprovações dentro de Usuários é protegida.
 */
import { test, expect } from '@playwright/test';

test.describe('Discount Approval', () => {
  test('admin discount tab requires auth', async ({ page }) => {
    await page.goto('/admin/usuarios?tab=discounts');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('legacy /admin/aprovacoes-desconto redirects and requires auth', async ({ page }) => {
    await page.goto('/admin/aprovacoes-desconto');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
});
