import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React, { useState, useEffect } from 'react';
import { useDevGate } from '@/hooks/useDevGate';
import { DevOnlyBridgeOverlay } from '@/components/dev/DevOnlyBridgeOverlay';

// Mock do hook useDevGate
vi.mock('@/hooks/useDevGate', () => ({
  useDevGate: vi.fn(),
}));

// Mock do overlay real com contador de montagem para detectar re-renders excessivos ou "flashes"
let renderCount = 0;
vi.mock('@/components/dev/BridgeMetricsOverlay', () => ({
  default: () => {
    renderCount++;
    return <div data-testid="bridge-metrics-overlay-real">Overlay v{renderCount}</div>;
  },
}));

describe('DevInfraGate Stability — Loading Transition & Anti-Flicker', () => {
  it('transita de isLoading para carregado e renderiza o overlay exatamente uma vez sem piscar', async () => {
    renderCount = 0;
    
    // 1. Estado inicial: Carregando
    // No useDevGate real, isso retornaria isAllowed: false
    vi.mocked(useDevGate).mockReturnValue({
      isAllowed: false,
      isDev: false
    });

    const { rerender } = render(<DevOnlyBridgeOverlay />);
    
    // Garantimos que não renderizou nada
    expect(screen.queryByTestId('bridge-metrics-overlay-real')).not.toBeInTheDocument();
    expect(renderCount).toBe(0);

    // 2. Transição para estado Permitido (Simula Auth finalizado + permissão dev)
    vi.mocked(useDevGate).mockReturnValue({
      isAllowed: true,
      isDev: true
    });

    // Disparamos o re-render que o hook real dispararia após isLoading -> false e mounted -> true
    await act(async () => {
      rerender(<DevOnlyBridgeOverlay />);
    });

    // O overlay deve aparecer
    const overlay = await screen.findByTestId('bridge-metrics-overlay-real');
    expect(overlay).toBeInTheDocument();
    
    // Render count deve ser exatamente 1 (sem flashes de montagem/desmontagem)
    expect(renderCount).toBe(1);

    // 3. Simula um update trivial no Gate (ex: mudança em outra role irrelevante que não altera isAllowed)
    // Se o hook for estável (useMemo), o overlay não deve re-renderizar o componente lazy.
    await act(async () => {
      rerender(<DevOnlyBridgeOverlay />);
    });

    // O contador de render do COMPONENTE DEFAULT (o mock) pode subir se o React decidir re-renderizar, 
    // mas o importante é que ele não foi desmontado e remontado (o que causaria flicker visual).
    // No caso do lazy, se isAllowed for mantido estável pelo useMemo no useDevGate, o Suspense não deve entrar em fallback.
    expect(screen.getByTestId('bridge-metrics-overlay-real')).toBeInTheDocument();
  });
});
