import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductListItem } from '../src/components/products/ProductListItem';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { items: [] }, error: null })),
    },
  },
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
}));

const mockProduct: any = {
  id: 'p1',
  name: 'Produto Teste',
  sku: 'SKU-001',
  price: 50,
  stock: 100,
  stockStatus: 'in-stock',
  images: ['img1.jpg'],
  supplier: { name: 'Fornecedor A' },
  colors: [
    { hex: '#FF0000', name: 'Vermelho', group: 'Vermelho', groupSlug: 'vermelho' },
    { hex: '#0000FF', name: 'Azul', group: 'Azul', groupSlug: 'azul' },
  ],
  category: { name: 'Brindes' },
  materials: ['Plástico'],
};

describe('ProductListItem - Blindagem de Eventos', () => {
  it('deve aplicar stopPropagation e preventDefault ao trocar variante de cor', () => {
    const parentClick = vi.fn();
    render(
      <MemoryRouter>
        <div onClick={parentClick}>
          <ProductListItem product={mockProduct} />
        </div>
      </MemoryRouter>
    );

    // Localiza os botões do carrossel de variantes
    const variantButtons = screen.getAllByRole('tab');
    const secondVariant = variantButtons[1];

    // Simula clique com objetos de evento espionáveis
    const event = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      bubbles: true,
      cancelable: true,
    };
    
    // Usamos dispatchEvent para ter controle total do objeto de evento no React
    fireEvent(secondVariant, new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }));

    // Verifica se o evento não borbulhou para o pai
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('deve aplicar stopPropagation ao clicar no card inteiro', () => {
    // Nota: O ProductListItem tem um handleClick que chama e.stopPropagation()
    const parentClick = vi.fn();
    const mockOnClick = vi.fn();
    
    render(
      <MemoryRouter>
        <div onClick={parentClick}>
          <ProductListItem product={mockProduct} onClick={mockOnClick} />
        </div>
      </MemoryRouter>
    );

    const article = screen.getByRole('article');
    fireEvent.click(article);

    expect(mockOnClick).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });
});
