import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBridgeMetrics } from '@/hooks/dev/useBridgeMetrics';
import * as bridgeMetricsLib from '@/lib/telemetry/bridgeCallMetrics';
import * as longTasksLib from '@/lib/telemetry/longTaskWatchdog';

vi.mock('@/lib/telemetry/bridgeCallMetrics', () => ({
  getBridgeSamples: vi.fn(() => []),
  subscribeBridgeCalls: vi.fn((cb) => {
    // Armazenamos o callback para disparar manualmente se necessário
    (globalThis as any)._bridgeMetricsCallback = cb;
    return () => {};
  }),
  clearBridgeSamples: vi.fn(),
}));

vi.mock('@/lib/telemetry/longTaskWatchdog', () => ({
  getLongTaskEvents: vi.fn(() => []),
  subscribeLongTasks: vi.fn((cb) => {
    (globalThis as any)._longTasksCallback = cb;
    return () => {};
  }),
}));

describe('useBridgeMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve inicializar com valores padrão', () => {
    const { result } = renderHook(() => useBridgeMetrics(true));
    expect(result.current.open).toBe(false);
    expect(result.current.paused).toBe(false);
    expect(result.current.filter).toBe('all');
    expect(result.current.tab).toBe('calls');
  });

  it('deve alternar estado open e persistir no localStorage', () => {
    const { result } = renderHook(() => useBridgeMetrics(true));
    act(() => {
      result.current.setOpen(true);
    });
    expect(result.current.open).toBe(true);
    expect(localStorage.getItem('lov:bridge-metrics-overlay:open')).toBe('1');
    
    act(() => {
      result.current.setOpen(false);
    });
    expect(result.current.open).toBe(false);
    expect(localStorage.getItem('lov:bridge-metrics-overlay:open')).toBe('0');
  });

  it('deve alternar estado open via teclado (tecla `)', () => {
    renderHook(() => useBridgeMetrics(true));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }));
    });
    expect(localStorage.getItem('lov:bridge-metrics-overlay:open')).toBe('1');
  });

  it('não deve reagir ao teclado se isAllowed for false', () => {
    renderHook(() => useBridgeMetrics(false));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '`' }));
    });
    expect(localStorage.getItem('lov:bridge-metrics-overlay:open')).toBeNull();
  });

  it('deve filtrar amostras corretamente (slow e errors)', () => {
    const samples = [
      { id: 1, durationMs: 100, ok: true, respBytes: 100 },
      { id: 2, durationMs: 700, ok: true, respBytes: 200 }, // slow
      { id: 3, durationMs: 150, ok: false, respBytes: 300 }, // error
    ];
    (bridgeMetricsLib.getBridgeSamples as any).mockReturnValue(samples);

    const { result } = renderHook(() => useBridgeMetrics(true));
    
    // Abrir para permitir coleta de amostras via useSyncExternalStore
    act(() => { result.current.setOpen(true); });

    // Por padrão mostra tudo (reverso)
    expect(result.current.samples).toHaveLength(3);
    expect(result.current.samples[0].id).toBe(3);

    // Filtro Slow
    act(() => { result.current.setFilter('slow'); });
    expect(result.current.samples).toHaveLength(1);
    expect(result.current.samples[0].id).toBe(2);

    // Filtro Errors
    act(() => { result.current.setFilter('errors'); });
    expect(result.current.samples).toHaveLength(1);
    expect(result.current.samples[0].id).toBe(3);
  });

  it('deve calcular o summary corretamente', () => {
    const samples = [
      { id: 1, durationMs: 100, ok: true, respBytes: 1000 },
      { id: 2, durationMs: 200, ok: true, respBytes: 2000 },
    ];
    (bridgeMetricsLib.getBridgeSamples as any).mockReturnValue(samples);

    const { result } = renderHook(() => useBridgeMetrics(true));
    act(() => { result.current.setOpen(true); });

    expect(result.current.summary.total).toBe(2);
    expect(result.current.summary.avg).toBe(150);
    expect(result.current.summary.totalResp).toBe(3000);
    expect(result.current.summary.errors).toBe(0);
  });

  it('deve limpar amostras ao chamar clear', () => {
    const { result } = renderHook(() => useBridgeMetrics(true));
    act(() => {
      result.current.clear();
    });
    expect(bridgeMetricsLib.clearBridgeSamples).toHaveBeenCalled();
  });
});
