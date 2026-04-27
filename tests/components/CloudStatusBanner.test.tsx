/**
 * CloudStatusBanner — gating dev-only
 *
 * Garante que o banner de status do backend (warming/degraded/down) só renderiza
 * quando `shouldShowDevInfraMessages(isDev)` retorna `true` — usuários comuns
 * (agente/supervisor) NUNCA veem mensagens como "Backend reiniciando…".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CloudStatusBanner } from '@/components/system/CloudStatusBanner';
import type { CloudStatus } from '@/lib/cloud-status';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseCloudStatus = vi.fn();
vi.mock('@/hooks/useCloudStatus', () => ({
  useCloudStatus: () => mockUseCloudStatus(),
}));

// Gate SSOT — controlado por env/localStorage/role; mockamos para forçar
// a precedência por role e isolar o teste do build-time env.
const mockShouldShow = vi.fn();
vi.mock('@/lib/system/dev-infra-messages', () => ({
  shouldShowDevInfraMessages: (isDev: boolean) => mockShouldShow(isDev),
}));

function setStatus(status: CloudStatus) {
  mockUseCloudStatus.mockReturnValue({
    status,
    snapshot: null,
    retry: vi.fn(),
    isChecking: false,
  });
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseCloudStatus.mockReset();
  mockShouldShow.mockReset();
  // Default: gate respeita o role (comportamento de produção).
  mockShouldShow.mockImplementation((isDev: boolean) => isDev);
});

describe('CloudStatusBanner — visibilidade por papel', () => {
  it.each(['warming', 'degraded', 'down'] as const)(
    'NÃO renderiza para usuário não-dev mesmo com status=%s',
    (status) => {
      mockUseAuth.mockReturnValue({ isDev: false });
      setStatus(status);
      const { container } = render(<CloudStatusBanner />);
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByText(/Backend/i)).not.toBeInTheDocument();
    },
  );

  it.each([
    ['warming', /Backend reiniciando/i],
    ['degraded', /Backend instável/i],
    ['down', /Backend indisponível/i],
  ] as const)('renderiza para dev com status=%s', (status, copy) => {
    mockUseAuth.mockReturnValue({ isDev: true });
    setStatus(status);
    render(<CloudStatusBanner />);
    expect(screen.getByText(copy)).toBeInTheDocument();
  });

  it('não renderiza nada quando status=healthy, mesmo para dev', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    setStatus('healthy');
    const { container } = render(<CloudStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('respeita o gate SSOT: dev=true mas gate=false NÃO renderiza (env desligado em produção)', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    mockShouldShow.mockReturnValue(false); // simula VITE_SHOW_DEV_INFRA_MESSAGES=false
    setStatus('down');
    const { container } = render(<CloudStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('respeita o gate SSOT: dev=false mas gate=true renderiza (override local explícito)', () => {
    mockUseAuth.mockReturnValue({ isDev: false });
    mockShouldShow.mockReturnValue(true); // override via localStorage
    setStatus('warming');
    render(<CloudStatusBanner />);
    expect(screen.getByText(/Backend reiniciando/i)).toBeInTheDocument();
  });
});
