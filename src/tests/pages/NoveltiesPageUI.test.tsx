import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../tests/test-utils';
import NoveltiesPage from '@/pages/NoveltiesPage';
import { MOCK_NOVELTIES } from '@/hooks/useNoveltiesMocks';
import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SellerCartProvider } from '@/contexts/SellerCartContext';
import { CollectionsProvider } from '@/contexts/CollectionsContext';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { HelmetProvider } from 'react-helmet-async';

// Mock useAuth since we don't want to deal with AuthProvider complexity
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    isAgente: true,
    isSupervisorOrAbove: false,
    isAdmin: false,
  }),
}));

// Mock structured logger to avoid noise
vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock useNoveltiesWithDetails to return mock data
vi.mock('@/hooks/useNovelties', async () => {
  const actual = await vi.importActual('@/hooks/useNovelties');
  return {
    ...actual,
    useNoveltiesWithDetails: vi.fn(() => ({
      data: MOCK_NOVELTIES,
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      error: null,
    })),
    useNoveltyStats: vi.fn(() => ({
      data: {
        totalNovelties: MOCK_NOVELTIES.length,
        activeNovelties: MOCK_NOVELTIES.filter(p => p.status === 'active').length,
        expiringSoon: MOCK_NOVELTIES.filter(p => p.status === 'expiring_soon').length,
        arrivedToday: 1,
        arrivedThisWeek: 3,
        arrivedLast15Days: 5,
        totalProducts: 1000,
        noveltyRate: 5,
      },
      isLoading: false,
      isSuccess: true,
    })),
    useExpiringNovelties: vi.fn(() => ({
      data: MOCK_NOVELTIES.filter(p => p.status === 'expiring_soon'),
      isLoading: false,
      isSuccess: true,
    })),
  };
});

// Mock useExternalVariantStock to return empty to avoid crashes in QuickAddToQuote/VariantPicker
vi.mock('@/hooks/useExternalVariantStock', () => ({
  useExternalVariantStock: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Wrapper for required providers
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } }
  });

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ProductsProvider>
            <CollectionsProvider>
              <SellerCartProvider>
                {children}
              </SellerCartProvider>
            </CollectionsProvider>
          </ProductsProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

describe('NoveltiesPage UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and description correctly', () => {
    render(<NoveltiesPage />, { wrapper: AllProviders });
    
    expect(screen.getByTestId('page-title-novidades')).toBeInTheDocument();
    expect(screen.getByText(/Produtos recém-chegados ao catálogo nos últimos 30 dias/i)).toBeInTheDocument();
  });

  it('renders stats cards with data', async () => {
    render(<NoveltiesPage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      // "Total de Novidades" might be inside a card title
      expect(screen.getByText(/Novidades Ativas/i)).toBeInTheDocument();
      expect(screen.getByText(/Expira em breve/i)).toBeInTheDocument();
    });
  });

  it('renders the product grid with mock products', async () => {
    render(<NoveltiesPage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getByText('Power Bank Solar 20000mAh')).toBeInTheDocument();
      expect(screen.getByText('Kit Escrita Sustentável Bambu')).toBeInTheDocument();
    });
  });

  it('filters products by search query', async () => {
    render(<NoveltiesPage />, { wrapper: AllProviders });
    
    const searchInput = screen.getByPlaceholderText(/Buscar novidades…/i);
    
    fireEvent.change(searchInput, { target: { value: 'Solar' } });
    
    await waitFor(() => {
      expect(screen.getByText('Power Bank Solar 20000mAh')).toBeInTheDocument();
      expect(screen.queryByText('Kit Escrita Sustentável Bambu')).not.toBeInTheDocument();
    }, { timeout: 1500 });
  });

  it('navigates to product detail on card click', async () => {
    render(<NoveltiesPage />, { wrapper: AllProviders });
    
    // Find the product name
    const productName = await screen.findByText('Power Bank Solar 20000mAh');
    
    // In NoveltyGridCard, the click is on the card itself
    const card = productName.closest('.cursor-pointer');
    if (!card) throw new Error('Card not found');
    
    fireEvent.click(card);
    
    expect(mockNavigate).toHaveBeenCalledWith('/produto/p-1');
  });

  it('clears filters when clicking the clear button', async () => {
    render(<NoveltiesPage />, { wrapper: AllProviders });
    
    const searchInput = screen.getByPlaceholderText(/Buscar novidades…/i);
    fireEvent.change(searchInput, { target: { value: 'XYZ_NON_EXISTENT' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma novidade encontrada/i)).toBeInTheDocument();
    }, { timeout: 1500 });
    
    const clearButton = screen.getByText(/Limpar todos os filtros/i);
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(screen.getByText('Power Bank Solar 20000mAh')).toBeInTheDocument();
    });
    
    expect(searchInput).toHaveValue('');
  });
});
