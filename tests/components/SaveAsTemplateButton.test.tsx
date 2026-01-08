import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SaveAsTemplateButton } from '@/components/quotes/SaveAsTemplateButton';
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

describe('SaveAsTemplateButton', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<SaveAsTemplateButton quoteId="test-id" />);
    expect(container).toBeTruthy();
  });
});
