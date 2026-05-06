/**
 * E2E: Role-Based Access Control (RBAC) Validation
 * Validates route protection and UI visibility based on user roles (admin, manager, seller).
 */
import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers/auth';
import { Sel } from './fixtures/selectors';
import { gotoAndSettle } from './helpers/nav';

test.describe('RBAC: Role-Based Access Control', () => {
  
  test.afterEach(async ({ page }) => {
    // Ensure clean state after each role test
    await logout(page);
  });

  test.describe('Seller Access (Restricted)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'user'); // 'user' maps to 'vendedor' in helpers/auth
    });

    test('should NOT access admin pages and show security empty state', async ({ page }) => {
      const adminRoutes = [
        '/admin/usuarios',
        '/admin/cadastros',
        '/admin/seguranca',
        '/admin/ia-uso',
        '/admin/aprovacoes-desconto'
      ];

      for (const route of adminRoutes) {
        await gotoAndSettle(page, route);
        
        // Should show the security empty state from AdminRoute.tsx
        // The component uses <EmptyState variant="security" title="Área Administrativa" ... />
        const securityTitle = page.locator('text=Área Administrativa');
        await expect(securityTitle).toBeVisible({ timeout: 10000 });
        
        const securityDesc = page.locator('text=Acesso restrito a gestores e administradores');
        await expect(securityDesc).toBeVisible();
        
        // Verify it doesn't leak sensitive content
        const table = page.locator('table');
        await expect(table).not.toBeVisible();
      }
    });

    test('should access allowed seller routes', async ({ page }) => {
      const sellerRoutes = [
        '/produtos',
        '/orcamentos',
        '/favoritos',
        '/carrinhos'
      ];

      for (const route of sellerRoutes) {
        await gotoAndSettle(page, route);
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
        await expect(page.locator('text=Área Administrativa')).not.toBeVisible();
      }
    });
  });

  test.describe('Admin Access (Full)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('should access admin users management page', async ({ page }) => {
      await gotoAndSettle(page, '/admin/usuarios');
      
      // Should NOT show security block
      await expect(page.locator('text=Área Administrativa')).not.toBeVisible();
      
      // Should show the users list or page title
      // We look for common admin page indicators
      const adminHeader = page.locator('h1, h2').filter({ hasText: /Usuários|Administração/i });
      await expect(adminHeader.first()).toBeVisible({ timeout: 15000 });
    });

    test('should access discount approvals page', async ({ page }) => {
      await gotoAndSettle(page, '/admin/aprovacoes-desconto');
      await expect(page.locator('text=Área Administrativa')).not.toBeVisible();
      
      const approvalHeader = page.locator('h1, h2').filter({ hasText: /Aprovações/i });
      await expect(approvalHeader.first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Direct URL Access Attempts (Unauthenticated)', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await logout(page); // Ensure logged out
      
      const routes = ['/admin/usuarios', '/orcamentos', '/perfil'];
      
      for (const route of routes) {
        await page.goto(route);
        // Should eventually land on /login
        await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
      }
    });
  });
});
