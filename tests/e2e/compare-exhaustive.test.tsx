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

// Mock de produtos base
const mockProducts = [
  {
    id: 'p1', name: 'Produto 1', price: 100, images: ['img1.jpg'],
    minQuantity: 10, stock: 500, stockStatus: 'in-stock',
    colors: [{ name: 'Azul', hex: '#0000ff' }], sku: 'SKU1',
    category: { name: 'Escritório', icon: '📎' },
    supplier: { name: 'Sup1', verified: true }
  },
  {
    id: 'p2', name: 'Produto 2', price: 150, images: ['img2.jpg'],
    minQuantity: 5, stock: 20, stockStatus: 'low-stock',
    colors: [{ name: 'Vermelho', hex: '#ff0000' }], sku: 'SKU2',
    category: { name: 'Escritório', icon: '📎' },
    supplier: { name: 'Sup2', verified: false }
  }
];

// Mocks consolidados
vi.mock('../../src/components/a11y/AriaLive', () => ({
  useAriaLive: () => ({ announce: vi.fn(), announceStatus: vi.fn() }),
  AriaLiveProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isAuthenticated: true, role: 'agente' }),
  AuthProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ isTourOpen: false }),
  useOnboardingContext: () => ({ isTourOpen: false }),
  OnboardingProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/contexts/SellerCartContext', () => ({
  useSellerCart: () => ({ items: [] }),
  SellerCartProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('../../src/contexts/ProductsContext', () => ({
  useProductsContext: () => ({ products: mockProducts, getProductsByIds: (ids: string[]) => mockProducts.filter(p => ids.includes(p.id)) }),
  useProductsContextSafe: () => ({ products: mockProducts, getProductsByIds: (ids: string[]) => mockProducts.filter(p => ids.includes(p.id)) }),
  ProductsContext: { Provider: ({ children }: any) => <div>{children}</div> },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Radar: () => <div data-testid="radar-chart" />,
  RadarChart: ({ children }: any) => <div>{children}</div>,
  PolarGrid: () => <div />, PolarAngleAxis: () => <div />, PolarRadiusAxis: () => <div />,
  Legend: () => <div />, Tooltip: () => <div />,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
}));

vi.mock('../../src/hooks/useComparisonScore', () => ({
  useComparisonScore: (products: any[]) => (products || []).map(p => ({
    productId: String(p.id), total: 80, score: 80, isWinner: true, rank: 1,
    breakdown: { price: 35, stock: 20, minQuantity: 15, colorVariety: 10, verifiedSupplier: 10, leadTime: 10 }
  })),
  DEFAULT_SCORE_WEIGHTS: { price: 35, stock: 20, minQuantity: 15, colorVariety: 10, verifiedSupplier: 10, leadTime: 10 }
}));

describe('Módulo Comparar - Bateria Exaustiva', () => {
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

  it('Geral: Carregamento e Interface Base', async () => {
    await renderPage();
    expect(await screen.findByText(/Comparador de Produtos/i)).toBeInTheDocument();
  });

  it('Funcional: Tabela e Filtros', async () => {
    await renderPage();
    const tableTab = await screen.findByText(/Tabela Detalhada/i);
    fireEvent.click(tableTab);
    
    await waitFor(() => {
      const cell = screen.queryAllByText(/Preço unitário/i);
      expect(cell.length).toBeGreaterThan(0);
    });

    const diffBtn = screen.getByText(/Só diferenças/i);
    fireEvent.click(diffBtn);
    expect(diffBtn).toHaveTextContent(/Mostrando diferenças/i);
  });

  it('Modos: Duelo', async () => {
    await renderPage();
    const duelBtn = await screen.findByText(/Ativar Modo Duelo/i);
    fireEvent.click(duelBtn);
    expect(await screen.findByText(/Modo Duelo ativo/i)).toBeInTheDocument();
  });

  it('Ações: Remoção e Limpeza', async () => {
    await renderPage();
    const removeBtns = await screen.findAllByLabelText(/Remover/i);
    fireEvent.click(removeBtns[0]);
    expect(await screen.findByText(/Comparando 1 produto/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Limpar/i));
    expect(await screen.findByText(/Selecione pelo menos 2 produtos/i)).toBeInTheDocument();
  });
});



