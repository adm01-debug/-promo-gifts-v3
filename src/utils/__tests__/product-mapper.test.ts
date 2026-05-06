import { describe, it, expect, vi } from 'vitest';
import { mapPromobrindToProduct } from '../product-mapper';

// Partial mock for PromobrindProduct
const createMockRawProduct = (overrides = {}): any => ({
  id: 'prod-123',
  name: 'Brinde Teste',
  sku: 'SKU-001',
  price_updated_at: '2026-01-01T10:00:00Z',
  colors: [
    { name: 'Azul', hex: '#0000FF', stock: 50 },
    { name: 'Vermelho', hex: '#FF0000', stock: 0 },
  ],
  is_active: true,
  ...overrides,
});

// Mock external-db helpers used by mapper
vi.mock('../lib/external-db', () => ({
  getProductImageUrl: vi.fn((p) => p.image_url || null),
  getProductPrice: vi.fn((p) => p.price || 99.9),
  getProductStock: vi.fn((p) =>
    (p.colors || []).reduce((acc: number, c: any) => acc + (c.stock || 0), 0),
  ),
}));

describe('mapPromobrindToProduct', () => {
  it('should map basic fields correctly', () => {
    const raw = createMockRawProduct();
    const result = mapPromobrindToProduct(raw);

    expect(result.id).toBe('prod-123');
    expect(result.name).toBe('Brinde Teste');
    expect(result.sku).toBe('SKU-001');
    expect(result.price).toBe(99.9);
  });

  it('should calculate stock correctly from colors', () => {
    const raw = createMockRawProduct();
    const result = mapPromobrindToProduct(raw);

    expect(result.stock).toBe(50);
    expect(result.stockStatus).toBe('in-stock');
  });

  it('should handle low stock status', () => {
    const raw = createMockRawProduct({
      colors: [{ name: 'Azul', hex: '#0000FF', stock: 5 }],
    });
    const result = mapPromobrindToProduct(raw);

    expect(result.stockStatus).toBe('low-stock');
  });

  it('should handle out of stock status', () => {
    const raw = createMockRawProduct({
      colors: [{ name: 'Azul', hex: '#0000FF', stock: 0 }],
    });
    const result = mapPromobrindToProduct(raw);

    expect(result.stockStatus).toBe('out-of-stock');
  });

  it('should prioritize price_updated_at over updated_at', () => {
    const raw = createMockRawProduct({
      price_updated_at: '2026-05-01',
      updated_at: '2026-01-01',
    });
    const result = mapPromobrindToProduct(raw);

    expect(result.priceUpdatedAt).toBe('2026-05-01');
  });

  it('should fallback to updated_at if price_updated_at is missing', () => {
    const raw = createMockRawProduct({
      price_updated_at: '',
      updated_at: '2026-02-02',
    });
    const result = mapPromobrindToProduct(raw);

    expect(result.priceUpdatedAt).toBe('2026-02-02');
  });

  it('should create variations from colors array', () => {
    const raw = createMockRawProduct();
    const result = mapPromobrindToProduct(raw);

    expect(result.variations).toHaveLength(2);
    expect(result.variations![0].color.name).toBe('Azul');
    expect(result.variations![1].color.hex).toBe('#FF0000');
  });
});
