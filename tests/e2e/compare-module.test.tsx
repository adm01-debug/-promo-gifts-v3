import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComparePage from '../../src/pages/ComparePage';
import { useComparisonStore } from '../../src/stores/useComparisonStore';
import { ProductsProvider } from '../../src/contexts/ProductsContext';
import { TooltipProvider } from '../../src/components/ui/tooltip';

// Mock do contexto de Auth
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
    session: { access_token: 'fake-token' },
    profile: { id: 'prof-123', full_name: 'Test User' },
    isLoading: false,
    isAdmin: false,
    role: 'agente',
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock do contexto de Onboarding
vi.mock('../../src/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    isTourOpen: false,
    startTour: vi.fn(),
    completeTour: vi.fn(),
  }),
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock do contexto de Carrinho do Vendedor
vi.mock('../../src/contexts/SellerCartContext', () => ({
  useSellerCart: () => ({
    items: [],
    addItem: vi.fn(),
    removeItem: vi.fn(),
  }),
  SellerCartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock do Supabase
vi.mock('../../src/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    rpc: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

// Mock do Store
const mockProducts = [
  {
    id: 'prod-1',
    name: 'Produto A',
    price: 100,
    images: ['img1.jpg'],
    minQuantity: 10,
    stock: 500,
    stockStatus: 'in-stock',
    colors: [{ name: 'Azul', hex: '#0000ff' }],
    sku: 'SKU-A',
    category: { name: 'Escritório', icon: '📎' },
    supplier: { name: 'Fornecedor X', verified: true },
  },
  {
    id: 'prod-2',
    name: 'Produto B',
    price: 150,
    images: ['img2.jpg'],
    minQuantity: 5,
    stock: 20,
    stockStatus: 'low-stock',
    colors: [{ name: 'Vermelho', hex: '#ff0000' }],
    sku: 'SKU-B',
    category: { name: 'Escritório', icon: '📎' },
    supplier: { name: 'Fornecedor Y', verified: false },
  }
];

describe('E2E Comparar — Módulo de Comparação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useComparisonStore.setState({
      compareItems: [],
      compareIds: [],
      compareCount: 0,
      isLoaded: true,
    });
  });

  const renderPage = () => {
    return render(
      <BrowserRouter>
        <ProductsProvider>
          <TooltipProvider>
            <ComparePage />
          </TooltipProvider>
        </ProductsProvider>
      </BrowserRouter>
    );
  };

  it('exibe estado vazio inteligente quando menos de 2 produtos estão na comparação', async () => {
    renderPage();
    expect(screen.getByText(/Selecione pelo menos 2 produtos para comparar/i)).toBeInTheDocument();
    expect(screen.getByText(/Explorar catálogo/i)).toBeInTheDocument();
  });

  it('exibe a tabela de comparação quando 2 ou mais produtos são adicionados', async () => {
    useComparisonStore.setState({
      compareItems: [
        { productId: 'prod-1' },
        { productId: 'prod-2' }
      ],
      compareCount: 2,
      compareIds: ['prod-1', 'prod-2'],
    });
    
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Comparador de Produtos/i)).toBeInTheDocument();
      expect(screen.getByText(/Comparando 2 produtos/i)).toBeInTheDocument();
    });
  });

  it('valida o Modo Duelo quando exatamente 2 produtos estão presentes', async () => {
    useComparisonStore.setState({
      compareItems: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
      compareCount: 2,
      compareIds: ['prod-1', 'prod-2'],
    });

    renderPage();

    await waitFor(() => {
      const duelBtn = screen.getByText(/Modo Duelo/i);
      expect(duelBtn).toBeInTheDocument();
    });
  });

  it('permite alternar entre Galeria Visual e Tabela Detalhada', async () => {
    useComparisonStore.setState({
      compareItems: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
      compareCount: 2,
      compareIds: ['prod-1', 'prod-2'],
    });

    renderPage();

    const tableTab = screen.getByText(/Tabela Detalhada/i);
    fireEvent.click(tableTab);

    await waitFor(() => {
      expect(screen.getByText(/Atributo/i)).toBeInTheDocument();
      expect(screen.getByText(/Preço unitário/i)).toBeInTheDocument();
    });
  });

  it('valida o filtro "Só diferenças"', async () => {
    useComparisonStore.setState({
      compareItems: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
      compareCount: 2,
      compareIds: ['prod-1', 'prod-2'],
    });

    renderPage();

    const diffBtn = screen.getByText(/Só diferenças/i);
    fireEvent.click(diffBtn);

    await waitFor(() => {
      expect(diffBtn).toHaveTextContent(/Mostrando diferenças/i);
    });
  });

  it('permite limpar a comparação', async () => {
    const clearSpy = vi.spyOn(useComparisonStore.getState(), 'clearCompare');
    
    useComparisonStore.setState({
      compareItems: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
      compareCount: 2,
      compareIds: ['prod-1', 'prod-2'],
    });

    renderPage();

    const clearBtn = screen.getByText(/Limpar/i);
    fireEvent.click(clearBtn);

    expect(clearSpy).toHaveBeenCalled();
  });

  it('valida acessibilidade: rótulos e navegação por teclado', async () => {
    useComparisonStore.setState({
      compareItems: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
      compareCount: 2,
      compareIds: ['prod-1', 'prod-2'],
    });

    renderPage();

    const backBtn = screen.getByLabelText(/Voltar/i);
    expect(backBtn).toBeInTheDocument();
    
    backBtn.focus();
    expect(document.activeElement).toBe(backBtn);
  });
});
