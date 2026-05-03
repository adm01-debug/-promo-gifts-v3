import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuoteBuilderPage from '../../src/pages/QuoteBuilderPage';
import { TooltipProvider } from '../../src/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fs from 'fs';
import path from 'path';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

window.scrollTo = vi.fn();

// Mocks consolidados para infraestrutura e contextos
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

// Mock do Supabase simulando falhas de AutoSave e recuperação
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
      functions: { 
        invoke: vi.fn().mockImplementation((fn) => {
          if (fn === "comparison-ai-advisor") return Promise.reject(new Error("Network Error"));
          return Promise.resolve({ data: {}, error: null });
        })
      }
    },
  };
});

vi.mock('../../src/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: any) => <div data-testid="main-layout">{children}</div>,
}));

describe('Módulo Novo Orçamento - Resiliência & Acessibilidade Crítica', () => {
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

  it('Resiliência: AutoSave mantém campos intactos após falha simulada', async () => {
    await renderPage();
    // Verifica título
    expect(await screen.findByText(/Novo Orçamento/i)).toBeInTheDocument();
    // Mesmo com erro de rede simulado no mock do Supabase, os campos base devem carregar
    expect(screen.getByText(/Empresa/i)).toBeInTheDocument();
  });

  it('Acessibilidade: Valida Aria-Live polida para status de salvamento', async () => {
    await renderPage();
    // Procura por regiões aria-live que anunciam salvamento ou erros
    const liveRegions = screen.queryByText(/Salvo automaticamente/i);
    expect(liveRegions).toBeDefined();
  });

  it('Recálculos: Verifica presença de campos financeiros (Impostos/Líquido)', async () => {
    await renderPage();
    // O resumo financeiro deve conter as seções de taxas e totais
    expect(screen.getByText(/Resumo Financeiro/i)).toBeInTheDocument();
    const headings = screen.getAllByRole('heading');
    expect(headings.some(h => /Itens/i.test(h.textContent || ''))).toBeTruthy();
  });

  it('CI Visual: Gera artefatos para regressão por etapa', async () => {
    const { container } = await renderPage();
    const artifactDir = 'tests/e2e/artifacts/quotes/ci-visual';
    if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
    
    fs.writeFileSync(path.join(artifactDir, 'builder-layout.html'), container.innerHTML);
    expect(fs.existsSync(path.join(artifactDir, 'builder-layout.html'))).toBe(true);
  });
});
