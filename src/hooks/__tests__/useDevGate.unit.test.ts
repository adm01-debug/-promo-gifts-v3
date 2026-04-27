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
    
    // O RTL renderHook já executa o useEffect na montagem inicial
    // Então mounted já será true
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
    expect(result.current.isAllowed).toBe(true);

    // O hook usa devInfraGate.shouldShow(roles)
    // Precisamos mockar o protótipo ou a instância exportada que o hook usa
    const spy = vi.spyOn(devInfraGate, 'shouldShow').mockReturnValue(false);
    
    // Dispara a mudança
    await act(async () => {
      devInfraGate.invalidateCache();
    });

    // O useSyncExternalStore deve ser notificado e re-renderizar o hook
    expect(result.current.isAllowed).toBe(false);
    spy.mockRestore();
    
    vi.restoreAllMocks();
  });
});
