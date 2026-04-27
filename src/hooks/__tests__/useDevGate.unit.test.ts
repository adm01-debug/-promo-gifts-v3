import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDevGate } from '../useDevGate';
import { useAuth } from '@/contexts/AuthContext';
import { devInfraGate } from '@/lib/system/dev-gate/DevInfraGate';

// Mock do AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('useDevGate Hook — Unit Tests', () => {
  it('retorna isAllowed: false quando está carregando (isLoading: true)', () => {
    vi.mocked(useAuth).mockReturnValue({
      roles: ['dev'],
      isDev: true,
      isLoading: true,
    } as any);

    const { result } = renderHook(() => useDevGate());
    
    expect(result.current.isAllowed).toBe(false);
  });

  it('retorna isAllowed: true quando montado e autorizado', async () => {
    vi.mocked(useAuth).mockReturnValue({
      roles: ['dev'],
      isDev: true,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useDevGate());
    
    // Na montagem inicial (useEffect ainda não rodou), mounted é false
    expect(result.current.isAllowed).toBe(false);

    // Após o efeito de montagem
    await act(async () => {
      // useEffect roda automaticamente no renderHook
    });

    expect(result.current.isAllowed).toBe(true);
    expect(result.current.isDev).toBe(true);
  });

  it('reage a mudanças no devInfraGate store', async () => {
    vi.mocked(useAuth).mockReturnValue({
      roles: ['dev'],
      isDev: true,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useDevGate());

    // Forçar montagem
    await act(async () => {});

    expect(result.current.isAllowed).toBe(true);

    // Simular mudança no store (ex: desabilitar via gate)
    vi.spyOn(devInfraGate, 'shouldShow').mockReturnValue(false);
    
    await act(async () => {
      devInfraGate.invalidateCache();
      // useSyncExternalStore deve capturar a mudança
    });

    expect(result.current.isAllowed).toBe(false);
    
    vi.restoreAllMocks();
  });
});
