import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProductGrid } from '@/components/products/ProductGrid';
import { BrowserRouter } from 'react-router-dom';

describe('ProductGrid', () => {
  it('renders with empty products', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductGrid products={[]} />
      </BrowserRouter>
    );
    expect(container).toBeTruthy();
  });
});
