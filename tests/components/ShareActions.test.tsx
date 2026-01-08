import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ShareActions } from '@/components/products/ShareActions';

const mockProduct = {
  id: '1',
  name: 'Test Product',
  sku: 'TEST-001',
  price: 100,
  images: [{ url: '/test.jpg', alt: 'Test' }],
  category: 'Test',
  description: 'Test description',
  stock: 10,
  colors: [{ name: 'Preto', hex: '#000000' }],
  materials: [],
  minQuantity: 1,
};

describe('ShareActions', () => {
  it('renders without crashing', () => {
    const { container } = render(<ShareActions product={mockProduct} />);
    expect(container).toBeTruthy();
  });
});
