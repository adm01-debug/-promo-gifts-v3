import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import AdminConexoesPage from '@/pages/admin/AdminConexoesPage';
import AdminConexoesStatusPage from '@/pages/admin/AdminConexoesStatusPage';
import AdminRbacRoutesPage from '@/pages/admin/AdminRbacRoutesPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';

// Mock everything that uses Supabase/Network
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockReturnThis(),
    }),
  },
}));

vi.mock('@/hooks/useSecretsManager', () => ({
  useSecretsManager: () => ({ secrets: [], isLoading: false, list: vi.fn(), refreshCache: vi.fn() }),
}));

// We use the REAL SidebarBrandHeader which now has the data-testid
vi.mock('@/components/layout/SidebarReorganized', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
  };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderAdminRoute = (path: string, Element: React.ComponentType) => {
  return render(
    <HelmetProvider>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[path]}>
            <ThemeProvider>
              <AuthProvider>
                <Routes>
                  <Route element={<MainLayout><React.Suspense fallback={null}><Element /></React.Suspense></MainLayout>}>
                    <Route path={path} element={<Element />} />
                  </Route>
                </Routes>
              </AuthProvider>
            </ThemeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </TooltipProvider>
    </HelmetProvider>
  );
};

describe('Layout Duplication (RTL)', () => {
  it('AdminConexoesPage renders exactly ONE sidebar brand header', async () => {
    renderAdminRoute('/admin/conexoes', AdminConexoesPage);
    // Wait for lazy components
    const brandHeaders = await screen.findAllByTestId('sidebar-brand-header');
    expect(brandHeaders.length).toBe(1);
  });

  it('AdminConexoesStatusPage renders exactly ONE sidebar brand header', async () => {
    renderAdminRoute('/admin/conexoes/status', AdminConexoesStatusPage);
    const brandHeaders = await screen.findAllByTestId('sidebar-brand-header');
    expect(brandHeaders.length).toBe(1);
  });

  it('AdminRbacRoutesPage renders exactly ONE sidebar brand header', async () => {
    renderAdminRoute('/admin/rbac-routes', AdminRbacRoutesPage);
    const brandHeaders = await screen.findAllByTestId('sidebar-brand-header');
    expect(brandHeaders.length).toBe(1);
  });
});
