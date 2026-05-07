/**
 * CloudStatusBanner — gating dev-only vs crítico
 * 
 * Garante que apenas mensagens estritamente técnicas ("warming") são ocultadas
 * para usuários comuns. Falhas críticas ("down", "degraded") são exibidas a todos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CloudStatusBanner } from '@/components/system/CloudStatusBanner';
import type { CloudStatus, CloudStatusSnapshot, StatusHistoryEntry } from '@/lib/cloud-status';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseCloudStatus = vi.fn();
vi.mock('@/hooks/useCloudStatus', () => ({
  useCloudStatus: () => mockUseCloudStatus(),
}));

const mockGetStatusTimeline = vi.fn<() => StatusHistoryEntry[]>();
vi.mock('@/lib/cloud-status', async () => {
  const actual = await vi.importActual<typeof import('@/lib/cloud-status')>('@/lib/cloud-status');
  return {
    ...actual,
    getStatusTimeline: () => mockGetStatusTimeline(),
  };
});

// Mock do hook useDevGate (já que o componente o usa agora)
const mockIsAllowed = vi.fn();
vi.mock('@/hooks/useDevGate', () => ({
  useDevGate: () => ({
    isAllowed: mockIsAllowed(),
    isDev: mockUseAuth().isDev
  })
}));

function buildSnapshot(status: CloudStatus): CloudStatusSnapshot | null {
  if (status === 'unknown') return null;
  return {
    status,
    checkedAt: Date.now(),
    signals: {
      auth: { ok: status !== 'down', ms: 120 },
      bridge: { ok: status === 'healthy' || status === 'warming', ms: 140 },
      rest: { ok: status === 'healthy' || status === 'warming' || status === 'degraded', ms: 160 },
    },
  };
}

function setStatus(status: CloudStatus) {
  mockUseCloudStatus.mockReturnValue({
    status,
    snapshot: buildSnapshot(status),
    retry: vi.fn(),
    isChecking: false,
  });
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseCloudStatus.mockReset();
  mockIsAllowed.mockReset();
  mockGetStatusTimeline.mockReset();
  mockGetStatusTimeline.mockReturnValue([]);
  // Default: isAllowed segue isDev
  mockIsAllowed.mockImplementation(() => mockUseAuth().isDev);
});

describe('CloudStatusBanner — visibilidade por papel e criticidade', () => {
  it('NÃO renderiza "warming" para usuário não-dev (mensagem técnica)', () => {
    mockUseAuth.mockReturnValue({ isDev: false });
    setStatus('warming');
    const { container } = render(<CloudStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('EXIBE "down" para usuário não-dev (falha crítica)', () => {
    mockUseAuth.mockReturnValue({ isDev: false });
    setStatus('down');
    render(<CloudStatusBanner />);
    expect(screen.getByText(/Backend indisponível/i)).toBeInTheDocument();
  });

  it('EXIBE "degraded" para usuário não-dev (falha crítica)', () => {
    mockUseAuth.mockReturnValue({ isDev: false });
    setStatus('degraded');
    render(<CloudStatusBanner />);
    expect(screen.getByText(/Backend instável/i)).toBeInTheDocument();
  });

  it('EXIBE tudo para usuários dev', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    
    // Test warming
    setStatus('warming');
    const { rerender } = render(<CloudStatusBanner />);
    expect(screen.getByText(/Backend inicializando parcialmente/i)).toBeInTheDocument();

    // Test down
    setStatus('down');
    rerender(<CloudStatusBanner />);
    expect(screen.getByText(/Backend indisponível/i)).toBeInTheDocument();
  });

  it('respeita o gate de infra: mesmo dev NÃO vê "warming" se isAllowed=false (Modo PROD)', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    mockIsAllowed.mockReturnValue(false); // Simula gate fechado em PROD
    setStatus('warming');
    
    const { container } = render(<CloudStatusBanner />);
    expect(container).toBeEmptyDOMElement();
    
    // Mas ainda vê "down"
    setStatus('down');
    render(<CloudStatusBanner />);
    expect(screen.getByText(/Backend indisponível/i)).toBeInTheDocument();
  });

  it('renderiza estado healthy em dev sem tocar em config inexistente', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    setStatus('healthy');

    render(<CloudStatusBanner />);

    expect(screen.getByText(/Cloud saudável/i)).toBeInTheDocument();
  });

  it('renderiza estado unknown em dev sem tocar em config inexistente', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    setStatus('unknown');

    render(<CloudStatusBanner />);

    expect(screen.getByText(/aguardando primeira sondagem/i)).toBeInTheDocument();
  });

  it('abre painel de debug mostrando probes sem crash', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    setStatus('degraded');

    render(<CloudStatusBanner />);

    fireEvent.click(screen.getByTitle(/Debug Latência/i));

    expect(screen.getByText(/AUTH: 120ms/i)).toBeInTheDocument();
    expect(screen.getByText(/BRIDGE: 140ms/i)).toBeInTheDocument();
    expect(screen.getByText(/REST: 160ms/i)).toBeInTheDocument();
  });

  it('abre timeline histórica mostrando falhas consecutivas', () => {
    mockUseAuth.mockReturnValue({ isDev: true });
    mockGetStatusTimeline.mockReturnValue([
      { status: 'healthy', timestamp: Date.now() - 1000, consecutiveFailures: 0 },
      { status: 'down', timestamp: Date.now() - 500, consecutiveFailures: 2 },
    ]);
    setStatus('healthy');

    render(<CloudStatusBanner />);

    fireEvent.click(screen.getByTitle(/Ver histórico/i));

    expect(screen.getByText('DOWN')).toBeInTheDocument();
    expect(screen.getByText('(2 falhas)')).toBeInTheDocument();
  });
});
