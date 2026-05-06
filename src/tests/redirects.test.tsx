import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, useLocation, Outlet } from 'react-router-dom';
import { AppContent } from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { AppProviders } from '../components/providers/AppProviders';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Suspense } from 'react';

// Mocking dependencies to prevent errors during rendering
vi.mock('@/integrations/supabase/client', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: '123' } } }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: '123' } }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '123', role: 'admin' }, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: { id: '123', role: 'admin' }, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        match: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '123', role: 'admin' }, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  };
  return { supabase: mockSupabase };
});

// Mock all layout routes to just render Outlet
vi.mock('@/components/layout/ProtectedRoute', () => ({ ProtectedRoute: () => <Outlet /> }));
vi.mock('@/components/layout/AdminRoute', () => ({ AdminRoute: () => <Outlet /> }));
vi.mock('@/components/layout/DevRoute', () => ({ DevRoute: () => <Outlet /> }));
vi.mock('@/components/layout/DeprecatedRoute', () => ({ DeprecatedRoute: () => <Outlet /> }));
vi.mock('@/components/errors/RouteErrorBoundary', () => ({
  RouteErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children || <Outlet />}</>,
}));

// Mock useAppBootstrap
vi.mock('@/hooks/useAppBootstrap', () => ({ useAppBootstrap: vi.fn() }));

// Mock all potential pages to avoid missing providers/dependencies
// Using a proxy or a broad mock if possible, but manual for core ones
vi.mock('../pages/Index', () => ({ default: () => <div data-testid="page-index">Index</div> }));
vi.mock('../pages/MockupGenerator', () => ({ default: () => <div data-testid="page-mockup">Mockup</div> }));
vi.mock('../pages/SimuladorWizard', () => ({ default: () => <div data-testid="page-simulador">Simulador</div> }));
vi.mock('../pages/KitBuilderPage', () => ({ default: () => <div data-testid="page-kit-builder">Kit Builder</div> }));
vi.mock('../pages/KitLibraryPage', () => ({ default: () => <div data-testid="page-kit-library">Kit Library</div> }));
vi.mock('../pages/AdvancedPriceSearchPage', () => ({ default: () => <div data-testid="page-price-search">Price Search</div> }));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('Navigation Redirects', () => {
  const testRedirect = async (fromPath: string, expectedToPath: string) => {
    render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppProviders>
              <MemoryRouter initialEntries={[fromPath]}>
                <Suspense fallback={<div data-testid="loading">Loading...</div>}>
                  <AppContent />
                  <LocationDisplay />
                </Suspense>
              </MemoryRouter>
            </AppProviders>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    );

    await waitFor(() => {
      const display = screen.getByTestId('location-display');
      expect(display.textContent).toBe(expectedToPath);
    }, { timeout: 5000 });
  };

  it('redirects from /mockup-generator to /ferramentas/mockup-generator', async () => {
    await testRedirect('/mockup-generator', '/ferramentas/mockup-generator');
  });

  it('redirects from /simulador to /ferramentas/simulador-wizard', async () => {
    await testRedirect('/simulador', '/ferramentas/simulador-wizard');
  });

  it('redirects from /montar-kit to /ferramentas/kit-builder', async () => {
    await testRedirect('/montar-kit', '/ferramentas/kit-builder');
  });

  it('redirects from /meus-kits to /ferramentas/kit-library', async () => {
    await testRedirect('/meus-kits', '/ferramentas/kit-library');
  });

  it('redirects from /busca-preco to /ferramentas/busca-avancada-preco', async () => {
    await testRedirect('/busca-preco', '/ferramentas/busca-avancada-preco');
  });
});
