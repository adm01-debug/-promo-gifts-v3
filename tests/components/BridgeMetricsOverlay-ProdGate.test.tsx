import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import BridgeMetricsOverlay from '@/components/dev/BridgeMetricsOverlay';
import { shouldShowDevInfraMessages } from '@/lib/system/dev-infra-messages';
import { useAuth } from '@/contexts/AuthContext';

// Mock das dependências
vi.mock('@/lib/system/dev-infra-messages', () => ({
  shouldShowDevInfraMessages: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock dos stores de telemetria para evitar erros de subscrição
vi.mock('@/lib/telemetry/bridgeCallMetrics', () => ({
  getBridgeSamples: vi.fn(() => []),
  subscribeBridgeCalls: vi.fn((cb) => () => {}),
  clearBridgeSamples: vi.fn(),
}));

vi.mock('@/lib/telemetry/longTaskWatchdog', () => ({
  getLongTaskEvents: vi.fn(() => []),
  subscribeLongTasks: vi.fn((cb) => () => {}),
  clearLongTaskEvents: vi.fn(),
  describeLongTask: vi.fn(),
}));

describe('BridgeMetricsOverlay - Gating de Produção', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ isDev: true } as any);
  });

  it('RETORNA NULL EM PRODUÇÃO mesmo que o gate SSOT aprove (defesa em profundidade)', () => {
    // Forçar PROD = true
    vi.stubGlobal('import', { meta: { env: { PROD: true } } });
    vi.mocked(shouldShowDevInfraMessages).mockReturnValue(true);
    
    const { container } = render(<BridgeMetricsOverlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza normalmente se NÃO for produção e o gate aprovar', () => {
    // Forçar PROD = false
    vi.stubGlobal('import', { meta: { env: { PROD: false } } });
    vi.mocked(shouldShowDevInfraMessages).mockReturnValue(true);
    
    const { container } = render(<BridgeMetricsOverlay />);
    
    // O botão de toggle deve aparecer ("bridge metrics · `")
    expect(container).not.toBeEmptyDOMElement();
    expect(container.textContent).toContain('bridge metrics');
  });

  it('retorna null se NÃO for produção mas o gate SSOT REJEITAR', () => {
    vi.stubGlobal('import', { meta: { env: { PROD: false } } });
    vi.mocked(shouldShowDevInfraMessages).mockReturnValue(false);
    
    const { container } = render(<BridgeMetricsOverlay />);
    expect(container).toBeEmptyDOMElement();
  });
});

