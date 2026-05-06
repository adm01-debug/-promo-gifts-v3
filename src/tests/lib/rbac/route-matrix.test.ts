import { describe, it, expect } from 'vitest';
import { RBAC_ROUTES, summarizeRoutes } from '@/lib/rbac/route-matrix';

describe('RBAC Route Matrix Integrity', () => {
  it('should have all routes with mfaAal2 disabled as per recent changes', () => {
    // We recently mapped over the routes to force mfaAal2: false
    RBAC_ROUTES.forEach(route => {
      expect(route.mfaAal2).toBe(false);
    });
  });

  it('should have Admin Conexões routes in the matrix', () => {
    const conexoesRoute = RBAC_ROUTES.find(r => r.path === '/admin/conexoes');
    const conexoesStatusRoute = RBAC_ROUTES.find(r => r.path === '/admin/conexoes/status');

    expect(conexoesRoute).toBeDefined();
    expect(conexoesRoute?.role).toBe('dev');
    
    expect(conexoesStatusRoute).toBeDefined();
    expect(conexoesStatusRoute?.role).toBe('dev');
  });

  it('should summarize routes correctly with mfa count as zero', () => {
    const summary = summarizeRoutes(RBAC_ROUTES);
    expect(summary.mfa).toBe(0);
    expect(summary.total).toBeGreaterThan(0);
  });

  it('should maintain role hierarchy consistency', () => {
    const adminRoutes = RBAC_ROUTES.filter(r => r.role === 'admin');
    const devRoutes = RBAC_ROUTES.filter(r => r.role === 'dev');
    
    expect(adminRoutes.length).toBeGreaterThan(0);
    expect(devRoutes.length).toBeGreaterThan(0);
  });
});
