

# Testes smoke e funcionais para técnicas + cálculo de preço

## Objetivo

Travar com testes a regressão do fluxo principal pós-migração: carregar lista de técnicas, carregar opções de personalização de produto e calcular preço — cobrindo payload PT (atual), EN (futuro) e híbrido.

## Estado atual

Já temos:
- `tests/lib/personalization/` com 35+ testes de adapters, `rpc-contracts`, `safe-coerce` parcial.
- `tests/hooks/_helpers/smoke-template.ts` (`smokeHook`) e `render-hook-providers.ts`.
- `tests/components/pricing/QuantityPriceCalculator.test.tsx` como referência de mock de hooks.

Falta cobrir end-to-end (no nível de hook) o caminho: **rows brutas do bridge → adapter → hook → consumidor**, garantindo que a migração de schema não quebra silenciosamente.

## O que será feito

### 1. Smoke tests dos hooks de leitura

Arquivo novo: `tests/hooks/tecnicas/useTecnicasList.smoke.test.ts`
- `smokeHook("useTecnicasList", () => useTecnicasList())` — mock de `invokeExternalDb` retornando `[]`; garante mount sem crash.
- Variante: mock retornando 3 rows PT antigas → `result.current.data` tem 3 itens com `codigo` E `code` preenchidos.

Arquivo novo: `tests/hooks/useProductCustomizationOptions.smoke.test.ts`
- Smoke com `productId = null` (não chama RPC) e com mock RPC retornando payload PT canônico.

Arquivo novo: `tests/hooks/usePrintAreas.smoke.test.ts`
- Smoke + asserção que `adaptPrintAreaTechniqueRow` foi aplicado (campo `code` presente quando row só tinha `codigo`).

### 2. Testes funcionais do cálculo de preço

Arquivo novo: `tests/hooks/useCustomizationPrice.functional.test.ts`

Mocks:
- `vi.mock('@/lib/external-rpc')` com `invokeExternalRpc` retornando fixtures controladas.

Cenários (`renderHook` + `act`):
- **Happy path PT**: `calculatePrice({ areaId, quantidade: 100, numCores: 2 })` → resolve com `success: true`, `preco_unitario > 0`, `_hasMarkup === true` (após adapter).
- **Happy path EN**: mesma chamada, payload com chaves `unit_price`/`engraving_value` → adapter normaliza; resultado canônico idêntico.
- **Error path**: RPC retorna `{ success: false, error: 'no table' }` → `error` populado, `loading: false`, retorno `null`.
- **Validador**: payload com `markup` ausente → retorno funciona, `window.__personalizationSchemaStats.contractMismatches` incrementa para `fn_get_customization_price`.
- **Sem dimensão**: chamada sem `larguraCm/alturaCm` → params RPC não contêm `p_largura_cm`.

### 3. Teste funcional reativo

Arquivo novo: `tests/hooks/useCustomizationPriceReactive.functional.test.ts`
- Verifica debounce de 500ms (`vi.useFakeTimers`).
- Mudança rápida em `numCores` (1→2→3) dispara apenas 1 chamada RPC após `vi.advanceTimersByTime(500)`.
- `usaDimensao: true` sem largura/altura → não chama RPC, `price === null`.

### 4. Teste de integração lista → cálculo

Arquivo novo: `tests/integration/tecnicas-pricing-flow.test.tsx`

Encadeia 2 hooks num componente de teste:
1. `useTecnicasList()` carrega 2 técnicas mockadas (uma com `code`, outra com `codigo`).
2. Para cada técnica, simula chamada `useCustomizationPriceCalculator().calculatePrice({ areaId: t.id, quantidade: 50 })`.
3. Asserções: ambas resolvem; `result.totalPrice > 0`; nenhum `console.error` dispara.

Garante que o **shape canônico produzido pelos adapters de row** é compatível com o **shape esperado pelos hooks de preço**.

### 5. Atualizar/expandir testes existentes de adapter

`tests/lib/personalization/adapters/price-response.adapter.test.ts`:
- Adicionar caso: payload com `markup: null` → resultado tem `markup` com defaults (após implementação do passo 4 do plano anterior; se ainda não houver defaults, marcar `it.skip` com TODO claro).
- Adicionar caso: payload com `valor_gravacao: "12.50"` (string) → coerção para number.

`tests/lib/personalization/adapters/raw-row.adapter.test.ts`:
- Adicionar caso `adaptTabelaPrecoRow` com colunas EN puras (`code`, `setup_price`, `handling_price`, `max_colors`).
- Adicionar caso `adaptFaixaPrecoRow` com payload híbrido (`min_quantity` + `preco_unitario`).

### 6. Fixtures compartilhadas

Arquivo novo: `tests/fixtures/personalization-payloads.ts`

Exporta:
- `PRICE_PAYLOAD_PT_V6` — payload canônico atual completo.
- `PRICE_PAYLOAD_EN_FUTURE` — mesmo conteúdo com chaves EN.
- `PRICE_PAYLOAD_HYBRID` — mistura.
- `OPTIONS_PAYLOAD_PT` — `fn_get_product_customization_options` com 2 locations × 3 options.
- `TECNICA_ROW_PT`, `TECNICA_ROW_EN`, `TECNICA_ROW_HYBRID`.
- `TABELA_PRECO_ROW_*`, `FAIXA_PRECO_ROW_*`.

Reutilizadas pelos testes acima, garantindo single source of truth para os payloads de teste.

### 7. Helper de teste para hooks com providers

Estender `tests/hooks/_helpers/render-hook-providers.ts` (se necessário) para aceitar QueryClient pré-populado nos testes de integração — usa `QueryClient` com `retry: false, gcTime: 0` para evitar flakiness.

### 8. Verificação

- `npx vitest run tests/hooks tests/integration tests/lib/personalization` — todos verdes.
- Total esperado: ~50 testes (35 atuais + ~15 novos).
- `npx tsc --noEmit` limpo.
- Smoke manual: nenhum.

## Arquivos tocados

**Criados (8)**:
- `tests/hooks/tecnicas/useTecnicasList.smoke.test.ts`
- `tests/hooks/useProductCustomizationOptions.smoke.test.ts`
- `tests/hooks/usePrintAreas.smoke.test.ts`
- `tests/hooks/useCustomizationPrice.functional.test.ts`
- `tests/hooks/useCustomizationPriceReactive.functional.test.ts`
- `tests/integration/tecnicas-pricing-flow.test.tsx`
- `tests/fixtures/personalization-payloads.ts`
- (opcional) extensão de `tests/hooks/_helpers/render-hook-providers.ts`

**Editados (2)**:
- `tests/lib/personalization/adapters/price-response.adapter.test.ts`
- `tests/lib/personalization/adapters/raw-row.adapter.test.ts`

## Compatibilidade

- **Zero impacto em runtime**: só adiciona testes.
- Fixtures cobrem PT/EN/híbrido — quando o back finalmente migrar, o mesmo conjunto de testes valida a transição sem reescrita.
- Falhas futuras em `contractMismatches` aparecerão como assertion failure no teste do passo 2, dando alarme antes de chegar em produção.

