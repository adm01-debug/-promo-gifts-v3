import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  },
}));

// Mock ProtectedRoute to just render children (bypass auth for this test)
vi.mock('@/components/layout/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children || <div data-testid="protected-outlet" />}</>,
}));

// Mock RouteErrorBoundary
vi.mock('@/components/errors/RouteErrorBoundary', () => ({
  RouteErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
            <Suspense fallback={<div>Loading...</div>}>
              <AppContent />
              <LocationDisplay />
            </Suspense>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const display = screen.getByTestId('location-display');
      expect(display.textContent).toBe(expectedToPath);
    }, { timeout: 3000 });
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
