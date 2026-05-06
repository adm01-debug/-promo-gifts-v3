import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Auth from '../pages/Auth';
import { StatCard } from '../components/inventory/StockStatCard';
import { AuthProvider } from '../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { HelmetProvider } from 'react-helmet-async';

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
      
      // Checking for rounded-lg class which is the design system standard
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
});
