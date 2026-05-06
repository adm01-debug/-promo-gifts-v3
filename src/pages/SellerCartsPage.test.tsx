import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SellerCartsPage from './SellerCartsPage';
import { useSellerCartsPage } from './seller-carts/useSellerCartsPage';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock do hook de lógica
vi.mock('./seller-carts/useSellerCartsPage', () => ({
  useSellerCartsPage: vi.fn(),
}));

// Mock do contexto
vi.mock('@/contexts/SellerCartContext', () => ({
  useSellerCartContext: vi.fn(() => ({})),
  SellerCartProvider: ({ children }: any) => <>{children}</>,
}));

// Mock do SEO
vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: () => null,
}));

// Mock dos componentes pesados/complexos com mocks vazios para evitar dependências circulares ou de UI complexas
vi.mock('@/components/cart/SortableCartItem', () => ({
  SortableCartItem: ({ item }: any) => <div data-testid="mock-cart-item">{item.product_name}</div>,
}));

vi.mock('@/components/cart/CartTabsRich', () => ({
  CartTabsRich: () => <div data-testid="mock-tabs" />,
}));

vi.mock('./seller-carts/CartSidebar', () => ({
  CartSidebar: () => <div data-testid="mock-sidebar" />,
}));

vi.mock('@/components/cart/CartUtilComponents', () => ({
  getStatusCfg: () => ({ label: 'Novo', color: 'bg-primary' }),
  STATUS_CONFIG: {},
  formatCurrency: (v: number) => `R$ ${v}`,
  FollowUpTimer: () => null,
  MobileSummarySheet: () => null,
  SmartSuggestions: () => null,
  ActionHistoryPanel: () => null,
  CompareCartsDialog: () => null,
}));

vi.mock('@/components/cart/CartCompanyPickerDialog', () => ({
  CartCompanyPickerDialog: () => null,
}));

vi.mock('@/components/cart/CartEmptyStateSmart', () => ({
  CartEmptyStateSmart: () => <div data-testid="mock-empty-state" />,
}));

// Mock da animação
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual as any,
    motion: {
      ...actual.motion,
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
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
      status: 'novo',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      items: [{ id: 'item-1', product_name: 'Caneta Metal' }]
    }
  ];

  const mockBaseState = {
    carts: mockCarts,
    filteredCarts: mockCarts,
    activeCart: mockCarts[0],
    activeCartId: 'cart-1',
    isLoading: false,
    totalItems: 1,
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
    productSuggestions: ['Caneta Metal'],
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
    handleBulkMove: vi.fn(),
    handleBulkRemove: vi.fn(),
    handleBulkUpdateNotes: vi.fn(),
    cartAge: 0,
    cartSubtotal: 0,
    cartTotalQty: 0,
    confirmQuoteCart: null,
    setConfirmQuoteCart: vi.fn(),
    confirmDeleteCart: false,
    setConfirmDeleteCart: vi.fn(),
    confirmClearCart: false,
    setConfirmClearCart: vi.fn(),
    confirmGenerateQuote: vi.fn(),
    handleGenerateQuote: vi.fn(),
    shareCartLink: vi.fn(),
    duplicateCart: vi.fn(),
    exportCartToCSV: vi.fn(),
    exportCartToPDF: vi.fn(),
    handleSaveTemplate: vi.fn(),
    deleteTemplate: { mutate: vi.fn() },
    setActiveCartId: vi.fn(),
    deleteCart: vi.fn(),
    handleClearCart: vi.fn(),
    localCartNotes: '',
    handleCartNotesChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSellerCartsPage as any).mockReturnValue(mockBaseState);
  });

  it('deve renderizar o título e os itens mockados', () => {
    renderWithContext(<SellerCartsPage />);
    expect(screen.getByText('Carrinhos')).toBeInTheDocument();
    expect(screen.getByTestId('mock-cart-item')).toHaveTextContent('Caneta Metal');
  });

  it('deve disparar busca ao mudar input', () => {
    renderWithContext(<SellerCartsPage />);
    const input = screen.getByPlaceholderText('Busca global...');
    fireEvent.change(input, { target: { value: 'teste' } });
    expect(mockBaseState.setSearchTerm).toHaveBeenCalledWith('teste');
  });

  it('deve exibir barra de ações em massa se houver seleção', () => {
    (useSellerCartsPage as any).mockReturnValue({
      ...mockBaseState,
      selectedItemIds: new Set(['item-1']),
    });
    renderWithContext(<SellerCartsPage />);
    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getByText('Itens Selecionados')).toBeInTheDocument();
  });
});
