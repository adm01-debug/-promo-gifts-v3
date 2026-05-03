import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import FavoritesPage from '@/pages/FavoritesPage';
import PublicFavoriteListPage from '@/pages/PublicFavoriteListPage';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Toaster } from 'sonner';
import { ProductsContext } from '@/contexts/ProductsContext';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mocks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/stores/useFavoritesStore', () => ({
  useFavoritesStore: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { products: [] }, error: null }),
    },
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockProductsContext = {
  products: [],
  isLoading: false,
  getProductById: vi.fn(),
  getProductsByIds: vi.fn().mockReturnValue([]),
  registerProducts: vi.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ProductsContext.Provider value={mockProductsContext}>
          <TooltipProvider>
            <BrowserRouter>
              <Toaster />
              {ui}
            </BrowserRouter>
          </TooltipProvider>
        </ProductsContext.Provider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

describe('E2E Favoritos — Integração UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'user123' } });
    (useFavoritesStore as any).mockReturnValue({
      favorites: [],
      favoriteCount: 0,
      clearFavorites: vi.fn(),
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn().mockReturnValue(false),
    });
  });

  it('valida título da página e contador inicial', async () => {
    renderWithProviders(<FavoritesPage />);
    expect(screen.getByTestId('page-title-favoritos')).toHaveTextContent('Meus Favoritos');
    expect(screen.getByTestId('favorites-count-items')).toHaveTextContent('0');
  });

  it('exibe Empty State quando não há produtos', async () => {
    renderWithProviders(<FavoritesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('favorites-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByTestId('favorites-empty-cta')).toBeInTheDocument();
  });

  it('valida busca textual na UI', async () => {
    renderWithProviders(<FavoritesPage />);
    const searchInput = screen.getByPlaceholderText(/buscar nos favoritos/i);
    fireEvent.change(searchInput, { target: { value: 'produto teste' } });
    expect(searchInput).toHaveValue('produto teste');
  });

  it('valida existência do botão de modo de visualização', async () => {
    renderWithProviders(<FavoritesPage />);
    const layoutBtn = screen.getByRole('button', { name: /visualização/i });
    expect(layoutBtn).toBeInTheDocument();
  });
});

describe('E2E Favoritos — Fluxo de Compartilhamento UI', () => {
  it('valida renderização da lista pública quando o token é inválido/expirado', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    renderWithProviders(<PublicFavoriteListPage />);
    await waitFor(() => {
      expect(screen.getByText(/lista não encontrada/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem de lista não encontrada quando o token não existe', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    renderWithProviders(<PublicFavoriteListPage />);
    await waitFor(() => {
      expect(screen.getByText(/lista não encontrada/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

describe('E2E Favoritos — Acessibilidade UI', () => {
  it('garante que botões principais tenham labels acessíveis', () => {
    renderWithProviders(<FavoritesPage />);
    expect(screen.getByLabelText('Favoritos')).toBeInTheDocument();
  });

  it('input de busca possui label ou placeholder descritivo', () => {
    renderWithProviders(<FavoritesPage />);
    const searchInput = screen.getByPlaceholderText('Buscar nos favoritos...');
    expect(searchInput).toBeInTheDocument();
  });
});


