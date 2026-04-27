import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { render, screen, act } from '@testing-library/react';
import { DevOnlyBridgeOverlay } from '@/components/dev/DevOnlyBridgeOverlay';
import { useDevGate } from '@/hooks/useDevGate';

// Mock dos hooks
vi.mock('@/hooks/useDevGate', () => ({
  useDevGate: vi.fn(),
}));

// Mock do overlay real
vi.mock('@/components/dev/BridgeMetricsOverlay', () => ({
  default: () => <div data-testid="bridge-metrics-overlay-real">Real Overlay</div>,
}));

describe('DevInfraGate SSR & Hydration Integration', () => {
  it('garante que o overlay é omitido no SSR e só aparece após montagem no cliente', async () => {
    // --- FASE 1: SSR (Servidor) ---
    vi.mocked(useDevGate).mockReturnValue({
      isAllowed: false,
      isDev: false
    });

    const ssrHtml = renderToString(<DevOnlyBridgeOverlay />);
    expect(ssrHtml).toBe('');

    // --- FASE 2: Hidratação simulada (Cliente) ---
    // Em vez de hydrateRoot manual (complexo com mocks), usamos render do RTL 
    // que simula o ciclo de vida completo do cliente.
    
    // Primeiro render (simula montagem inicial onde mounted=false no hook real)
    // Mas o mock nos permite ditar o estado.
    
    const { rerender } = render(<DevOnlyBridgeOverlay />);
    expect(screen.queryByTestId('bridge-metrics-overlay-real')).not.toBeInTheDocument();

    // Simula a resolução do Auth (isLoading=false) e montagem final (mounted=true)
    vi.mocked(useDevGate).mockReturnValue({
      isAllowed: true,
      isDev: true
    });

    await act(async () => {
      rerender(<DevOnlyBridgeOverlay />);
    });

    expect(await screen.findByTestId('bridge-metrics-overlay-real')).toBeInTheDocument();
  });
});
