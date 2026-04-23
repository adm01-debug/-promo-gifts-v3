

# Camada de Adaptação Schema Antigo → Novo (Gravação)

## Problema

Hoje o front consome o RPC `fn_get_customization_price` em **6 arquivos** diferentes, cada um chamando `mapPriceResponseToFlat()` (definido dentro de `useGravacaoPriceV2.ts`). Essa função já tem heurística `isNested` para suportar 2 formatos (nested v5.9 e flat v6.x), mas:

- A lógica de adaptação está **misturada** com o hook (478 linhas).
- Não há cobertura de testes para mudanças de schema.
- Quando o back mudar nomes de colunas (ex.: `preco_unitario` → `unit_price`, `valor_gravacao` → `subtotal_pieces`), teremos que caçar consumidores manualmente.
- O RPC `fn_get_product_customization_options` também precisa de adaptação (campos `cobra_por_cor`, `usa_dimensao`, `is_curved` podem virar `charges_per_color`, `uses_dimension`, `curved_surface`).

## Solução: Pasta `src/lib/personalization/adapters/`

Camada dedicada de tradutores entre **payloads externos** e **tipos canônicos do front**. O front continua falando o "idioma novo" (canônico), e os adapters traduzem **qualquer formato** que o back enviar (antigo, novo, futuro).

### Estrutura

```text
src/lib/personalization/adapters/
├── index.ts                          // Barrel exports
├── price-response.adapter.ts         // fn_get_customization_price (3 formatos)
├── customization-options.adapter.ts  // fn_get_product_customization_options
├── print-area.adapter.ts             // print_area_techniques rows
├── schema-detection.ts               // Detecta versão do payload
└── __tests__/
    ├── price-response.adapter.test.ts
    └── customization-options.adapter.test.ts
```

### 1. `schema-detection.ts` — Identifica versão

```ts
export type PriceSchemaVersion = 'v5.9-nested' | 'v6.x-flat' | 'v7-new' | 'unknown';

export function detectPriceSchema(resp: Record<string, unknown>): PriceSchemaVersion {
  if (resp.area && typeof resp.area === 'object' && 'id' in (resp.area as object)) return 'v5.9-nested';
  if ('preco_unitario' in resp && 'valor_gravacao' in resp) return 'v6.x-flat';
  if ('unit_price' in resp && 'subtotal_pieces' in resp) return 'v7-new'; // futuro
  return 'unknown';
}
```

### 2. `price-response.adapter.ts` — Tradutor unificado

- Migra `mapPriceResponseToFlat()` de `useGravacaoPriceV2.ts` para cá.
- Adiciona suporte a um **terceiro formato hipotético v7** (mapeando colunas renomeadas conhecidas).
- Avisa via `console.warn` (1x por sessão, deduplicado) quando recebe schema `unknown`.
- Retorna sempre o tipo canônico **`CustomizationPriceFlat`** (atual, intocado — front continua igual).

```ts
const RENAME_MAP_V7 = {
  unit_price: 'preco_unitario',
  subtotal_pieces: 'valor_gravacao',
  setup_total_value: 'setup_total',
  charges_per_color: 'cobra_por_cor',
  // ... lista evolui conforme back migra
};
```

### 3. `customization-options.adapter.ts`

Traduz a resposta de `fn_get_product_customization_options` para `CustomizationOptionsResponse` canônica. Hoje o front lê 12+ campos diretos (`cobra_por_cor`, `max_cores`, `usa_dimensao`, `is_curved`, `efetiva_largura_max`...). O adapter aceita aliases:

| Canônico (front) | Aliases aceitos |
|---|---|
| `cobra_por_cor` | `charges_per_color`, `price_by_color` |
| `usa_dimensao` | `uses_dimension`, `price_by_area` |
| `is_curved` | `curved`, `curved_surface` |
| `efetiva_largura_max` | `effective_max_width`, `max_width_effective` |
| `max_cores` | `max_colors` |

### 4. `print-area.adapter.ts`

Normaliza linhas de `print_area_techniques` (já consumidas em `fetch-print-areas.ts` e `simulationPriceFetcher.ts`).

### 5. Refator dos consumidores

Substituir em **6 arquivos** o import direto:

```ts
// antes
import { mapPriceResponseToFlat } from '@/hooks/useGravacaoPriceV2';

// depois
import { adaptPriceResponse } from '@/lib/personalization/adapters';
```

Manter `mapPriceResponseToFlat` em `useGravacaoPriceV2.ts` como **re-export deprecated** (`@deprecated use adaptPriceResponse`) por 1 ciclo, para não quebrar nada.

### 6. Testes (vitest)

- `price-response.adapter.test.ts`: 3 fixtures (nested, flat, novo hipotético) → todas devolvem `CustomizationPriceFlat` consistente.
- `customization-options.adapter.test.ts`: payload com nomes antigos e novos retorna a mesma struct canônica.
- Caso `unknown`: garante `console.warn` deduplicado e fallback seguro.

### 7. Telemetria leve

Em `schema-detection.ts`, contador in-memory por versão detectada (exposto via `window.__personalizationSchemaStats` em dev) — ajuda a saber **quando** o back parou de devolver o formato antigo, para podermos remover o tradutor v5.9.

## Compatibilidade

- Zero breaking change: os tipos canônicos (`CustomizationPriceFlat`, `CustomizationOptionsResponse`) **não mudam**.
- Os 6 consumidores existentes continuam funcionando após refator de import.
- O hook `useGravacaoPriceV2.ts` cai de 478 → ~280 linhas (adapter sai dele).

## Arquivos tocados

**Criados** (5):
- `src/lib/personalization/adapters/index.ts`
- `src/lib/personalization/adapters/price-response.adapter.ts`
- `src/lib/personalization/adapters/customization-options.adapter.ts`
- `src/lib/personalization/adapters/print-area.adapter.ts`
- `src/lib/personalization/adapters/schema-detection.ts`

**Editados** (8):
- `src/hooks/useGravacaoPriceV2.ts` (remove `mapPriceResponseToFlat`, re-exporta como deprecated)
- `src/hooks/useProductCustomizationOptions.ts`
- `src/hooks/useMockupTechniques.ts`
- `src/hooks/simulation/simulationPriceFetcher.ts`
- `src/hooks/simulator/useWizardPricing.ts`
- `src/hooks/simulator/useLivePricePreview.ts`
- `src/components/products/customization/ConfigurationPanel.tsx`
- `src/components/simulator/wizard/QuantityRangeComparison.tsx`

**Testes** (2):
- `tests/lib/personalization/adapters/price-response.adapter.test.ts`
- `tests/lib/personalization/adapters/customization-options.adapter.test.ts`

## Verificação

- `npx tsc --noEmit` limpo
- `npx vitest run tests/lib/personalization/adapters` passando
- Smoke: `/admin/external-db` (diff panel), simulador wizard (preview live) e mockup (seleção de técnica) continuam funcionais

