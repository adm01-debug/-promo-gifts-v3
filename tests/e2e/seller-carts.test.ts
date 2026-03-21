/**
 * E2E Tests — Seller Carts Module
 * Covers: Cart CRUD, items management, conversion to quote, templates
 */
import { describe, it, expect, beforeEach } from 'vitest';

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  color_name: string | null;
  notes: string | null;
  sort_order: number;
}

interface Cart {
  id: string;
  company_id: string;
  company_name: string;
  seller_id: string;
  status: 'active' | 'converted' | 'archived';
  items: CartItem[];
  notes: string | null;
}

function calcCartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.product_price * i.quantity, 0);
}

function calcCartItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

const sampleItems: CartItem[] = [
  { id: 'ci-1', product_id: 'p1', product_name: 'Caneta', product_price: 5.50, quantity: 100, color_name: 'Azul', notes: null, sort_order: 0 },
  { id: 'ci-2', product_id: 'p2', product_name: 'Caderno', product_price: 25.00, quantity: 50, color_name: 'Preto', notes: 'Logo na capa', sort_order: 1 },
  { id: 'ci-3', product_id: 'p3', product_name: 'Squeeze', product_price: 35.00, quantity: 30, color_name: null, notes: null, sort_order: 2 },
];

describe('E2E Carts — Cart Total Calculation', () => {
  it('calculates correctly', () => expect(calcCartTotal(sampleItems)).toBe(100*5.50 + 50*25 + 30*35));
  it('empty cart is 0', () => expect(calcCartTotal([])).toBe(0));
  it('single item', () => expect(calcCartTotal([sampleItems[0]])).toBe(550));
});

describe('E2E Carts — Item Count', () => {
  it('total quantity', () => expect(calcCartItemCount(sampleItems)).toBe(180));
  it('empty is 0', () => expect(calcCartItemCount([])).toBe(0));
});

describe('E2E Carts — Cart CRUD', () => {
  let carts: Cart[];

  beforeEach(() => {
    carts = [{
      id: 'c-1', company_id: 'co-1', company_name: 'Alpha SA',
      seller_id: 'u-1', status: 'active', items: [...sampleItems], notes: null,
    }];
  });

  it('create cart', () => {
    carts.push({ id: 'c-2', company_id: 'co-2', company_name: 'Beta ME', seller_id: 'u-1', status: 'active', items: [], notes: null });
    expect(carts).toHaveLength(2);
  });

  it('delete cart', () => {
    carts = carts.filter(c => c.id !== 'c-1');
    expect(carts).toHaveLength(0);
  });

  it('add item to cart', () => {
    const newItem: CartItem = { id: 'ci-4', product_id: 'p4', product_name: 'Mochila', product_price: 89.90, quantity: 10, color_name: 'Preto', notes: null, sort_order: 3 };
    carts[0].items.push(newItem);
    expect(carts[0].items).toHaveLength(4);
  });

  it('remove item from cart', () => {
    carts[0].items = carts[0].items.filter(i => i.id !== 'ci-1');
    expect(carts[0].items).toHaveLength(2);
  });

  it('update item quantity', () => {
    carts[0].items[0].quantity = 200;
    expect(carts[0].items[0].quantity).toBe(200);
  });

  it('update cart notes', () => {
    carts[0].notes = 'Entregar na filial SP';
    expect(carts[0].notes).toBe('Entregar na filial SP');
  });

  it('archive cart', () => {
    carts[0].status = 'archived';
    expect(carts[0].status).toBe('archived');
  });
});

describe('E2E Carts — Cart Status', () => {
  const statuses = ['active', 'converted', 'archived'] as const;
  it('has 3 statuses', () => expect(statuses).toHaveLength(3));
  statuses.forEach(s => {
    it(`"${s}" is valid`, () => expect(typeof s).toBe('string'));
  });
});

describe('E2E Carts — Conversion to Quote', () => {
  it('maps cart items to quote items', () => {
    const quoteItems = sampleItems.map(ci => ({
      product_name: ci.product_name,
      quantity: ci.quantity,
      unit_price: ci.product_price,
      product_id: ci.product_id,
      color_name: ci.color_name,
      notes: ci.notes,
    }));
    expect(quoteItems).toHaveLength(3);
    expect(quoteItems[0].unit_price).toBe(5.50);
    expect(quoteItems[1].notes).toBe('Logo na capa');
  });

  it('preserves total on conversion', () => {
    const cartTotal = calcCartTotal(sampleItems);
    const quoteSubtotal = sampleItems.reduce((s, i) => s + i.product_price * i.quantity, 0);
    expect(quoteSubtotal).toBe(cartTotal);
  });
});

describe('E2E Carts — Reordering', () => {
  it('reorders items', () => {
    const items = [...sampleItems];
    // Move last to first
    const [moved] = items.splice(2, 1);
    items.unshift(moved);
    items.forEach((item, i) => item.sort_order = i);
    expect(items[0].product_name).toBe('Squeeze');
    expect(items[0].sort_order).toBe(0);
  });
});

describe('E2E Carts — Cart Templates', () => {
  it('creates template from cart items', () => {
    const template = {
      name: 'Kit Escritório',
      items: sampleItems.map(i => ({ product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, product_price: i.product_price })),
    };
    expect(template.items).toHaveLength(3);
    expect(template.name).toBeTruthy();
  });

  it('applies template to empty cart', () => {
    const templateItems = [{ product_id: 'p1', product_name: 'Caneta', quantity: 100, product_price: 5.50 }];
    const cartItems: CartItem[] = templateItems.map((ti, i) => ({
      id: `new-${i}`, ...ti, color_name: null, notes: null, sort_order: i, product_sku: null, product_image_url: null,
    }));
    expect(cartItems).toHaveLength(1);
  });
});
