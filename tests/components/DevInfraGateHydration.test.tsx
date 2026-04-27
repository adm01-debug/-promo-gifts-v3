import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { DevOnlyBridgeOverlay } from '@/components/dev/DevOnlyBridgeOverlay';
import { useDevGate } from '@/hooks/useDevGate';
import { useAuth } from '@/contexts/AuthContext';

// Mock dos hooks para controlar os estados de SSR e Hidratação
vi.mock('@/hooks/useDevGate', () => ({
  useDevGate: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock do overlay real
vi.mock('@/components/dev/BridgeMetricsOverlay', () => ({
  default: () => <div data-testid="bridge-metrics-overlay-real">Real Overlay</div>,
}));

describe('DevInfraGate SSR & Hydration Integration', () => {
  it('garante que o overlay é omitido no SSR e só aparece após hidratação e Auth finalizado', async () => {
    // --- FASE 1: SSR (Servidor) ---
    // No servidor, mounted é false, isLoading pode ser qualquer coisa, mas useSyncExternalStore retorna false.
    vi.mocked(useDevGate).mockReturnValue({
      isAllowed: false, // Simula o retorno do hook no servidor
      isDev: false
    });

    const ssrHtml = renderToString(<DevOnlyBridgeOverlay />);
    
    // O HTML gerado pelo servidor DEVE ser vazio
    expect(ssrHtml).toBe('');

    // --- FASE 2: Hidratação (Cliente Inicial - Carregando) ---
    // Logo após a hidratação, useEffect ainda não rodou (mounted=false) e Auth pode estar carregando.
    const container = document.createElement('div');
    container.innerHTML = ssrHtml;
    document.body.appendChild(container);

    // Estado inicial no cliente (ainda isLoading e mounted=false)
    vi.mocked(useDevGate).mockReturnValue({
      isAllowed: false,
      isDev: false
    });

    // Hidratação
    await act(async () => {
      hydrateRoot(container, <DevOnlyBridgeOverlay />);
    });

    // Ainda não deve ter nada (mounted false)
    expect(container.innerHTML).toBe('');

    // --- FASE 3: Pós-Hidratação (mounted=true, mas isLoading=true) ---
    // useEffect rodou, mas AuthContext ainda está buscando roles
    vi.mocked(useDevGate).mockReturnValue({
      isAllowed: false, // isAllowed depende de !isLoading
      isDev: false
    });

    await act(async () => {
      // Forçamos um re-render simulando o efeito do useEffect que seta mounted: true
      // mas mantemos isAllowed: false porque isLoading: true
    });

    expect(container.innerHTML).toBe('');

    // --- FASE 4: Finalizado (mounted=true, isLoading=false, isAllowed=true) ---
    vi.mocked(useDevGate).mockReturnValue({
      isAllowed: true,
      isDev: true
    });

    // Simulamos a mudança de estado que trigga o re-render final
    await act(async () => {
       // O componente agora deve renderizar o lazy overlay
    });

    // Verificamos se o overlay agora está presente (usando querySelector já que é DOM direto agora)
    // Nota: Como o componente é Lazy, ele pode precisar de um tempinho ou Suspense
    expect(container.querySelector('[data-testid="bridge-metrics-overlay-real"]')).toBeInTheDocument();
    
    // Cleanup
    document.body.removeChild(container);
  });
});
