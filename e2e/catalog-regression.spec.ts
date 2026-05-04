import { test, expect } from '@playwright/test';

test.describe('Catalog Page Regression', () => {
  test('should load catalog page without module failure', async ({ page }) => {
    // Navigate to root
    await page.goto('/');
    
    // Check if we are redirected to login or see the catalog
    const isLoginPage = await page.url().includes('/login');
    
    if (isLoginPage) {
      console.log('Redirected to login, checking for basic rendering');
      await expect(page.locator('form')).toBeVisible();
    } else {
      console.log('On catalog page, checking for module failure indicators');
      // Ensure EnhancedErrorBoundary fallback is NOT visible
      const errorTitle = page.locator('h1:has-text("Falha no Módulo")');
      await expect(errorTitle).not.toBeVisible();
      
      // Ensure catalog header is visible
      await expect(page.locator('h1:has-text("Catálogo de Produtos")')).toBeVisible();
    }
  });

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (exception) => {
      errors.push(exception.message);
    });

    await page.goto('/');
    
    // Allow some time for hydration
    await page.waitForTimeout(2000);
    
    expect(errors).toEqual([]);
  });
});
