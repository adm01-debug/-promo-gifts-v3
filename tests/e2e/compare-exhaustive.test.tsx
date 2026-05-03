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
  },
  {
    id: 'p3', name: 'Produto 3', price: 120, images: ['img3.jpg'],
    minQuantity: 15, stock: 100, stockStatus: 'in-stock',
    colors: [{ name: 'Verde', hex: '#00ff00' }], sku: 'SKU3',
    category: { name: 'Escritório', icon: '📎' },
    supplier: { name: 'Sup3', verified: true }
  },
  {
    id: 'p4', name: 'Produto 4', price: 180, images: ['img4.jpg'],
    minQuantity: 8, stock: 0, stockStatus: 'out-of-stock',
    colors: [{ name: 'Preto', hex: '#000000' }], sku: 'SKU4',
    category: { name: 'Escritório', icon: '📎' },
    supplier: { name: 'Sup4', verified: true }
  }
];

// Mock do contexto de Auth
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
    session: { access_token: 'fake-token' },
    profile: { id: 'prof-123', full_name: 'Test User' },
    isLoading: false, isAdmin: false, role: 'agente', isAuthenticated: true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock do contexto de Onboarding
vi.mock('../../src/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ isTourOpen: false, startTour: vi.fn(), completeTour: vi.fn() }),
  useOnboardingContext: () => ({ isTourOpen: false, startTour: vi.fn(), completeTour: vi.fn() }),
  useOnboardingHook: () => ({ isTourOpen: false, startTour: vi.fn(), completeTour: vi.fn() }),
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock do contexto de Carrinho do Vendedor
vi.mock('../../src/contexts/SellerCartContext', () => ({
  useSellerCart: () => ({ items: [], addItem: vi.fn(), removeItem: vi.fn() }),
  SellerCartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mocks de infraestrutura (Supabase)
vi.mock('../../src/integrations/supabase/client', () => {
  const mockSupabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    rpc: vi.fn().mockResolvedValue({ data: [] }),
  };
  return { supabase: mockSupabase };
});

vi.mock('../../src/contexts/ProductsContext', () => ({
  useProductsContext: () => ({
    products: mockProducts,
    getProductsByIds: (ids: string[]) => mockProducts.filter(p => ids.includes(p.id)),
  }),
  useProductsContextSafe: () => ({
    products: mockProducts,
    getProductsByIds: (ids: string[]) => mockProducts.filter(p => ids.includes(p.id)),
  }),
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

// Mock do hook useComparisonScore para garantir dados nos cards
vi.mock('../../src/hooks/useComparisonScore', () => ({
  useComparisonScore: (products: any[]) => {
    if (!products || products.length === 0) return [];
    return products.map(p => ({
      productId: String(p.id),
      total: 80,
      score: 80,
      isWinner: p.id === 'p1',
      rank: 1,
      breakdown: { price: 35, stock: 20, minQuantity: 15, colorVariety: 10, verifiedSupplier: 10, leadTime: 10 }
    }));
  },
  DEFAULT_SCORE_WEIGHTS: { price: 35, stock: 20, minQuantity: 15, colorVariety: 10, verifiedSupplier: 10, leadTime: 10 }
}));

describe('Módulo Comparar - Bateria Exaustiva de Testes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useComparisonStore.setState({
      compareItems: [{ productId: 'p1' }, { productId: 'p2' }, { productId: 'p3' }, { productId: 'p4' }],
      compareCount: 4, compareIds: ['p1', 'p2', 'p3', 'p4'], isLoaded: true,
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

  it('Validação 1: Carregamento total e limites (4 produtos)', async () => {
    await renderPage();
    expect(screen.getByText(/Comparando 4 produtos/i)).toBeInTheDocument();
  });

  it('Validação 2: Tabela Detalhada e Filtros de Diferença', async () => {
    await renderPage();
    const tableTab = await screen.findByText(/Tabela Detalhada/i);
    fireEvent.click(tableTab);
    
    // Tenta encontrar o texto de forma mais flexível
    await waitFor(() => {
      const cell = screen.queryAllByText(/Preço unitário/i);
      expect(cell.length).toBeGreaterThan(0);
    });

    const diffBtn = screen.getByText(/Só diferenças/i);
    fireEvent.click(diffBtn);
    expect(diffBtn).toHaveTextContent(/Mostrando diferenças/i);
  });

  it('Validação 3: Gráficos e Inteligência Artificial', async () => {
    await renderPage();
    const radars = screen.getAllByTestId('radar-chart');
    expect(radars.length).toBeGreaterThan(0);
    expect(screen.getByText(/Advisor AI/i)).toBeInTheDocument();
  });

  it('Validação 4: Modo Duelo', async () => {
    useComparisonStore.setState({
      compareItems: [{ productId: 'p1' }, { productId: 'p2' }],
      compareCount: 2, compareIds: ['p1', 'p2'],
    });
    await renderPage();
    fireEvent.click(screen.getByText(/Ativar Modo Duelo/i));
    expect(screen.getByText(/Modo Duelo ativo/i)).toBeInTheDocument();
  });

  it('Validação 5: Remoção e Limpeza', async () => {
    await renderPage();
    const removeBtns = screen.getAllByLabelText(/Remover/i);
    fireEvent.click(removeBtns[0]);
    expect(screen.getByText(/Comparando 3 produtos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Limpar/i));
    expect(screen.getByText(/Selecione pelo menos 2 produtos/i)).toBeInTheDocument();
  });
});
