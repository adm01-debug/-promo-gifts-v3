

# Testes do badge "preço atualizado em…" na PDP

Garantir que, quando o `priceUpdatedAt` chega via `mapPromobrindToProduct` e é repassado ao `ProductDetailHero`, a PDP renderiza corretamente o `PriceFreshnessBadge variant="pdp"` em todos os estados (fresh / aging / stale / unknown).

## 1. Investigar o contrato atual da PDP

Antes de escrever os testes, conferir 2 pontos rápidos via `code--view`:
- `src/pages/product-detail/ProductDetailHero.tsx` — props que recebe e como propaga `priceUpdatedAt` / `priceFreshnessThresholdDays` para o badge.
- `src/utils/product-mapper.ts` — formato de saída de `mapPromobrindToProduct` (já temos teste cobrindo a propagação dos campos).

Isso confirma o shape mínimo de produto necessário para montar o teste de integração leve.

## 2. Novo arquivo: `tests/pages/ProductDetailHero.priceFreshness.test.tsx`

Teste **focado** no `ProductDetailHero` (não na rota inteira), montando-o com um produto mockado. Cobre 4 cenários:

1. **Fresh (5 dias atrás)** → renderiza pílula esmeralda com data `DD/MM/AAAA` e texto "atualizado em".
2. **Aging (45 dias, threshold 60)** → renderiza pílula âmbar suave sugerindo confirmação.
3. **Stale (90 dias, threshold 60)** → renderiza bloco âmbar com "defasado", data absoluta e CTA "Confirme com o fornecedor".
4. **Unknown (`priceUpdatedAt: null`)** → renderiza pílula neutra "não informada".

Estrutura:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProductDetailHero } from "@/pages/product-detail/ProductDetailHero";

const FIXED_NOW = new Date("2026-04-24T12:00:00.000Z").getTime();
const daysAgo = (d: number) => new Date(FIXED_NOW - d * 86400000).toISOString();

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(FIXED_NOW); });
afterAll(() => { vi.useRealTimers(); });

function makeProduct(overrides) {
  return {
    id: "p-1", name: "Caneta", sku: "CAN-1", price: 10,
    images: ["/x.png"], colors: [], variations: [],
    category: { id: "c", name: "Escrita" },
    supplier: { id: "s", name: "Fornec" },
    stockStatus: "in-stock", featured: false,
    priceUpdatedAt: null, priceFreshnessThresholdDays: 60,
    ...overrides,
  };
}

const renderHero = (product) =>
  render(
    <MemoryRouter>
      <ProductDetailHero product={product} /* …props mínimas */ />
    </MemoryRouter>,
  );
```

Asserts via `screen.getByRole("status")` + regex no `textContent` / `className` — mesmo padrão dos testes existentes em `tests/components/PriceFreshnessBadge.test.tsx`.

## 3. Estender `tests/utils/product-mapper.test.ts`

Adicionar 1 caso novo confirmando que, ao receber `price_updated_at: "2026-03-20T..."` do BD externo, o produto mapeado entrega `priceUpdatedAt` no formato ISO **sem mutação** (já existe teste de propagação, mas o novo caso explicita o cenário "veio preenchido → chega na UI"). Pequena adição de 1 `it(...)`.

## 4. Mocks necessários

O `ProductDetailHero` provavelmente usa hooks de catálogo / favoritos / coleções / preço. Estratégia:
- Identificar via `code--view` quais hooks o `ProductDetailHero` consome.
- Mockar **só** o que for necessário para o componente renderizar (ex.: `vi.mock("@/hooks/useFavorites", () => ({ useFavorites: () => ({ ... }) }))`).
- Manter o badge real (sem mock) — ele é o sob-teste.

Se o componente for muito acoplado, fallback: testar via composição mínima que renderize só o bloco de preço + badge, isolando a regressão ao contrato `priceUpdatedAt → badge`.

## 5. Arquivos tocados

**Criados (1)**:
- `tests/pages/ProductDetailHero.priceFreshness.test.tsx` — 4 cenários (fresh/aging/stale/unknown).

**Editados (1)**:
- `tests/utils/product-mapper.test.ts` — +1 asserção de "preço atualizado vindo do BD externo chega no campo `priceUpdatedAt`".

## Compatibilidade

- Zero mudança de produção. Apenas testes adicionais.
- Reusa `vi.useFakeTimers()` + `daysAgo()` no mesmo padrão dos testes já existentes do `PriceFreshnessBadge`, mantendo determinismo.
- Se hooks pesados do `ProductDetailHero` exigirem muitos mocks, o plano permite cair para testes focados no bloco de preço — sem comprometer a cobertura do contrato.

