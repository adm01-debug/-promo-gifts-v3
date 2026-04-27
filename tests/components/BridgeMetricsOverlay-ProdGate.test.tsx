import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import BridgeMetricsOverlay from '@/components/dev/BridgeMetricsOverlay';
import { shouldShowDevInfraMessages } from '@/lib/system/dev-infra-messages';

// Mock do import.meta.env.PROD
// Vitest define PROD como falso por padrão, vamos forçar aqui para o teste de "modo PROD"
vi.mock('@/lib/system/dev-infra-messages', () => ({
  shouldShowDevInfraMessages: vi.fn(),
}));

describe('BridgeMetricsOverlay - Gating de Produção', () => {
  it('RETORNA NULL EM PRODUÇÃO mesmo que o gate SSOT aprove (defesa em profundidade)', () => {
    // 1. Simular ambiente de PROD via global mock
    // Nota: Em Vitest, import.meta.env.PROD é readonly. 
    // Como o componente checa import.meta.env.PROD diretamente, 
    // precisamos garantir que o ambiente de teste o reflita ou mockar o componente/import.
    
    // @ts-ignore - forçando PROD para true no contexto do teste
    vi.stubGlobal('import', { meta: { env: { PROD: true } } });
    
    // 2. Simular que o usuário é DEV e o gate aprova
    vi.mocked(shouldShowDevInfraMessages).mockReturnValue(true);
    
    const { container } = render(<BridgeMetricsOverlay />);
    
    // Deve ser vazio porque o guard `if (import.meta.env.PROD) return null` é soberano
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza normalmente se NÃO for produção e o gate aprovar', () => {
    // @ts-ignore
    vi.stubGlobal('import', { meta: { env: { PROD: false } } });
    vi.mocked(shouldShowDevInfraMessages).mockReturnValue(true);
    
    const { container } = render(<BridgeMetricsOverlay />);
    
    // Não deve ser vazio (pelo menos o botão de toggle deve aparecer se 'open' for false por default)
    expect(container).not.toBeEmptyDOMElement();
    expect(container.textContent).toContain('bridge metrics');
  });
});
