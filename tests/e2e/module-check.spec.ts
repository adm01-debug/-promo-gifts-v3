import { test, expect } from '@playwright/test';

test.describe('Module Error Check', () => {
  test('should navigate to / and /admin/seguranca without module errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Failed to load module')) {
        errors.push(msg.text());
      }
    });

    // Check Home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors, `Errors on /: ${errors.join(', ')}`).toHaveLength(0);

    // Check Admin Security
    await page.goto('/admin/seguranca');
    await page.waitForLoadState('networkidle');
    expect(errors, `Errors on /admin/seguranca: ${errors.join(', ')}`).toHaveLength(0);
  });
});
