## Objetivo

Eliminar a ambiguidade do rótulo "Vendas 30d" — esse número **não é venda da Promo Brindes**, é a quantidade de unidades que **saíram do estoque do fornecedor** nos últimos 30 dias (campo `units_depleted` em `stock_daily_summary`). Vamos renomear o rótulo e deixar o tooltip explícito.

## Mudanças

### 1. Rótulo do label nos cards (3 arquivos)

Trocar `Vendas 30d` por `Saídas no Mercado 30d` em:

- `src/components/products/ProductCard.tsx` (linha 313)
- `src/components/novelties/NoveltyCards.tsx` (linha 128)
- `src/components/replenishments/ReplenishmentCards.tsx` (linha 173)

### 2. Tooltip do `ProductSparkline.tsx`

Pequenos ajustes textuais para deixar a fonte do dado clara:

- **Header** (linha 208): `Mercado · Dia {n}` permanece (já está correto), mas trocar para `Saídas no mercado · Dia {n}`.
- **Métrica principal** (linha 230): `Saídas 30d` → `Saídas no mercado 30d`.
- **Rodapé novo** (linha ~322, junto do "dados estimados"): adicionar uma linha de legenda **sempre visível** (não só quando demo):
  > *Proxy: unidades depletadas no estoque do fornecedor (não representa vendas da Promo Brindes).*

  Renderizada como `text-[9px] text-muted-foreground/60 italic` em uma faixa `border-t border-border/40 px-3 py-1` no final do tooltip.

### Detalhes técnicos

- Nenhuma mudança em hooks, queries ou schema. A fonte (`useSparklineSales` → `stock_daily_summary.units_depleted`) já está correta — só estamos rotulando com honestidade.
- Sem migração, sem edge function, sem mudança de tipos.
- Mobile: o label novo é mais longo ("Saídas no Mercado 30d" = 22 chars vs "Vendas 30d" = 10). O container atual usa `text-[9px] sm:text-[10px]` com `tracking-wider` — vai caber em uma linha em telas ≥sm; em mobile pode quebrar para 2 linhas, o que é aceitável dado o ganho de clareza. Se ficar feio podemos abreviar para `Saídas Mercado 30d` em uma iteração seguinte.

## Fora de escopo

- Não mexer no ranking "+ Vendidos Fornecedores" (já tem nome correto).
- Não mexer no ranking "+ Vendidos Promo Brindes" (esse sim é venda interna).
