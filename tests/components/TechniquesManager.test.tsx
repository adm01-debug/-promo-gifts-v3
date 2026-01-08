import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TechniquesManager } from '@/components/admin/TechniquesManager';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('TechniquesManager', () => {
  it('renders', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TechniquesManager />
      </QueryClientProvider>
    );
    expect(container).toBeTruthy();
  });
});
