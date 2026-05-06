import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Auth from './Auth';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { ip: '127.0.0.1', city: 'Test' }, error: null })),
    },
  },
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
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

describe('Auth Page (Login Flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', async () => {
    renderWithProviders(<Auth />);
    
    await waitFor(() => {
      expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-submit')).toBeInTheDocument();
    });
  });

  it('shows error messages for empty fields', async () => {
    renderWithProviders(<Auth />);
    
    await waitFor(() => {
      const submitButton = screen.getByTestId('login-submit');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/O e-mail é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/A senha é obrigatória/i)).toBeInTheDocument();
    });
  });

  it('shows error message for invalid email format', async () => {
    renderWithProviders(<Auth />);
    
    await waitFor(() => {
      const emailInput = screen.getByTestId('login-email-input');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      const submitButton = screen.getByTestId('login-submit');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Por favor, insira um endereço de e-mail válido/i)).toBeInTheDocument();
    });
  });

  it('shows error for short password', async () => {
    renderWithProviders(<Auth />);
    
    await waitFor(() => {
      const emailInput = screen.getByTestId('login-email-input');
      const passwordInput = screen.getByTestId('login-password-input');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      const submitButton = screen.getByTestId('login-submit');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/A senha deve conter no mínimo 6 caracteres/i)).toBeInTheDocument();
    });
  });

  it('renders Button and Input with rounded-lg class', async () => {
    renderWithProviders(<Auth />);
    
    await waitFor(() => {
      const emailInput = screen.getByTestId('login-email-input');
      const submitButton = screen.getByTestId('login-submit');
      
      expect(emailInput).toHaveClass('rounded-lg');
      expect(submitButton).toHaveClass('rounded-lg');
    });
  });
});
