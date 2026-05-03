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

// Mocks de infraestrutura
vi.mock('../../src/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('../../src/contexts/ProductsContext', () => ({
  useProductsContext: () => ({
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
}));

describe('Módulo Comparar - Bateria Exaustiva de Testes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useComparisonStore.setState({
      compareItems: [
        { productId: 'p1' }, { productId: 'p2' }, { productId: 'p3' }, { productId: 'p4' }
      ],
      compareCount: 4,
      compareIds: ['p1', 'p2', 'p3', 'p4'],
      isLoaded: true,
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
    expect(screen.getByText(/Produto 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Produto 4/i)).toBeInTheDocument();
  });

  it('Validação 2: Tabela Detalhada e Filtros de Diferença', async () => {
    await renderPage();
    const tableTab = screen.getByText(/Tabela Detalhada/i);
    fireEvent.click(tableTab);

    // Valida atributos na tabela
    expect(screen.getByText(/Preço unitário/i)).toBeInTheDocument();
    expect(screen.getByText(/SKU/i)).toBeInTheDocument();

    // Testa filtro de diferenças
    const diffBtn = screen.getByText(/Só diferenças/i);
    fireEvent.click(diffBtn);
    expect(diffBtn).toHaveTextContent(/Mostrando diferenças/i);
  });

  it('Validação 3: Gráficos e Inteligência Artificial', async () => {
    await renderPage();
    // O gráfico de radar deve estar no DOM
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    
    // O Score Card deve mostrar as pontuações
    expect(screen.getByText(/Pontuação de Comparação/i)).toBeInTheDocument();
    
    // AI Advisor deve estar visível
    expect(screen.getByText(/Advisor AI/i)).toBeInTheDocument();
  });

  it('Validação 4: Modo Duelo (Transição 2 vs N)', async () => {
    // Força 2 itens para ativar o duelo
    useComparisonStore.setState({
      compareItems: [{ productId: 'p1' }, { productId: 'p2' }],
      compareCount: 2,
      compareIds: ['p1', 'p2'],
    });

    await renderPage();
    expect(screen.getByText(/Ativar Modo Duelo/i)).toBeInTheDocument();
    
    // Ativa o duelo
    fireEvent.click(screen.getByText(/Ativar Modo Duelo/i));
    expect(screen.getByText(/Modo Duelo ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/⚔️ Modo Duelo/i)).toBeInTheDocument();
  });

  it('Validação 5: Remoção e Limpeza', async () => {
    await renderPage();
    const removeBtns = screen.getAllByLabelText(/Remover/i);
    fireEvent.click(removeBtns[0]);
    
    expect(screen.getByText(/Comparando 3 produtos/i)).toBeInTheDocument();

    const clearBtn = screen.getByText(/Limpar/i);
    fireEvent.click(clearBtn);
    
    expect(screen.getByText(/Selecione pelo menos 2 produtos/i)).toBeInTheDocument();
  });

  it('Validação 6: Acessibilidade e Exportação', async () => {
    await renderPage();
    expect(screen.getByLabelText(/Voltar/i)).toBeInTheDocument();
    expect(screen.getByText(/Exportar/i)).toBeInTheDocument();
    expect(screen.getByText(/Compartilhar/i)).toBeInTheDocument();
  });
});
