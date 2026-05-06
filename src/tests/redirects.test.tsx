import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, useLocation, Outlet } from 'react-router-dom';
import { AppContent } from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { AppProviders } from '../components/providers/AppProviders';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
        })),
        match: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '123', role: 'admin' }, error: null })),
        })),
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

// Mock ProtectedRoute to just render the Outlet
vi.mock('@/components/layout/ProtectedRoute', () => ({
  ProtectedRoute: () => <Outlet />,
}));

// Mock AdminRoute and other guards
vi.mock('@/components/layout/AdminRoute', () => ({ AdminRoute: () => <Outlet /> }));
vi.mock('@/components/layout/DevRoute', () => ({ DevRoute: () => <Outlet /> }));
vi.mock('@/components/layout/DeprecatedRoute', () => ({ DeprecatedRoute: () => <Outlet /> }));

// Mock RouteErrorBoundary
vi.mock('@/components/errors/RouteErrorBoundary', () => ({
  RouteErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children || <Outlet />}</>,
}));

// Mock useAppBootstrap
vi.mock('@/hooks/useAppBootstrap', () => ({
  useAppBootstrap: vi.fn(),
}));

// Mock any heavy pages that might cause side effects or load errors
vi.mock('../pages/Index', () => ({ default: () => <div data-testid="page-index">Index</div> }));
vi.mock('../pages/MockupGenerator', () => ({ default: () => <div data-testid="page-mockup">Mockup</div> }));

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
    );

    // Increase timeout slightly for transitions
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
