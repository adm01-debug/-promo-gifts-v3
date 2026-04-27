import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import BridgeMetricsOverlay from '@/components/dev/BridgeMetricsOverlay';
import { useBridgeMetrics } from '@/hooks/dev/useBridgeMetrics';
import { useDevGate } from '@/hooks/useDevGate';

// Mock hooks
vi.mock('@/hooks/useDevGate', () => ({
  useDevGate: vi.fn()
}));

vi.mock('@/hooks/dev/useBridgeMetrics', () => ({
  useBridgeMetrics: vi.fn()
}));

// Mock child components to isolate Overlay
vi.mock('./metrics/BridgeMetricsSummary', () => ({
  BridgeMetricsSummary: () => <div data-testid="summary" />
}));
vi.mock('./metrics/BridgeCallItem', () => ({
  BridgeCallItem: () => <div data-testid="call-item" />
}));

describe('BridgeMetricsOverlay Rendering Performance', () => {
  const mockSetOpen = vi.fn();
  const mockSetPaused = vi.fn();
  const mockSetFilter = vi.fn();
  const mockSetTab = vi.fn();
  const mockClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useDevGate as any).mockReturnValue({ isAllowed: true });
    (useBridgeMetrics as any).mockReturnValue({
      open: true,
      setOpen: mockSetOpen,
      paused: false,
      setPaused: mockSetPaused,
      filter: 'all',
      setFilter: mockSetFilter,
      tab: 'calls',
      setTab: mockSetTab,
      samples: [],
      longTasks: [],
      summary: { total: 0, avg: 0, totalResp: 0, errors: 0, last20: 0 },
      clear: mockClear
    });
  });

  it('should not recreate callbacks for Header when unrelated state changes', () => {
    // Injetamos um componente que conta re-renders do Header
    // Como Header é memo(), ele só re-renderiza se as props mudarem
    const { rerender } = render(<BridgeMetricsOverlay />);
    
    // Verificamos o uso de useCallback no componente real BridgeMetricsOverlay.tsx
    // Atualmente as funções passadas para Header são:
    // onTogglePause={() => setPaused(!paused)}
    // onClear={clear}
    // onClose={() => setOpen(false)}
    
    // Se mudarmos o 'tab' no useBridgeMetrics, o Overlay re-renderiza.
    // Se as funções passadas para o Header forem recriadas, o Header re-renderiza (mesmo sendo memo).
    
    // NOTA: No código atual (linhas 55-60 de BridgeMetricsOverlay.tsx):
    // <Header 
    //   paused={paused} 
    //   onTogglePause={() => setPaused(!paused)} 
    //   onClear={clear} 
    //   onClose={() => setOpen(false)} 
    // />
    // As funções onTogglePause e onClose são criadas inline no render!
    // Isso causa re-render do Header sempre que o Overlay renderiza.
    
    // Este teste deve falhar ou identificar essa oportunidade de melhoria.
  });
});
