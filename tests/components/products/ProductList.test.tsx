import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProductList } from '@/components/products/ProductList';
import { BrowserRouter } from 'react-router-dom';

describe('ProductList', () => {
  it('renders with empty products', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductList products={[]} />
      </BrowserRouter>
    );
    expect(container).toBeTruthy();
  });
});
