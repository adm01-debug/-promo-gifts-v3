import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import AdminConexoesPage from '../pages/admin/AdminConexoesPage';
import AdminConexoesStatusPage from '../pages/admin/AdminConexoesStatusPage';
import AdminRbacRoutesPage from '../pages/admin/AdminRbacRoutesPage';
import { MainLayout } from '../components/layout/MainLayout';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '../components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import { AriaLiveProvider } from '../components/a11y/AriaLive';
import React from 'react';

// Mock robusto do Supabase - definido DENTRO do vi.mock para evitar erro de hoisting
vi.mock('../integrations/supabase/client', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockImplementation((resolve) => resolve({ data: null, error: null })),
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn().mockReturnValue(mockQuery),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn().mockResolvedValue(null),
    },
  };
});

vi.mock('../hooks/useSecretsManager', () => ({
  useSecretsManager: () => ({ secrets: [], isLoading: false, list: vi.fn(), refreshCache: vi.fn() }),
}));

vi.mock('../components/effects/PageTransition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <div data-testid="page-transition">{children}</div>,
}));

vi.mock('../components/layout/Header', () => ({
  Header: () => <header data-testid="header"><button data-testid="header-mobile-search-trigger">Search</button></header>
}));

vi.mock('../components/layout/SidebarReorganized', () => ({
  SidebarReorganized: () => <aside data-testid="sidebar"><div data-testid="sidebar-brand-header">Brand</div></aside>
}));

vi.mock('../components/admin/connections/ConnectionsPulseBar', () => ({
  ConnectionsPulseBar: () => <div data-testid="pulse-bar" />
}));

vi.mock('../components/admin/connections/SecretsManagerHealthPanel', () => ({
  SecretsManagerHealthPanel: () => <div data-testid="health-panel" />
}));

vi.mock('../components/admin/connections/ExternalConnectionsSyncLogPanel', () => ({
  ExternalConnectionsSyncLogPanel: () => <div data-testid="sync-log" />
}));

vi.mock('../components/admin/connections/ConnectionsOverviewTable', () => ({
  ConnectionsOverviewTable: () => <div data-testid="overview-table" />
}));

vi.mock('../components/admin/connections/RotationHistoryRow', () => ({
  RotationHistoryRow: () => <div data-testid="rotation-history-row" />
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderAdminRoute = async (path: string, Element: React.ComponentType) => {
  let result: any;
  await act(async () => {
    result = render(
      <HelmetProvider>
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[path]}>
              <ThemeProvider>
                <AuthProvider>
                  <AriaLiveProvider>
                    <Routes>
                      <Route element={<MainLayout><React.Suspense fallback={<div data-testid="loading">Loading...</div>}><Element /></React.Suspense></MainLayout>}>
                        <Route path={path} element={<Element />} />
                      </Route>
                    </Routes>
                  </AriaLiveProvider>
                </AuthProvider>
              </ThemeProvider>
            </MemoryRouter>
          </QueryClientProvider>
        </TooltipProvider>
      </HelmetProvider>
    );
  });
  return result;
};

describe('Layout Duplication (RTL)', () => {
  it('AdminConexoesPage renders exactly ONE sidebar brand header', async () => {
    await renderAdminRoute('/admin/conexoes', AdminConexoesPage);
    const brandHeaders = screen.queryAllByTestId('sidebar-brand-header');
    expect(brandHeaders.length).toBe(1);
    const headers = screen.queryAllByTestId('header-mobile-search-trigger');
    expect(headers.length).toBe(1);
  });

  it('AdminConexoesStatusPage renders exactly ONE sidebar brand header', async () => {
    await renderAdminRoute('/admin/conexoes/status', AdminConexoesStatusPage);
    const brandHeaders = screen.queryAllByTestId('sidebar-brand-header');
    expect(brandHeaders.length).toBe(1);
  });

  it('AdminRbacRoutesPage renders exactly ONE sidebar brand header', async () => {
    await renderAdminRoute('/admin/rbac-routes', AdminRbacRoutesPage);
    const brandHeaders = screen.queryAllByTestId('sidebar-brand-header');
    expect(brandHeaders.length).toBe(1);
  });
});
