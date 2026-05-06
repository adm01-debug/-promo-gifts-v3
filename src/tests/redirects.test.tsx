import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, Outlet } from 'react-router-dom';
import { AppContent } from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';

// Mocking dependencies to prevent errors during rendering
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
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
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  },
}));

// Mock ProtectedRoute to just render the Outlet (standard for layout routes in react-router)
vi.mock('@/components/layout/ProtectedRoute', () => ({
  ProtectedRoute: () => <Outlet />,
}));

// Mock AdminRoute and other guards as well
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
          <MemoryRouter initialEntries={[fromPath]}>
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
              <AppContent />
              <LocationDisplay />
            </Suspense>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    // Wait for the redirect to happen. Navigate with replace/push triggers a state update.
    await waitFor(() => {
      const display = screen.getByTestId('location-display');
      expect(display.textContent).toBe(expectedToPath);
    }, { timeout: 4000 });
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
