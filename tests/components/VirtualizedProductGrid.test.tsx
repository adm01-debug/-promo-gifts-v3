import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VirtualizedProductGrid } from '@/components/products/VirtualizedProductGrid';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('VirtualizedProductGrid', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<VirtualizedProductGrid products={[]} />);
    expect(container).toBeTruthy();
  });
});
