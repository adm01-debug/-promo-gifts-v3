import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Auth from '../pages/Auth';
import { StatCard } from '../components/inventory/StockStatCard';
import { AuthProvider } from '../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { HelmetProvider } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { ip: '127.0.0.1', city: 'Test' }, error: null })),
    },
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            {ui}
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

describe('Design System Consistency (Auth & Inventory)', () => {
  it('Auth page inputs should have rounded-lg class', async () => {
    renderWithProviders(<Auth />);
    
    await waitFor(() => {
      const emailInput = screen.getByTestId('login-email-input');
      const passwordInput = screen.getByTestId('login-password-input');
      
      expect(emailInput).toHaveClass('rounded-lg');
      expect(passwordInput).toHaveClass('rounded-lg');
    });
  });

  it('Auth page submit button should have rounded-lg class', async () => {
    renderWithProviders(<Auth />);
    
    await waitFor(() => {
      const submitButton = screen.getByTestId('login-submit');
      expect(submitButton).toHaveClass('rounded-lg');
    });
  });

  it('StockStatCard button should have rounded-lg class', () => {
    render(
      <StatCard 
        title="Test Stat" 
        value="100" 
        icon={<Package />} 
      />
    );
    
    const cardButton = screen.getByRole('button');
    expect(cardButton).toHaveClass('rounded-lg');
  });

  it('Card and CardContent should have rounded-lg class', () => {
    render(
      <Card data-testid="test-card">
        <CardContent data-testid="test-card-content">Content</CardContent>
      </Card>
    );
    
    expect(screen.getByTestId('test-card')).toHaveClass('rounded-lg');
    expect(screen.getByTestId('test-card-content')).toHaveClass('rounded-lg');
  });

  it('Badge should have rounded-lg class in all variants', () => {
    const variants = ['default', 'secondary', 'destructive', 'outline', 'gradient'] as const;
    
    variants.forEach(variant => {
      const { unmount } = render(<Badge variant={variant} data-testid={`badge-${variant}`}>Badge</Badge>);
      expect(screen.getByTestId(`badge-${variant}`)).toHaveClass('rounded-lg');
      unmount();
    });
  });

  it('Textarea should have rounded-lg class', () => {
    render(<Textarea data-testid="test-textarea" />);
    expect(screen.getByTestId('test-textarea')).toHaveClass('rounded-lg');
  });

  it('Select components should have rounded-lg class', () => {
    render(
      <Select>
        <SelectTrigger data-testid="select-trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent data-testid="select-content">
          <SelectItem value="item1" data-testid="select-item">Item 1</SelectItem>
        </SelectContent>
      </Select>
    );
    
    expect(screen.getByTestId('select-trigger')).toHaveClass('rounded-lg');
    // Content and Items might need to be open to be in the DOM if we were doing integration, 
    // but these are unit-like tests for the components themselves.
    // However, SelectContent is rendered in a Portal, so we might need a different approach if it's not in the DOM.
  });
});
