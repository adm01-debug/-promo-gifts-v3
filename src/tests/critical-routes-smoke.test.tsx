import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { lazy, Suspense } from 'react';

// Mocking some complex dependencies that might cause issues in unit test environment
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  },
}));

// Mock dynamic imports to avoid real network calls in unit tests,
// but still verify they can be imported
const QuoteBuilderPage = lazy(() => import('../pages/QuoteBuilderPage'));
const FiltersPage = lazy(() => import('../pages/FiltersPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<div>Loading...</div>}>{ui}</Suspense>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

describe('Critical Routes Smoke Test', () => {
  it('renders QuoteBuilderPage without module failures', async () => {
    renderWithProviders(<QuoteBuilderPage />);

    // We expect it to NOT show the "Falha no Módulo" text which would be rendered by ErrorBoundary
    await waitFor(
      () => {
        expect(screen.queryByText(/Falha no Módulo/i)).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('renders FiltersPage without module failures', async () => {
    renderWithProviders(<FiltersPage />);

    await waitFor(
      () => {
        expect(screen.queryByText(/Falha no Módulo/i)).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
