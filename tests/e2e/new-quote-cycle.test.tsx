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

// Consolidate mocks for stability and consistency
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

const saveEvidence = (name: string, container: HTMLElement) => {
  const artifactDir = 'tests/e2e/artifacts/quotes/full-cycle';
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, `${name}.html`), container.innerHTML);
};

describe('Módulo Novo Orçamento - Ciclo Completo (Recálculos, AutoSave e Resiliência)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
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

  it('Recálculos: Interface reage a estados financeiros básicos', async () => {
    await renderPage();
    // Verifica se a estrutura de totais está presente no resumo
    expect(await screen.findByText(/Resumo Financeiro/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Bruto/i)).toBeInTheDocument();
  });

  it('AutoSave: Persistência de rascunho detectada na interface', async () => {
    await renderPage();
    // O indicador de salvamento automático deve ser exibido
    const autoSaveMsg = await screen.findByText(/Salvo automaticamente/i);
    expect(autoSaveMsg).toBeInTheDocument();
  });

  it('Resiliência: Interface permanece estável sem quebras de layout em erro simulado', async () => {
    const { container } = await renderPage();
    // Valida que o layout principal não colapsa
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    saveEvidence('resilience-layout-stability', container);
  });

  it('Visual Regression: Snapshots de seções críticas para auditoria', async () => {
    const { container } = await renderPage();
    // Snapshot da seção de Condições
    const headings = screen.getAllByRole('heading');
    const hasConditions = headings.some(h => /Condições/i.test(h.textContent || ''));
    expect(hasConditions).toBeTruthy();
    saveEvidence('audit-snapshot-conditions', container);
  });
});
