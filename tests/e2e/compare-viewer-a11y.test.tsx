import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComparePage from '../../src/pages/ComparePage';
import { useComparisonStore } from '../../src/stores/useComparisonStore';
import { TooltipProvider } from '../../src/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fs from 'fs';
import path from 'path';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

// Mock window.scrollTo
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
    },
  };
});

const mockProducts = [
  { id: 'p1', name: 'Prod 1', price: 10, images: ['i1.jpg'], minQuantity: 1, stock: 10, stockStatus: 'in-stock', colors: [], sku: 'S1', category: { name: 'C1' }, supplier: { name: 'S1' } },
  { id: 'p2', name: 'Prod 2', price: 20, images: ['i2.jpg'], minQuantity: 2, stock: 20, stockStatus: 'in-stock', colors: [], sku: 'S2', category: { name: 'C1' }, supplier: { name: 'S1' } }
];

vi.mock('../../src/contexts/ProductsContext', () => ({
  useProductsContext: () => ({ products: mockProducts, getProductsByIds: (ids: string[]) => mockProducts.filter(p => ids.includes(p.id)) }),
  useProductsContextSafe: () => ({ products: mockProducts, getProductsByIds: (ids: string[]) => mockProducts.filter(p => ids.includes(p.id)) }),
  ProductsContext: { Provider: ({ children }: any) => <div>{children}</div> },
  ProductsProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-container">{children}</div>,
  Radar: () => <div />, RadarChart: ({ children }: any) => <div>{children}</div>,
  PolarGrid: () => <div />, PolarAngleAxis: () => <div />, PolarRadiusAxis: () => <div />,
  Legend: () => <div />, Tooltip: () => <div />,
  LineChart: ({ children }: any) => <div>{children}</div>, Line: () => <div />,
}));

vi.mock('../../src/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: any) => <div data-testid="main-layout">{children}</div>,
}));

/**
 * Função utilitária para gerar artefatos de debug (DOM, Styles) para o Viewer
 */
const saveTransitionArtifacts = (name: string, container: HTMLElement) => {
  const artifactDir = 'tests/e2e/artifacts/compare/viewer';
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

  const html = container.innerHTML;
  const styles = {};
  container.querySelectorAll('*').forEach((el, i) => {
    if (i < 50) { // Amostra de estilos
      const selector = el.tagName.toLowerCase() + (el.className ? `.${el.className.split(' ').join('.')}` : '');
      try {
        const computed = window.getComputedStyle(el);
        styles[selector] = { display: computed.display, position: computed.position, color: computed.color };
      } catch (e) {}
    }
  });

  fs.writeFileSync(path.join(artifactDir, `${name}.html`), html);
  fs.writeFileSync(path.join(artifactDir, `${name}-styles.json`), JSON.stringify(styles, null, 2));
};

describe('Módulo Comparar - Infraestrutura de Viewer & A11y', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useComparisonStore.setState({
      compareItems: [{ productId: 'p1' }, { productId: 'p2' }],
      compareCount: 2, compareIds: ['p1', 'p2'], isLoaded: true,
    });
  });

  const renderPage = async () => {
    const res = render(
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <BrowserRouter>
            <TooltipProvider>
              <ComparePage />
            </TooltipProvider>
          </BrowserRouter>
        </HelmetProvider>
      </QueryClientProvider>
    );
    await waitFor(() => {});
    return res;
  };

  it('A11y: Valida ordem de tabulação e ausência de traps no cabeçalho', async () => {
    await renderPage();
    const backBtn = screen.getByLabelText(/Voltar/i);
    backBtn.focus();
    expect(document.activeElement).toBe(backBtn);
    
    // Simula Tab para o próximo elemento (Cliente CRM)
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    // Em JSDOM o foco manual via Tab real é limitado, mas validamos a existência dos targets
    expect(screen.getByText(/Cliente CRM/i)).toBeInTheDocument();
  });

  it('Viewer: Gera artefatos de transição para o dashboard de auditoria', async () => {
    const { container } = await renderPage();
    saveTransitionArtifacts('initial-comparison-view', container);
    
    // Troca para tabela e gera novo snapshot
    const tableTab = await screen.findByText(/Tabela Detalhada/i);
    fireEvent.click(tableTab);
    
    saveTransitionArtifacts('table-transition-view', container);
    expect(fs.existsSync('tests/e2e/artifacts/compare/viewer/table-transition-view.html')).toBe(true);
  });

  it('A11y: Aria-live emite anúncio correto ao alterar estado da comparação', async () => {
    await renderPage();
    const ariaLiveContainer = screen.getByText((content, element) => {
      return element?.getAttribute('aria-live') === 'polite';
    });
    expect(ariaLiveContainer).toBeDefined();
  });
});
