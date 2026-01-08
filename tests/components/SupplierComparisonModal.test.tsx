import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SupplierComparisonModal } from '@/components/compare/SupplierComparisonModal';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('SupplierComparisonModal', () => {
  it('renders when closed', () => {
    const { container } = renderWithProviders(
      <SupplierComparisonModal 
        productId="test-123"
        open={false}
        onOpenChange={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});
