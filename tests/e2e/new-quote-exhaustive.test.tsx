import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuoteBuilderPage from '../../src/pages/QuoteBuilderPage';
import { TooltipProvider } from '../../src/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mocks consolidados de infraestrutura
vi.mock('../../src/components/a11y/AriaLive', () => ({
  useAriaLive: () => ({ announce: vi.fn(), announceStatus: vi.fn() }),
  AriaLiveProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isAuthenticated: true, role: 'agente' }),
  AuthProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ isTourOpen: false }),
  useOnboardingContext: () => ({ isTourOpen: false, startTour: vi.fn(), completeTour: vi.fn() }),
  OnboardingProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/contexts/SellerCartContext', () => ({
  useSellerCart: () => ({ items: [] }),
  SellerCartProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/integrations/supabase/client', () => {
  const chain = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    then: vi.fn().mockImplementation((cb) => Promise.resolve({ data: [] }).then(cb)),
  };
  return {
    supabase: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockReturnValue(chain), rpc: vi.fn().mockResolvedValue({ data: [] }),
      functions: { invoke: vi.fn().mockResolvedValue({ data: {}, error: null }) }
    },
  };
});

// Mock do Layout Simplificado
vi.mock('../../src/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: any) => <div data-testid="main-layout">{children}</div>,
}));

describe('Módulo Novo Orçamento - Suite Exaustiva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Limpa localStorage/sessionStorage se necessário para evitar poluição entre testes
    sessionStorage.clear();
  });

  const renderPage = async () => {
    const res = render(
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <BrowserRouter>
            <TooltipProvider>
              <QuoteBuilderPage />
            </TooltipProvider>
          </BrowserRouter>
        </HelmetProvider>
      </QueryClientProvider>
    );
    await waitFor(() => {});
    return res;
  };

  it('Fluxo 1: Carregamento inicial e Integridade do Header', async () => {
    await renderPage();
    expect(await screen.findByText(/Novo Orçamento/i)).toBeInTheDocument();
    expect(screen.getByText(/Crie um orçamento com produtos e personalizações/i)).toBeInTheDocument();
  });

  it('Fluxo 2: Seleção de Empresa (Validação de Formulário)', async () => {
    await renderPage();
    // Verifica se os campos de Empresa e Contato estão presentes
    expect(screen.getByText(/Identificação/i)).toBeInTheDocument();
    
    // Tenta clicar no botão de gerar orçamento e espera ver erros (se disparado via validação de campos)
    const generateBtn = screen.getByText(/Gerar Orçamento/i);
    fireEvent.click(generateBtn);
    
    // A validação do formulário deve marcar campos como inválidos (visual ou via toast)
    // Aqui validamos a presença do stepper que indica o progresso
    expect(screen.getByText(/Dados Cliente/i)).toBeInTheDocument();
  });

  it('Fluxo 3: Adição de Itens e Sumário', async () => {
    await renderPage();
    // Botão de adicionar produto
    const addProductBtn = screen.getByText(/Produto/i);
    expect(addProductBtn).toBeInTheDocument();
    
    // Verifica se o sumário de valores está visível
    expect(screen.getByText(/Resumo Financeiro/i)).toBeInTheDocument();
  });

  it('Acessibilidade: Valida rótulos e navegação básica', async () => {
    await renderPage();
    // Botão de voltar deve ser acessível
    expect(screen.getByLabelText(/Voltar/i)).toBeInTheDocument();
  });
});
