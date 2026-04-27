/**
 * BridgeStatusBanner — gating dev-only
 *
 * Garante que toasts ("Reconectando ao catálogo externo…") e o banner sticky
 * de indisponibilidade do bridge só são acionados quando o gate SSOT autoriza.
 * Para usuários comuns, NENHUM listener é registrado e o componente renderiza vazio.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BridgeStatusBanner } from '@/components/BridgeStatusBanner';
import type { BridgeStatusEvent } from '@/lib/external-db/bridge-status-events';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const toastApi = {
  loading: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  dismiss: vi.fn(),
};
vi.mock('sonner', () => ({ toast: toastApi }));

// Capturamos o listener registrado por onBridgeStatus para emitir eventos sintéticos.
let listener: ((e: BridgeStatusEvent) => void) | null = null;
const onBridgeStatusMock = vi.fn((cb: (e: BridgeStatusEvent) => void) => {
  listener = cb;
  return () => {
    listener = null;
  };
});
vi.mock('@/lib/external-db/bridge-status-events', () => ({
  onBridgeStatus: (cb: (e: BridgeStatusEvent) => void) => onBridgeStatusMock(cb),
}));

const mockShouldShow = vi.fn();
vi.mock('@/lib/system/dev-infra-messages', () => ({
  shouldShowDevInfraMessages: (isDev: boolean) => mockShouldShow(isDev),
}));

function emit(event: BridgeStatusEvent) {
  act(() => {
    listener?.(event);
  });
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockShouldShow.mockReset();
  mockShouldShow.mockImplementation((isDev: boolean) => isDev);
  onBridgeStatusMock.mockClear();
  listener = null;
  toastApi.loading.mockClear();
  toastApi.error.mockClear();
  toastApi.success.mockClear();
  toastApi.dismiss.mockClear();
});

describe('BridgeStatusBanner — visibilidade por papel', () => {
  it('usuário NÃO-dev: não registra listener, não dispara toasts e renderiza vazio', () => {
    mockUseAuth.mockReturnValue({ isDev: false });
    const { container } = render(<BridgeStatusBanner />);

    expect(container).toBeEmptyDOMElement();
    expect(onBridgeStatusMock).not.toHaveBeenCalled();
    expect(toastApi.loading).not.toHaveBeenCalled();
    expect(toastApi.error).not.toHaveBeenCalled();
  });

  it('usuário dev: registra listener e dispara toast em "degraded"', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    render(<BridgeStatusBanner />);

    expect(onBridgeStatusMock).toHaveBeenCalledTimes(1);
    emit({ type: 'degraded', attempt: 1, maxAttempts: 3 } as BridgeStatusEvent);
    expect(toastApi.loading).toHaveBeenCalledWith(
      'Reconectando ao catálogo externo…',
      expect.objectContaining({ id: 'bridge-degraded' }),
    );
  });

  it('usuário dev: evento "unavailable" exibe banner sticky com copy técnica', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    render(<BridgeStatusBanner />);

    emit({ type: 'unavailable', reason: 'timeout' } as BridgeStatusEvent);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Catálogo externo indisponível/i)).toBeInTheDocument();
    expect(toastApi.error).toHaveBeenCalled();
  });

  it('gate SSOT desligado (produção com VITE_SHOW_DEV_INFRA_MESSAGES=false) bloqueia mesmo para dev', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    mockShouldShow.mockReturnValue(false);
    const { container } = render(<BridgeStatusBanner />);

    expect(container).toBeEmptyDOMElement();
    expect(onBridgeStatusMock).not.toHaveBeenCalled();
  });

  it('gate SSOT habilitado por override (localStorage) permite renderizar para não-dev', () => {
    mockUseAuth.mockReturnValue({ isDev: false });
    mockShouldShow.mockReturnValue(true);
    render(<BridgeStatusBanner />);

    expect(onBridgeStatusMock).toHaveBeenCalledTimes(1);
    emit({ type: 'unavailable', reason: 'manual override' } as BridgeStatusEvent);
    expect(screen.getByText(/Catálogo externo indisponível/i)).toBeInTheDocument();
  });
});
