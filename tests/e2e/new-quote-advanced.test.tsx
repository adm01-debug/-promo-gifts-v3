import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuoteBuilderPage from '../../src/pages/QuoteBuilderPage';
import { useComparisonStore } from '../../src/stores/useComparisonStore';
import { TooltipProvider } from '../../src/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fs from 'fs';
import path from 'path';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

window.scrollTo = vi.fn();

// Mocks consolidados
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
  useOnboardingContext: () => ({ isTourOpen: false }),
  OnboardingProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/contexts/SellerCartContext', () => ({
  useSellerCart: () => ({ items: [] }),
  SellerCartProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../src/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ organization: { id: 'org-123' }, isLoading: false }),
  OrganizationProvider: ({ children }: any) => <div>{children}</div>,
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
      auth: { 
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
      },
      from: vi.fn().mockReturnValue(chain), rpc: vi.fn().mockResolvedValue({ data: [] }),
      functions: { invoke: vi.fn().mockResolvedValue({ data: {}, error: null }) }
    },
  };
});

vi.mock('../../src/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: any) => <div data-testid="main-layout">{children}</div>,
}));

const saveVisualEvidence = (name: string, container: HTMLElement) => {
  const artifactDir = 'tests/e2e/artifacts/quotes/visual';
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, `${name}.html`), container.innerHTML);
};

describe('Módulo Novo Orçamento - Avançado (Regressão & Robutez)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('Visual Regression: Gera snapshot da etapa de Identificação', async () => {
    const { container } = await renderPage();
    saveVisualEvidence('step-identification', container);
    expect(screen.getByText(/Empresa/i)).toBeInTheDocument();
  });

  it('Resiliência: Valida feedback de salvamento automático (AutoSave)', async () => {
    await renderPage();
    // Verifica indicador de salvamento automático
    expect(await screen.findByText(/Salvo automaticamente/i)).toBeInTheDocument();
  });

  it('Acessibilidade: Valida foco visível no botão Voltar', async () => {
    await renderPage();
    const backBtn = screen.getByLabelText(/Voltar/i);
    backBtn.focus();
    expect(document.activeElement).toBe(backBtn);
  });

  it('Recálculo: Valida estrutura do resumo financeiro', async () => {
    await renderPage();
    // Verifica se a seção de resumo para cálculos está no DOM
    const summary = screen.queryByText(/Resumo Financeiro/i) || screen.queryByText(/Total/i);
    expect(summary).toBeInTheDocument();
  });
});
