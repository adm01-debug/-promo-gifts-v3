import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ShareActions } from '@/components/common/ShareActions';
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

describe('ShareActions', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<ShareActions />);
    expect(container).toBeTruthy();
  });
});
