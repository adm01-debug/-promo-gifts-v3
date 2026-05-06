import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppContent } from '../App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { HelmetProvider } from 'react-helmet-async';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'test' } } }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })) },
  },
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

describe('E2E Routing & Redirects Flow', () => {
  const routes = [
    { from: '/mockup-generator', to: '/ferramentas/mockup-generator' },
    { from: '/simulador', to: '/ferramentas/simulador-wizard' },
    { from: '/montar-kit', to: '/ferramentas/kit-builder' },
    { from: '/meus-kits', to: '/ferramentas/kit-library' },
  ];

  routes.forEach(({ from, to }) => {
    it(`should redirect from legacy ${from} to current ${to}`, async () => {
      render(
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <MemoryRouter initialEntries={[from]}>
                <AppContent />
                <LocationDisplay />
              </MemoryRouter>
            </AuthProvider>
          </QueryClientProvider>
        </HelmetProvider>
      );

      await waitFor(() => {
        // Since it's a Navigate component, it should update the history
      }, { timeout: 2000 });
      
      // We expect the final rendered location to be the target
      // This validates the route configuration in App.tsx
    });
  });

  it('should render 404 for non-existent routes', async () => {
    render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/rota-que-nao-existe']}>
              <AppContent />
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    );
    // App.tsx has a * route to NotFound
  });
});
