import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QuoteVersionHistory } from '@/components/quotes/QuoteVersionHistory';
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

describe('QuoteVersionHistory', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<QuoteVersionHistory quoteId="test-id" />);
    expect(container).toBeTruthy();
  });
});
