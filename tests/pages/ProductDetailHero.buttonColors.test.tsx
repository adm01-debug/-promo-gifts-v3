import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductDetailHero } from '@/pages/product-detail/ProductDetailHero';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const mockProduct = {
  id: '123',
  name: 'Produto Teste',
  sku: 'SKU-123',
  price: 10,
  images: ['img.jpg'],
  minQuantity: 1,
  description: 'Desc',
  specifications: {},
  supplier: {
    id: 'sup1',
    name: 'XBZ Brindes'
  },
  categories: [],
  brand: 'Brand'
};

describe('ProductDetailHero Button Colors', () => {
  it('should have correct semantic classes for Carrinho and Orçamento buttons', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <ProductDetailHero product={mockProduct as any} id="123" />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );

    // Carrinho: azul (primary)
    // No mock, QuickAddToQuote pode renderizar como botão com label "Carrinho"
    const cartBtn = screen.getByLabelText(/Carrinho/i);
    expect(cartBtn.className).toContain('bg-primary');
    
    // Orçamento: verde (success)
    const quoteBtn = screen.getByText(/Orçamento/i).closest('button');
    expect(quoteBtn?.className).toContain('bg-success');
  });
});
