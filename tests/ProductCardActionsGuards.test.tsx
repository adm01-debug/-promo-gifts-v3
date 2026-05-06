import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCardActions } from '../src/components/products/ProductCardActions';

// Mocks simples para componentes Radix/UI
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
}));

vi.mock('../src/components/products/QuickAddToQuote', () => ({
  QuickAddToQuote: ({ onClick }: any) => (
    <div data-testid="quick-add-to-quote" onClick={onClick}>QuickAdd</div>
  ),
}));

describe('ProductCardActions - Blindagem de Eventos', () => {
  const defaultProps = {
    productId: '123',
    productName: 'Produto Teste',
    productPrice: 100,
    productMinQuantity: 1,
    isFavorited: false,
    isInCompare: false,
    canAddToCompare: true,
    actionsOpen: true, // Começa aberto para facilitar testes de botões internos
    onToggleActions: vi.fn(),
    onFavorite: vi.fn(),
    onCompare: vi.fn(),
    onOpenVariantPicker: vi.fn(),
    onQuickView: vi.fn(),
    markBusy: vi.fn(),
  };

  it('deve aplicar stopPropagation ao clicar no toggle de ações', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <ProductCardActions {...defaultProps} actionsOpen={false} />
      </div>
    );

    const toggle = screen.getByTestId('product-card-actions-toggle');
    fireEvent.click(toggle);

    expect(defaultProps.onToggleActions).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('deve aplicar stopPropagation ao clicar no botão de favoritar', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <ProductCardActions {...defaultProps} />
      </div>
    );

    const favBtn = screen.getByTestId('product-card-favorite');
    fireEvent.click(favBtn);

    expect(defaultProps.onFavorite).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('deve aplicar stopPropagation ao clicar no botão de comparação', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <ProductCardActions {...defaultProps} />
      </div>
    );

    const compareBtn = screen.getByLabelText(/Adicionar à comparação/i);
    fireEvent.click(compareBtn);

    expect(defaultProps.onCompare).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('deve aplicar stopPropagation ao clicar no botão de coleção', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <ProductCardActions {...defaultProps} />
      </div>
    );

    const collBtn = screen.getByTestId('product-card-collection');
    fireEvent.click(collBtn);

    expect(defaultProps.onOpenVariantPicker).toHaveBeenCalledWith('collection');
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('deve aplicar stopPropagation ao clicar no botão de compartilhamento', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <ProductCardActions {...defaultProps} />
      </div>
    );

    const shareBtn = screen.getByTestId('product-card-share');
    fireEvent.click(shareBtn);

    expect(defaultProps.onOpenVariantPicker).toHaveBeenCalledWith('share');
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('deve aplicar stopPropagation ao clicar no botão de visualização rápida', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <ProductCardActions {...defaultProps} />
      </div>
    );

    const qvBtn = screen.getByTestId('product-card-quickview');
    fireEvent.click(qvBtn);

    expect(defaultProps.onQuickView).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });
});
