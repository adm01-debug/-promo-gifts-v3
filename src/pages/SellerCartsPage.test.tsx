import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SellerCartsPage from './SellerCartsPage';
import { useSellerCartsPage } from './seller-carts/useSellerCartsPage';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock do hook de lógica para isolar o componente
vi.mock('./seller-carts/useSellerCartsPage', () => ({
  useSellerCartsPage: vi.fn(),
}));

// Mock do componente SEO
vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: () => null,
}));

// Mock de contextos e componentes que dependem de rede/infra
vi.mock('@/contexts/SellerCartContext', () => ({
  useSellerCartContext: vi.fn(() => ({})),
  SellerCartProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: '123' } })),
  AuthContext: { Provider: ({ children }: any) => <>{children}</> },
}));

// Mock da animação para evitar problemas no jsdom
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual as any,
    motion: {
      ...actual.motion,
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
      span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

describe('SellerCartsPage Component', () => {
  const mockCarts = [
    {
      id: 'cart-1',
      company_name: 'Coca-Cola',
      company_logo_url: null,
      status: 'novo',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      items: [
        { id: 'item-1', product_name: 'Caneta Metal', product_price: 5.5, quantity: 100 },
        { id: 'item-2', product_name: 'Caderno Executivo', product_price: 25.0, quantity: 50 },
      ]
    }
  ];

  const mockBaseState = {
    carts: mockCarts,
    filteredCarts: mockCarts,
    activeCart: mockCarts[0],
    activeCartId: 'cart-1',
    isLoading: false,
    totalItems: 2,
    canCreateCart: true,
    searchTerm: '',
    setSearchTerm: vi.fn(),
    productFilter: '',
    setProductFilter: vi.fn(),
    companyFilter: 'all',
    setCompanyFilter: vi.fn(),
    sortBy: 'date-desc',
    setSortBy: vi.fn(),
    itemsSortBy: 'manual',
    setItemsSortBy: vi.fn(),
    sortedItems: mockCarts[0].items,
    selectedItemIds: new Set(),
    toggleItemSelection: vi.fn(),
    clearSelection: vi.fn(),
    handleClearFilters: vi.fn(),
    productSuggestions: ['Caneta Metal', 'Caderno Executivo'],
    handleDragEnd: vi.fn(),
    handleRemoveItem: vi.fn(),
    handleUpdateQuantity: vi.fn(),
    updateItemNotes: vi.fn(),
    handleMoveItem: vi.fn(),
    handleDuplicateItem: vi.fn(),
    handleCartNotesChange: vi.fn(),
    localCartNotes: '',
    sensors: [],
    showNewCart: false,
    setShowNewCart: vi.fn(),
    handleLoadTemplate: vi.fn(),
    otherCarts: [],
    navigate: vi.fn(),
    weightVolume: null,
    stockMap: new Map(),
    companyAccentColor: '#FF0000',
    isLoadingProducts: false,
    templates: [],
    shareCartLink: vi.fn(),
    duplicateCart: vi.fn(),
    exportCartToCSV: vi.fn(),
    exportCartToPDF: vi.fn(),
    handleSaveTemplate: vi.fn(),
    deleteTemplate: { mutate: vi.fn() },
    setActiveCartId: vi.fn(),
    deleteCart: vi.fn(),
    confirmQuoteCart: null,
    setConfirmQuoteCart: vi.fn(),
    confirmDeleteCart: false,
    setConfirmDeleteCart: vi.fn(),
    confirmClearCart: false,
    setConfirmClearCart: vi.fn(),
    confirmGenerateQuote: vi.fn(),
    handleGenerateQuote: vi.fn(),
    handleClearCart: vi.fn(),
    cartAge: 0,
    cartSubtotal: 1000,
    cartTotalQty: 150,
    handleBulkMove: vi.fn(),
    handleBulkRemove: vi.fn(),
    handleBulkUpdateNotes: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSellerCartsPage as any).mockReturnValue(mockBaseState);
  });

  it('deve renderizar o título e a lista de produtos', () => {
    renderWithContext(<SellerCartsPage />);
    expect(screen.getByText('Carrinhos')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola')).toBeInTheDocument();
    expect(screen.getByText('Caneta Metal')).toBeInTheDocument();
  });

  it('deve chamar setSearchTerm ao digitar na busca global', () => {
    renderWithContext(<SellerCartsPage />);
    const input = screen.getByPlaceholderText('Busca global...');
    fireEvent.change(input, { target: { value: 'teste' } });
    expect(mockBaseState.setSearchTerm).toHaveBeenCalledWith('teste');
  });

  it('deve exibir o botão de limpar filtros quando houver busca ativa', () => {
    (useSellerCartsPage as any).mockReturnValue({
      ...mockBaseState,
      searchTerm: 'algo',
    });
    renderWithContext(<SellerCartsPage />);
    const clearBtn = screen.getByRole('button', { name: /limpar/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(mockBaseState.handleClearFilters).toHaveBeenCalled();
  });

  it('deve mostrar a barra de ações em massa quando itens estiverem selecionados', () => {
    (useSellerCartsPage as any).mockReturnValue({
      ...mockBaseState,
      selectedItemIds: new Set(['item-1']),
    });
    renderWithContext(<SellerCartsPage />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Itens Selecionados')).toBeInTheDocument();
  });

  it('deve permitir trocar o modo de ordenação dos itens', () => {
    renderWithContext(<SellerCartsPage />);
    const autoBtn = screen.getByText('Auto');
    fireEvent.click(autoBtn);
    expect(mockBaseState.setItemsSortBy).toHaveBeenCalledWith('price-desc');
  });
});
