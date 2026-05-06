import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StockFilterToolbar } from './StockFilterToolbar';
import { VariantStockTable } from './VariantStockTable';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultStockFilters } from '@/types/stock';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockProps = {
  filters: defaultStockFilters,
  onUpdateFilter: vi.fn(),
  onResetFilters: vi.fn(),
  categories: [{ name: 'Test Category', count: 10 }],
  suppliers: [{ name: 'Test Supplier', count: 5 }],
  colors: ['#ff0000'],
  colorGroups: [{ name: 'Reds', count: 3 }],
  totalProducts: 100,
  filteredCount: 50,
};

const mockProducts = [
  {
    productId: '1',
    productName: 'Test Product',
    productSku: 'SKU-001',
    totalCurrentStock: 100,
    totalMinStock: 50,
    totalReservedStock: 10,
    totalInTransitStock: 20,
    totalAvailableStock: 90,
    overallStatus: 'in_stock' as const,
    variantsInStock: 1,
    variantsLowStock: 0,
    variantsCritical: 0,
    variantsOutOfStock: 0,
    totalVariants: 1,
    variants: [],
    availableColors: [],
  }
];

describe('Inventory UI Components', () => {
  it('renders StockFilterToolbar with UI components and rounded-lg class', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StockFilterToolbar {...mockProps} />
      </QueryClientProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Buscar no estoque/i);
    const quantityInput = screen.getByPlaceholderText(/Preciso de X unidades/i);
    
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveClass('rounded-lg');
    expect(quantityInput).toHaveClass('rounded-lg');
  });

  it('renders VariantStockTable with UI components', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <VariantStockTable products={mockProducts} isLoading={false} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('SKU-001')).toBeInTheDocument();
  });
});
