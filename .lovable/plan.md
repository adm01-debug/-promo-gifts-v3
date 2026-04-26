## Objetivo

Adicionar `e2e/flows/12-cart-checkout.spec.ts` cobrindo o fluxo crítico de carrinho do vendedor:

1. Adicionar produto ao carrinho a partir do catálogo
2. Revisar/ajustar quantidade na página `/carrinhos`
3. Abrir o checkout (ação **Gerar Orçamento**) e confirmar que avança para `/orcamentos/novo`
4. Simular falha do backend e validar que a UI mostra erro claro (toast/alert) sem quebrar a página

## Mapeamento do fluxo real (descoberto na exploração)

- **Adicionar ao carrinho**: `QuickAddToQuote` (popover dentro de `ProductCardActions`). Botão final tem texto **"Adicionar ao Carrinho"**. Antes precisa garantir que existe um carrinho ativo (`activeCart`); se não houver, o teste cria via `/carrinhos/novo` + `CartCompanyPickerDialog`.
- **Revisar quantidade**: `/carrinhos` → `SortableCartItem` mostra stepper `+`/`-` com badge numérico tabular. Não há `aria-label` — usaremos seletor por estrutura (`button:has(svg.lucide-plus)` dentro do card do item).
- **Checkout**: `CartSidebar` → botão **"Gerar Orçamento"** abre `ConfirmDialog` → confirmar → app navega para `/orcamentos/novo` (nova rota com itens transferidos).
- **Erro de backend**: interceptamos via `page.route('**/rest/v1/seller_carts*', ...)` e/ou `**/functions/v1/external-db-bridge` retornando 500. Verificamos `[role="alert"]`/sonner toast com texto de erro.

## Estrutura do spec (`e2e/flows/12-cart-checkout.spec.ts`)

```text
describe Fluxo: Carrinho → Checkout
  beforeEach requireAuth()

  test 1 — adiciona item, ajusta quantidade e abre checkout
    - goto /produtos, abre 1º card → clica "Ações rápidas" → "Adicionar ao Carrinho"
    - se não houver carrinho ativo: goto /carrinhos/novo, escolhe 1ª empresa do dialog
    - retorna ao catálogo, repete add-to-cart, captura nome do produto
    - goto /carrinhos
    - localiza item pelo nome → clica botão "+" 2x → poll que badge mostra qty incrementada
    - clica "Gerar Orçamento" → confirma dialog
    - expect URL contains /orcamentos/novo OU toast de sucesso

  test 2 — falha de backend exibe erro e não quebra a UI
    - intercept page.route do POST/PATCH de carrinho ou edge function de quote → fulfill 500
    - repete adicionar ao carrinho (ou tenta gerar orçamento a partir de carrinho existente)
    - expect toast/alert com texto /erro|falha|tente novamente/i
    - expect página continua renderizada (heading "Carrinhos" visível, sem white-screen)
    - cleanup: remove rota mockada
```

## Padrões aplicados (alinhados aos outros specs)

- Importa de `../fixtures/test-base` + `requireAuth()` + `gotoAndSettle`
- `expect.poll` para estados assíncronos (qty, toast), zero `waitForTimeout` arbitrário
- Skip automático sem `E2E_USER_EMAIL/PASSWORD`
- Helpers locais `firstCatalogCard`, `addFirstProductToCart`, `ensureActiveCart`
- Cleanup best-effort no `afterEach` (esvazia o carrinho de teste se possível)
- Tolerante a variações de UI: usa `.or()` entre seletores por texto, role e estrutura

## Nenhuma mudança de produto

Apenas 1 arquivo novo: `e2e/flows/12-cart-checkout.spec.ts`. Sem alterações em código de aplicação, schema ou CI (a numeração `12-` já é coberta pelo glob `e2e/flows/*.spec.ts` da config Playwright existente).

## Como rodar localmente

```bash
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... \
  npm run test:e2e -- e2e/flows/12-cart-checkout.spec.ts
```
