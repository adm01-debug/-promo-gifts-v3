import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { shouldShowDevInfraMessages } from '@/lib/system/dev-infra-messages';
import { useAuth } from '@/contexts/AuthContext';

// Mock das dependências
vi.mock('@/lib/system/dev-infra-messages', () => ({
  shouldShowDevInfraMessages: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock dos stores de telemetria
vi.mock('@/lib/telemetry/bridgeCallMetrics', () => ({
  getBridgeSamples: vi.fn(() => []),
  subscribeBridgeCalls: vi.fn(() => () => {}),
  clearBridgeSamples: vi.fn(),
}));

vi.mock('@/lib/telemetry/longTaskWatchdog', () => ({
  getLongTaskEvents: vi.fn(() => []),
  subscribeLongTasks: vi.fn(() => () => {}),
  clearLongTaskEvents: vi.fn(),
  describeLongTask: vi.fn(),
}));

describe('BridgeMetricsOverlay - Gating de Produção', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ isDev: true } as any);
    vi.resetModules();
  });

  it('RETORNA NULL EM PRODUÇÃO mesmo que o gate SSOT aprove (defesa em profundidade)', async () => {
    // Definimos PROD ANTES de importar o componente
    vi.stubGlobal('import', { meta: { env: { PROD: true } } });
    
    // Importação dinâmica para pegar o novo valor de import.meta.env
    const { default: BridgeMetricsOverlay } = await import('@/components/dev/BridgeMetricsOverlay');
    vi.mocked(shouldShowDevInfraMessages).mockReturnValue(true);
    
    const { container } = render(<BridgeMetricsOverlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza normalmente se NÃO for produção e o gate aprovar', async () => {
    vi.stubGlobal('import', { meta: { env: { PROD: false } } });
    
    const { default: BridgeMetricsOverlay } = await import('@/components/dev/BridgeMetricsOverlay');
    vi.mocked(shouldShowDevInfraMessages).mockReturnValue(true);
    
    const { container } = render(<BridgeMetricsOverlay />);
    expect(container).not.toBeEmptyDOMElement();
    expect(container.textContent).toContain('bridge metrics');
  });

  it('retorna null se NÃO for produção mas o gate SSOT REJEITAR', async () => {
    vi.stubGlobal('import', { meta: { env: { PROD: false } } });
    
    const { default: BridgeMetricsOverlay } = await import('@/components/dev/BridgeMetricsOverlay');
    vi.mocked(shouldShowDevInfraMessages).mockReturnValue(false);
    
    const { container } = render(<BridgeMetricsOverlay />);
    expect(container).toBeEmptyDOMElement();
  });
});
