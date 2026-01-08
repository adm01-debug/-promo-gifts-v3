import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QuoteTemplateSelector } from '@/components/quotes/QuoteTemplateSelector';
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

describe('QuoteTemplateSelector', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<QuoteTemplateSelector />);
    expect(container).toBeTruthy();
  });
});
