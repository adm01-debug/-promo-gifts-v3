import { describe, it, expect } from 'vitest';
import { RBAC_ROUTES } from './route-matrix';

describe('RBAC_ROUTES', () => {
  it('should have mfaAal2 set to true for admin and dev routes', () => {
    const sensitiveRoutes = RBAC_ROUTES.filter(r => ['admin', 'dev'].includes(r.role));
    sensitiveRoutes.forEach(route => {
      expect(route.mfaAal2, `Route ${route.path} should require MFA`).toBe(true);
    });
  });

  it('should have mfaAal2 set to false for public and authenticated routes', () => {
    const standardRoutes = RBAC_ROUTES.filter(r => ['public', 'authenticated'].includes(r.role));
    standardRoutes.forEach(route => {
      expect(route.mfaAal2, `Route ${route.path} should NOT require MFA`).toBe(false);
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
        expect(['admin', 'dev'].includes(route.role)).toBe(true);
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
