import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDevGate } from './useDevGate';
import { useAuth } from '@/contexts/AuthContext';
import { devInfraGate } from '@/lib/system/dev-gate/DevInfraGate';

// Mock do AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('useDevGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    devInfraGate.invalidateCache();
  });

  it('should reflect changes from devInfraGate automatically', () => {
    (useAuth as any).mockReturnValue({ isDev: false });
    
    const { result } = renderHook(() => useDevGate());
    
    // Inicialmente false (não dev e sem override)
    expect(result.current.isAllowed).toBe(false);

    // Simular mudança externa (ex: localStorage alterado em outra aba)
    act(() => {
      // Forçamos o gate a retornar true via mock interno ou simulando o evento que o gate escuta
      // Como o useDevGate usa useSyncExternalStore conectado ao devInfraGate, 
      // basta disparar o evento que o devInfraGate escuta.
      
      // Mockamos o provider do gate real para este teste se necessário, 
      // mas aqui vamos testar a REATIVIDADE do hook à invalidação do gate.
      
      // Vamos espionar o shouldShow para retornar true no próximo ciclo
      vi.spyOn(devInfraGate, 'shouldShow').mockReturnValue(true);
      
      // Disparar o evento que causa a re-notificação
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'show_dev_infra_messages',
        newValue: 'true'
      }));
    });

    // O hook deve ter atualizado via useSyncExternalStore
    expect(result.current.isAllowed).toBe(true);
  });

  it('should react to isDev changes from auth context', () => {
    const { rerender, result } = renderHook(
      ({ isDev }) => {
        (useAuth as any).mockReturnValue({ isDev });
        return useDevGate();
      },
      { initialProps: { isDev: false } }
    );

    expect(result.current.isAllowed).toBe(false);

    rerender({ isDev: true });

    expect(result.current.isAllowed).toBe(true);
  });
});
