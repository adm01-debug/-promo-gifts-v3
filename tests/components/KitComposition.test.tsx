import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { KitComposition } from '@/components/products/KitComposition';
import type { KitComponent } from '@/types/product-catalog';

function makeItem(overrides: Partial<KitComponent> = {}): KitComponent {
  return {
    id: 'item-1',
    productId: 'prod-1',
    productName: 'Caneca Cerâmica',
    quantity: 2,
    sku: 'CAN-001',
    imageUrl: null,
    isOptional: false,
    isPackaging: false,
    isReplaceable: false,
    allowsPersonalization: false,
    material: null,
    weightG: null,
    ...overrides,
  };
}

const PACKAGING = makeItem({ id: 'pkg-1', productId: 'pkg-prod', productName: 'Caixa Kraft', sku: 'CX-001', isPackaging: true, quantity: 1, weightG: 200 });
const ITEM_A = makeItem({ id: 'a', productName: 'Caderno A5', sku: 'CAD-A5', quantity: 1, weightG: 250, material: 'Papel', allowsPersonalization: true });
const ITEM_B = makeItem({ id: 'b', productName: 'Caneta Metal', sku: 'CAN-MET', quantity: 3, isOptional: true, isReplaceable: true, weightG: 35 });
const ITEM_C = makeItem({ id: 'c', productName: 'Garrafa 500ml', sku: 'GAR-500', quantity: 1, weightG: 1200 });

