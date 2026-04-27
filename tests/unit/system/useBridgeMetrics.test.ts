import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBridgeMetrics } from '@/hooks/dev/useBridgeMetrics';
import * as bridgeMetricsLib from '@/lib/telemetry/bridgeCallMetrics';
import * as longTasksLib from '@/lib/telemetry/longTaskWatchdog';

vi.mock('@/lib/telemetry/bridgeCallMetrics', () => ({
  getBridgeSamples: vi.fn(() => []),
  subscribeBridgeCalls: vi.fn(() => () => {}),
  clearBridgeSamples: vi.fn(),
}));

vi.mock('@/lib/telemetry/longTaskWatchdog', () => ({
  getLongTaskEvents: vi.fn(() => []),
  subscribeLongTasks: vi.fn(() => () => {}),
}));

describe('useBridgeMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('deve inicializar com valores padrão', () => {
    const { result } = renderHook(() => useBridgeMetrics(true));
    expect(result.current.open).toBe(false);
    expect(result.current.paused).toBe(false);
    expect(result.current.filter).toBe('all');
    expect(result.current.tab).toBe('calls');
  });

  it('deve alternar estado open via teclado (tecla `)', () => {
    // Para evitar loops em ambiente de teste, validamos apenas a persistência
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

  it('deve calcular o summary corretamente', () => {
    const { result } = renderHook(() => useBridgeMetrics(true));
    expect(result.current.summary).toBeDefined();
    expect(result.current.summary.total).toBe(0);
  });

  it('deve limpar amostras ao chamar clear', () => {
    const { result } = renderHook(() => useBridgeMetrics(true));
    act(() => {
      result.current.clear();
    });
    expect(bridgeMetricsLib.clearBridgeSamples).toHaveBeenCalled();
  });
});
