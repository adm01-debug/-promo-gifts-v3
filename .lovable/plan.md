

# Selo "Preço atualizado em…" no produto

Adiciona um indicador visual da data em que o preço foi atualizado pelo fornecedor, com aviso quando estiver defasado. Dado vem do BD externo (catálogo) — sem duplicar localmente (SSOT).

## 1. Backend / dados

- **Coluna no BD externo (`products`)**: usar `price_updated_at` (timestamp). Confirmar nome real consultando o schema do Promobrind no primeiro passo da implementação; se a coluna existente for `preco_atualizado_em`, `last_price_update`, etc., mapear no adapter sem renomear no banco.
- **Alerta configurável por produto**: adicionar coluna opcional `price_freshness_threshold_days` (smallint, default `NULL`) no mesmo `products`. Quando `NULL`, usar fallback global de **60 dias**.
  - Se essa coluna ainda não existir, será necessária migração no BD externo (fora do nosso controle direto). Plano: detectar via `shouldFallbackSelect` e degradar suavemente para o fallback de 60 dias enquanto o admin do BD externo não cria a coluna.
- **Sem mudanças no BD local** (mantém política SSOT).

## 2. Camada de tipos e mapeamento

- `src/lib/external-db/product-types.ts`
  - Adicionar `price_updated_at?: string | null` e `price_freshness_threshold_days?: number | null` em `PromobrindProduct`.
  - Incluir os 2 campos em `PRODUCT_SELECT_FIELDS_WITH_SALE`, `PRODUCT_SELECT_FIELDS_LEGACY` e `PRODUCT_SELECT_FIELDS_DETAIL`.
  - Garantir que `shouldFallbackSelect` já cobre a regex genérica de "column does not exist" (cobre).
- `src/types/product-catalog.ts` — adicionar:
  ```ts
  priceUpdatedAt?: string | null;
  priceFreshnessThresholdDays?: number | null;
  ```
- `src/utils/product-mapper.ts` — propagar os 2 campos no objeto retornado.

## 3. Utilitário compartilhado

Novo arquivo `src/utils/price-freshness.ts`:

```ts
export type PriceFreshnessStatus = 'fresh' | 'aging' | 'stale' | 'unknown';
export interface PriceFreshness {
  status: PriceFreshnessStatus;
  daysSinceUpdate: number | null;
  thresholdDays: number;       // 60 por padrão
  label: string;               // "Preço atualizado há 12 dias"
  tooltip: string;             // texto longo
  shouldWarn: boolean;
}
export function getPriceFreshness(
  priceUpdatedAt: string | null | undefined,
  thresholdDays: number | null | undefined,
): PriceFreshness;
```

Regras:
- `unknown` → quando `priceUpdatedAt` ausente. Selo neutro "Data de atualização do preço indisponível".
- `fresh` → ≤ 50% do threshold (ex.: ≤ 30d quando threshold=60). Sem destaque, só tooltip.
- `aging` → entre 50% e 100% do threshold. Cor `muted-foreground` + ícone `Clock`.
- `stale` → > threshold. Cor `amber-600` (warning), ícone `AlertTriangle`, copy: "Preço pode estar defasado — confirme com o fornecedor".

## 4. Componente UI

Novo `src/components/products/PriceFreshnessBadge.tsx`:

- Props: `priceUpdatedAt`, `thresholdDays`, `variant?: 'inline' | 'compact' | 'icon-only'`.
- `inline` (PDP, Quick View): texto + ícone, tooltip com data absoluta (`pt-BR`) + dias relativos + threshold ativo.
- `compact` (Sticky header, Quote line): só "há Nd" + cor.
- `icon-only` (cards do catálogo): renderiza **apenas** quando `status === 'stale'` ou `aging` — evita poluir cards atualizados. Ícone com `aria-label`.

A11y: `role="status"` + tooltip via Radix; respeita padrão `var(--primary)` e `font-display`.

## 5. Integração nos consumidores

| Local | Arquivo | Variante | Quando aparece |
|-|-|-|-|
| PDP (abaixo do preço) | `src/pages/ProductDetail.tsx` (no header de preço) | `inline` | sempre |
| Quick View | `src/components/products/ProductQuickView.tsx` | `inline` | sempre |
| Sticky header | `src/components/products/ProductStickyHeader.tsx` | `compact` | apenas `stale`/`aging` |
| Card grid | `src/components/products/EnhancedProductCard.tsx` e `ProductCard.tsx` | `icon-only` | apenas `stale`/`aging` |
| Lista | `src/components/products/ProductListItem.tsx` | `compact` | apenas `stale`/`aging` |
| Tabela | `src/components/products/ProductTableView.tsx` | `icon-only` na coluna de preço | apenas `stale`/`aging` |
| Criador de Orçamentos | `src/components/quotes/builder/...` (linha do item) | `compact` | apenas `stale` |

## 6. Testes

- `tests/utils/price-freshness.test.ts`: cobre `unknown`, `fresh`, `aging`, `stale`, threshold custom (30/60/90), datas inválidas.
- `tests/utils/product-mapper.test.ts`: estender com asserções para `priceUpdatedAt`/`priceFreshnessThresholdDays`.
- `tests/components/PriceFreshnessBadge.test.tsx`: render por variante + classes de cor para cada status.

## 7. Documentação

- Atualizar `mem://integrations/product-image-standards-v2` ou criar nova memória curta `mem://features/price-freshness-indicator` registrando a regra (60d default, configurável por produto, fonte SSOT externa).

## Arquivos tocados

**Criados (3)**:
- `src/utils/price-freshness.ts`
- `src/components/products/PriceFreshnessBadge.tsx`
- `tests/utils/price-freshness.test.ts` + `tests/components/PriceFreshnessBadge.test.tsx`

**Editados (~10)**:
- `src/lib/external-db/product-types.ts` (3 SELECTs + tipo)
- `src/utils/product-mapper.ts`
- `src/types/product-catalog.ts`
- `src/pages/ProductDetail.tsx`
- `src/components/products/{ProductQuickView, ProductStickyHeader, EnhancedProductCard, ProductCard, ProductListItem, ProductTableView}.tsx`
- 1 componente do Quote Builder (linha do item)
- `tests/utils/product-mapper.test.ts`

## Compatibilidade e riscos

- **Zero breaking change**: campos opcionais; ausência → comportamento neutro ("indisponível" silencioso nos cards, badge sutil na PDP).
- Se `price_freshness_threshold_days` ainda não existir no BD externo, o fallback automático para 60d garante operação imediata; basta o admin do BD externo criar a coluna depois para habilitar a personalização por produto.
- SSOT preservado: nada é replicado no BD local.

