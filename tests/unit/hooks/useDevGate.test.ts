import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDevGate } from '@/hooks/useDevGate';
import { devInfraGate } from '@/lib/system/dev-gate/DevInfraGate';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock devInfraGate.shouldShow
vi.mock('@/lib/system/dev-gate/DevInfraGate', () => ({
  devInfraGate: {
    shouldShow: vi.fn(),
  },
}));

describe('useDevGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar isAllowed true se devInfraGate.shouldShow retornar true', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    vi.mocked(devInfraGate.shouldShow).mockReturnValue(true);

    const { isAllowed, isDev } = useDevGate();

    expect(isAllowed).toBe(true);
    expect(isDev).toBe(true);
    expect(devInfraGate.shouldShow).toHaveBeenCalledWith(true);
  });

  it('deve retornar isAllowed false se devInfraGate.shouldShow retornar false', () => {
    mockUseAuth.mockReturnValue({ isDev: false });
    vi.mocked(devInfraGate.shouldShow).mockReturnValue(false);

    const { isAllowed, isDev } = useDevGate();

    expect(isAllowed).toBe(false);
    expect(isDev).toBe(false);
    expect(devInfraGate.shouldShow).toHaveBeenCalledWith(false);
  });

  it('deve refletir o status isDev corretamente mesmo quando isAllowed é forçado', () => {
    mockUseAuth.mockReturnValue({ isDev: false });
    vi.mocked(devInfraGate.shouldShow).mockReturnValue(true); // Forçado por localStorage por exemplo

    const { isAllowed, isDev } = useDevGate();

    expect(isAllowed).toBe(true);
    expect(isDev).toBe(false);
  });
});