describe('KitComposition', () => {
  // ──────── Rendering ────────

  it('renders header with correct component and piece counts', () => {
    render(<KitComposition items={[PACKAGING, ITEM_A, ITEM_B]} />);
    expect(screen.getByText(/3\s*componentes/i)).toBeInTheDocument();
    // total pieces: 1 + 1 + 3 = 5
    expect(screen.getByText(/5\s*peças/i)).toBeInTheDocument();
  });

  it('renders singular "componente" and "peça" for single item', () => {
    const single = makeItem({ quantity: 1 });
    render(<KitComposition items={[single]} />);
    expect(screen.getByText(/1\s*componente/i)).toBeInTheDocument();
    expect(screen.getByText(/1\s*peça/i)).toBeInTheDocument();
  });

  it('displays total weight in grams when < 1000g', () => {
    render(<KitComposition items={[PACKAGING, ITEM_A]} />);
    // 200 + 250 = 450g
    expect(screen.getByText('450 g')).toBeInTheDocument();
  });

  it('displays total weight in kg when >= 1000g', () => {
    render(<KitComposition items={[ITEM_C]} />);
    expect(screen.getByText('1.2 kg')).toBeInTheDocument();
  });

  it('does not show weight badge when all items have 0 weight', () => {
    const noWeight = makeItem({ weightG: 0, id: 'nw' });
    render(<KitComposition items={[noWeight]} />);
    expect(screen.queryByText(/\d+\s*[gk]/)).toBeNull();
  });

  it('separates packaging and product items into sections', () => {
    render(<KitComposition items={[PACKAGING, ITEM_A, ITEM_B]} />);
    expect(screen.getByText('Embalagem')).toBeInTheDocument();
    expect(screen.getByText('Itens do Kit')).toBeInTheDocument();
  });

  it('does not show "Itens do Kit" section header when no packaging', () => {
    render(<KitComposition items={[ITEM_A, ITEM_B]} />);
    expect(screen.queryByText('Itens do Kit')).toBeNull();
  });

  it('renders SKU for each item', () => {
    render(<KitComposition items={[ITEM_A]} />);
    expect(screen.getByText('CAD-A5')).toBeInTheDocument();
  });

  it('renders dash when sku is empty', () => {
    const noSku = makeItem({ id: 'ns', sku: '' });
    render(<KitComposition items={[noSku]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders material when present', () => {
    render(<KitComposition items={[ITEM_A]} />);
    expect(screen.getByText('Papel')).toBeInTheDocument();
  });

  it('renders quantity badge', () => {
    render(<KitComposition items={[ITEM_B]} />);
    expect(screen.getByText('3x')).toBeInTheDocument();
  });

  // ──────── Badges ────────

  it('renders "Embalagem" badge for packaging item', () => {
    render(<KitComposition items={[PACKAGING]} />);
    // Badge text inside the card (not the section header)
    const badges = screen.getAllByText('Embalagem');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders "Opcional" badge', () => {
    render(<KitComposition items={[ITEM_B]} />);
    expect(screen.getByText('Opcional')).toBeInTheDocument();
  });

  it('renders "Substituível" badge', () => {
    render(<KitComposition items={[ITEM_B]} />);
    expect(screen.getByText('Substituível')).toBeInTheDocument();
  });

  it('renders "Personalizável" badge', () => {
    render(<KitComposition items={[ITEM_A]} />);
    expect(screen.getByText('Personalizável')).toBeInTheDocument();
  });

  // ──────── Images ────────

  it('renders product image when imageUrl is provided', () => {
    const withImg = makeItem({ id: 'img', imageUrl: 'https://example.com/img.jpg', productName: 'Prod Img' });
    render(<KitComposition items={[withImg]} />);
    const img = screen.getByAltText('Prod Img');
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('renders fallback icon when imageUrl is null', () => {
    render(<KitComposition items={[ITEM_A]} />);
    // The ImageIcon svg should be rendered - just check no <img> with alt "Caderno A5"
    expect(screen.queryByAltText('Caderno A5')).toBeNull();
  });

  // ──────── Selection ────────

  it('does not show selection bar when onSelectItems is not provided', () => {
    render(<KitComposition items={[ITEM_A]} />);
    expect(screen.queryByText(/selecionados/i)).toBeNull();
  });

  it('shows selection bar when onSelectItems is provided', () => {
    const onSelect = vi.fn();
    render(<KitComposition items={[ITEM_A, ITEM_B]} onSelectItems={onSelect} />);
    expect(screen.getByText(/0 de 2 selecionados/i)).toBeInTheDocument();
  });

  it('selects an item on click and calls onSelectItems', () => {
    const onSelect = vi.fn();
    render(<KitComposition items={[ITEM_A, ITEM_B]} onSelectItems={onSelect} />);
    
    // Click on item A
    fireEvent.click(screen.getByText('Caderno A5'));
    expect(onSelect).toHaveBeenCalledWith([ITEM_A]);
    expect(screen.getByText(/1 de 2 selecionados/i)).toBeInTheDocument();
  });

  it('deselects an item on second click', () => {
    const onSelect = vi.fn();
    render(<KitComposition items={[ITEM_A, ITEM_B]} onSelectItems={onSelect} />);
    
    fireEvent.click(screen.getByText('Caderno A5'));
    fireEvent.click(screen.getByText('Caderno A5'));
    expect(onSelect).toHaveBeenLastCalledWith([]);
    expect(screen.getByText(/0 de 2 selecionados/i)).toBeInTheDocument();
  });

  it('select all / deselect all works', () => {
    const onSelect = vi.fn();
    render(<KitComposition items={[ITEM_A, ITEM_B]} onSelectItems={onSelect} />);
    
    fireEvent.click(screen.getByText('Selecionar Todos'));
    expect(onSelect).toHaveBeenCalledWith([ITEM_A, ITEM_B]);
    expect(screen.getByText(/2 de 2 selecionados/i)).toBeInTheDocument();

    // Now deselect all
    fireEvent.click(screen.getByText('Desmarcar'));
    expect(onSelect).toHaveBeenLastCalledWith([]);
  });

  // ──────── View product button ────────

  it('does not render view button when onViewProduct is not provided', () => {
    render(<KitComposition items={[ITEM_A]} />);
    expect(screen.queryByRole('button', { name: /ver produto/i })).toBeNull();
  });

  // ──────── Collapsible ────────

  it('starts expanded by default', () => {
    render(<KitComposition items={[ITEM_A]} />);
    expect(screen.getByText('Caderno A5')).toBeVisible();
  });

  // ──────── Edge cases ────────

  it('renders with empty items array', () => {
    render(<KitComposition items={[]} />);
    expect(screen.getByText(/0\s*componentes/i)).toBeInTheDocument();
  });

  it('handles null weightG gracefully', () => {
    const noWeight = makeItem({ id: 'nw', weightG: null });
    render(<KitComposition items={[noWeight]} />);
    // Should not crash, no weight displayed
    expect(screen.getByText('Caneca Cerâmica')).toBeInTheDocument();
  });

  it('handles undefined optional fields', () => {
    const minimal: KitComponent = {
      id: 'min',
      productId: 'min-prod',
      productName: 'Minimal',
      quantity: 1,
      sku: 'MIN-001',
    };
    render(<KitComposition items={[minimal]} />);
    expect(screen.getByText('Minimal')).toBeInTheDocument();
  });

  it('correctly calculates weight with multiple quantities', () => {
    // ITEM_B has weightG=35 and quantity=3 => 105g
    render(<KitComposition items={[ITEM_B]} />);
    expect(screen.getByText('105 g')).toBeInTheDocument();
  });

  it('handles all items being packaging', () => {
    const pkg2 = makeItem({ id: 'pkg-2', productName: 'Tampa', isPackaging: true, quantity: 1 });
    render(<KitComposition items={[PACKAGING, pkg2]} />);
    expect(screen.getByText('Embalagem')).toBeInTheDocument();
    expect(screen.queryByText('Itens do Kit')).toBeNull();
  });

  it('handles very large quantities', () => {
    const large = makeItem({ id: 'lg', quantity: 9999 });
    render(<KitComposition items={[large]} />);
    expect(screen.getByText('9999x')).toBeInTheDocument();
  });
});
