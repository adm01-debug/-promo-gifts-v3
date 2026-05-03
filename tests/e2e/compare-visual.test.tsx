import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComparePage from '../../src/pages/ComparePage';
import { useComparisonStore } from '../../src/stores/useComparisonStore';
import { TooltipProvider } from '../../src/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock do Contexto de Auth
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isAuthenticated: true, role: 'agente' }),
  AuthProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock do Contexto de Onboarding
vi.mock('../../src/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ isTourOpen: false }),
  useOnboardingContext: () => ({ isTourOpen: false, startTour: vi.fn(), completeTour: vi.fn() }),
  OnboardingProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock do Contexto de AriaLive
vi.mock('../../src/components/a11y/AriaLive', () => ({
  useAriaLive: () => ({ announce: vi.fn(), announceStatus: vi.fn() }),
  AriaLiveProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock do Contexto de Carrinho
vi.mock('../../src/contexts/SellerCartContext', () => ({
  useSellerCart: () => ({ items: [] }),
  SellerCartProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock do Supabase com Cadeia de Métodos
vi.mock('../../src/integrations/supabase/client', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    then: vi.fn().mockImplementation((onFulfilled) => Promise.resolve({ data: [] }).then(onFulfilled)),
  };
  return {
    supabase: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockReturnValue(chain),
      rpc: vi.fn().mockResolvedValue({ data: [] }),
    },
  };
});

// Mock de Produtos
const mockProducts = [
  { id: 'p1', name: 'P1', price: 10, images: ['i1.jpg'], minQuantity: 1, stock: 10, stockStatus: 'in-stock', colors: [], sku: 'S1', category: { name: 'C1' }, supplier: { name: 'S1' } },
  { id: 'p2', name: 'P2', price: 20, images: ['i2.jpg'], minQuantity: 2, stock: 20, stockStatus: 'in-stock', colors: [], sku: 'S2', category: { name: 'C1' }, supplier: { name: 'S1' } }
];

vi.mock('../../src/contexts/ProductsContext', () => ({
  useProductsContext: () => ({ products: mockProducts, getProductsByIds: (ids: string[]) => mockProducts.filter(p => ids.includes(p.id)) }),
  useProductsContextSafe: () => ({ products: mockProducts, getProductsByIds: (ids: string[]) => mockProducts.filter(p => ids.includes(p.id)) }),
  ProductsContext: { Provider: ({ children }: any) => <div>{children}</div> },
  ProductsProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-container">{children}</div>,
  Radar: () => <div />, RadarChart: ({ children }: any) => <div>{children}</div>,
  PolarGrid: () => <div />, PolarAngleAxis: () => <div />, PolarRadiusAxis: () => <div />,
  Legend: () => <div />, Tooltip: () => <div />,
  LineChart: ({ children }: any) => <div>{children}</div>, Line: () => <div />,
}));

describe('Módulo Comparar - Visual & Resiliência', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useComparisonStore.setState({
      compareItems: [{ productId: 'p1' }, { productId: 'p2' }],
      compareCount: 2, compareIds: ['p1', 'p2'], isLoaded: true,
    });
  });

  const renderPage = async () => {
    const res = render(
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <BrowserRouter>
            <TooltipProvider>
              <ComparePage />
            </TooltipProvider>
          </BrowserRouter>
        </HelmetProvider>
      </QueryClientProvider>
    );
    await waitFor(() => {});
    return res;
  };

  it('Resiliência: Radar Chart exibe container mesmo sem dados de rede', async () => {
    await renderPage();
    expect(screen.getByTestId('recharts-container')).toBeInTheDocument();
  });

  it('Transição: Botão de Duelo aparece para exatamente 2 produtos', async () => {
    await renderPage();
    expect(await screen.findByText(/Ativar Modo Duelo/i)).toBeInTheDocument();
  });

  it('Estabilidade: Alterna abas sem erro de renderização', async () => {
    await renderPage();
    const tableTab = await screen.findByText(/Tabela Detalhada/i);
    fireEvent.click(tableTab);
    // Verifica se o estado da aba mudou (data-state="active")
    expect(tableTab.closest('button')).toHaveAttribute('data-state', 'active');
  });
});
