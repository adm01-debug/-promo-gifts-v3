import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProductCard } from '@/components/products/ProductCard';
import { BrowserRouter } from 'react-router-dom';

const mockProduct = {
  id: '1',
  name: 'Test Product',
  sku: 'TEST-001',
  price: 100,
  images: [{ url: '/test.jpg', alt: 'Test' }],
  category: 'Test',
  description: 'Test description',
  stock: 10,
  colors: [],
  materials: [],
  minQuantity: 1,
};

describe('ProductCard', () => {
  it('renders', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );
    expect(container).toBeTruthy();
  });
});
