import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SellerCartsPage from './SellerCartsPage';
import { useSellerCartsPage } from './seller-carts/useSellerCartsPage';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock do hook de lógica para isolar o componente
vi.mock('./seller-carts/useSellerCartsPage', () => ({
  useSellerCartsPage: vi.fn(),
}));

// Mock do componente SEO para evitar problemas de renderização fora do HelmetProvider
vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: () => null,
}));

// Helper para renderizar com Router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter });
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSellerCartsPage as any).mockReturnValue(mockBaseState);
  });

  it('deve renderizar o título e a lista de produtos', () => {
    renderWithRouter(<SellerCartsPage />);
    expect(screen.getByText('Carrinhos')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola')).toBeInTheDocument();
    expect(screen.getByText('Caneta Metal')).toBeInTheDocument();
    expect(screen.getByText('Caderno Executivo')).toBeInTheDocument();
  });

  it('deve chamar setSearchTerm ao digitar na busca global', () => {
    renderWithRouter(<SellerCartsPage />);
    const input = screen.getByPlaceholderText('Busca global...');
    fireEvent.change(input, { target: { value: 'teste' } });
    expect(mockBaseState.setSearchTerm).toHaveBeenCalledWith('teste');
  });

  it('deve exibir o botão de limpar filtros quando houver busca ativa', () => {
    (useSellerCartsPage as any).mockReturnValue({
      ...mockBaseState,
      searchTerm: 'algo',
    });
    renderWithRouter(<SellerCartsPage />);
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
    renderWithRouter(<SellerCartsPage />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Itens Selecionados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remover/i })).toBeInTheDocument();
  });

  it('deve permitir trocar o modo de ordenação dos itens', () => {
    renderWithRouter(<SellerCartsPage />);
    const autoBtn = screen.getByText('Auto');
    fireEvent.click(autoBtn);
    expect(mockBaseState.setItemsSortBy).toHaveBeenCalledWith('price-desc');
  });

  it('deve renderizar o estado vazio quando não houver carrinhos', () => {
    (useSellerCartsPage as any).mockReturnValue({
      ...mockBaseState,
      carts: [],
      filteredCarts: [],
      activeCart: null,
    });
    renderWithRouter(<SellerCartsPage />);
    expect(screen.getByText('Monte o carrinho perfeito para seu cliente')).toBeInTheDocument();
  });
});
