import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBridgeMetrics } from '@/hooks/dev/useBridgeMetrics';
import { subscribeBridgeCalls } from '@/lib/telemetry/bridgeCallMetrics';
import { subscribeLongTasks } from '@/lib/telemetry/longTaskWatchdog';

// Mock do localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock dos módulos de telemetria para capturar assinaturas
vi.mock('@/lib/telemetry/bridgeCallMetrics', async () => {
  const actual = await vi.importActual('@/lib/telemetry/bridgeCallMetrics') as any;
  return {
    ...actual,
    subscribeBridgeCalls: vi.fn(actual.subscribeBridgeCalls),
  };
});

vi.mock('@/lib/telemetry/longTaskWatchdog', async () => {
  const actual = await vi.importActual('@/lib/telemetry/longTaskWatchdog') as any;
  return {
    ...actual,
    subscribeLongTasks: vi.fn(actual.subscribeLongTasks),
  };
});

describe('useBridgeMetrics Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should unsubscribe from telemetry when unmounted', () => {
    // Pegamos as funções reais (mockadas com spy)
    const subCalls = vi.mocked(subscribeBridgeCalls);
    const subTasks = vi.mocked(subscribeLongTasks);

    const { unmount } = renderHook(() => useBridgeMetrics(true));

    // Verifica se assinou (useSyncExternalStore assina no mount)
    expect(subCalls).toHaveBeenCalled();
    expect(subTasks).toHaveBeenCalled();

    // Capturamos os retornos das assinaturas (as funções de unsubscribe)
    const unsubCalls = subCalls.mock.results[0].value;
    const unsubTasks = subTasks.mock.results[0].value;
    
    // Espionamos as funções de unsubscribe
    const unsubCallsSpy = vi.fn(unsubCalls);
    const unsubTasksSpy = vi.fn(unsubTasks);
    
    // Substituímos o retorno real para poder verificar a chamada
    subCalls.mockReturnValueOnce(unsubCallsSpy);
    subTasks.mockReturnValueOnce(unsubTasksSpy);
    
    // Note: React 18 useSyncExternalStore chama a função retornada no cleanup.
    // Como já renderizamos, precisamos forçar uma nova assinatura ou confiar no comportamento do React.
    // Vamos remontar para capturar corretamente o unsubscribe no unmount.
    
    const { unmount: unmount2 } = renderHook(() => useBridgeMetrics(true));
    
    // Pega os unsubscribes da segunda renderização
    const currentUnsubCalls = subCalls.mock.results[subCalls.mock.results.length - 1].value;
    const currentUnsubTasks = subTasks.mock.results[subTasks.mock.results.length - 1].value;
    
    const spyCalls = vi.fn();
    const spyTasks = vi.fn();
    
    // Injetamos spies nos retornos de unsubscribe
    // (Esta é uma técnica para testar se o React chamou o que o hook retornou)
    subCalls.mockReturnValue(spyCalls);
    subTasks.mockReturnValue(spyTasks);
    
    unmount2();
    
    // useSyncExternalStore deve ter chamado os unsubscribes
    expect(spyCalls).toHaveBeenCalled();
    expect(spyTasks).toHaveBeenCalled();
  });

  it('should remove keyboard event listener when unmounted', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useBridgeMetrics(true));

    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    const handler = addSpy.mock.calls.find(call => call[0] === 'keydown')![1];

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('keydown', handler);
  });
});
