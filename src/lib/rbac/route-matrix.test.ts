import { describe, it, expect } from 'vitest';
import { RBAC_ROUTES } from './route-matrix';

describe('RBAC_ROUTES', () => {
  it('should have mfaAal2 set to false for all routes as per current implementation', () => {
    // The current implementation ends with .map(r => ({ ...r, mfaAal2: false }))
    // This test ensures that this override is correctly applied or documented.
    RBAC_ROUTES.forEach(route => {
      expect(route.mfaAal2).toBe(false);
    });
  });

  it('should contain essential routes', () => {
    const paths = RBAC_ROUTES.map(r => r.path);
    expect(paths).toContain('/login');
    expect(paths).toContain('/admin/rbac-rotas');
  });

  it('should have consistent roles and guards', () => {
    RBAC_ROUTES.forEach(route => {
      if (route.role === 'public') {
        expect(route.guard).toBe('public');
      }
      if (route.guard === 'AdminRoute') {
        expect(route.role).toBe('admin');
      }
      if (route.guard === 'DevRoute') {
        expect(route.role).toBe('dev');
      }
    });
  });

  it('should categorize routes correctly', () => {
    const publicRoutes = RBAC_ROUTES.filter(r => r.category === 'public');
    expect(publicRoutes.length).toBeGreaterThan(0);
    publicRoutes.forEach(r => {
      expect(r.role).toBe('public');
    });
  });
});
