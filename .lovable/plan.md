

# Destaque do badge de validade do preço na PDP

Hoje a PDP já exibe um `PriceFreshnessBadge variant="inline"` abaixo do preço. O texto é pequeno e fácil de passar despercebido. Vou criar uma variante mais destacada **só para a PDP**, com pílula colorida, data absoluta visível e aviso explícito quando o preço estiver defasado.

## 1. Nova variante `pdp` no `PriceFreshnessBadge`

Arquivo: `src/components/products/PriceFreshnessBadge.tsx`

- Adicionar `"pdp"` ao union `variant`.
- Renderiza uma **pílula** (rounded-full, padding generoso, borda 1.5px) ao invés de texto solto:
  - `fresh` (verde): "Preço atualizado em DD/MM/AAAA · há Nd" — fundo `emerald-50`, borda `emerald-200`, texto `emerald-700`.
  - `aging` (âmbar suave): "Preço atualizado em DD/MM/AAAA · confirme se necessário" — fundo `amber-50`, borda `amber-200`, texto `amber-700`.
  - `stale` (âmbar forte/destaque): bloco em duas linhas — linha 1 "Preço pode estar defasado" em negrito, linha 2 "Última atualização: DD/MM/AAAA (há Nd)" — fundo `amber-100`, borda `amber-300`, ícone `AlertTriangle` à esquerda. Inclui call-to-action sutil "Confirme com o fornecedor".
  - `unknown`: pílula neutra "Data de atualização não informada".
- Mantém `role="status"`, tooltip Radix com texto longo, classes via `cn()`.
- Sem mudança de comportamento das variantes existentes (`inline`, `compact`, `icon-only`).

## 2. Trocar a variante usada na PDP

Arquivo: `src/pages/product-detail/ProductDetailHero.tsx` (linha 150-157)

- Trocar `variant="inline"` por `variant="pdp"`.
- Manter `alwaysShow` para garantir que aparece em qualquer status (inclusive `fresh`/`unknown`).
- Wrapper continua `mt-2`; remover o `text-xs` que vinha por herança — a pílula tem tamanho próprio.

## 3. Testes

Arquivo: `tests/components/PriceFreshnessBadge.test.tsx`

- Adicionar 3 casos para a nova variante:
  - `pdp` + `stale` → renderiza texto "defasado" e classe `amber-300`/`amber-100`.
  - `pdp` + `fresh` → renderiza data absoluta no formato `DD/MM/AAAA`.
  - `pdp` + `unknown` (priceUpdatedAt=null) → renderiza "não informada".

## Visual (referência)

```text
┌──────────────────────────────────────────────────────┐
│ A PARTIR DE                                          │
│ R$ 24,90 /un                                         │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ⚠  Preço pode estar defasado                     │ │
│ │    Última atualização: 12/02/2025 (há 72 dias)   │ │
│ │    Confirme com o fornecedor                     │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

Para `fresh`:
```text
[✓ Preço atualizado em 18/04/2026 · há 6 dias]
```

## Arquivos tocados

**Editados (2)**:
- `src/components/products/PriceFreshnessBadge.tsx` — nova variante `pdp`
- `src/pages/product-detail/ProductDetailHero.tsx` — usar `variant="pdp"`

**Editado (1, testes)**:
- `tests/components/PriceFreshnessBadge.test.tsx` — 3 casos novos

## Compatibilidade

- Zero breaking change: variantes existentes intactas, demais consumidores (Quick View, Sticky, Cards, Quote) não são tocados.
- A pílula respeita os tokens semânticos (`amber-*`, `emerald-*`) já usados no projeto e o padrão `font-display`.
- A11y mantida: `role="status"`, `aria-label`, tooltip via Radix.

