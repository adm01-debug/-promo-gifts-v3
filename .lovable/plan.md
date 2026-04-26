## Objetivo

Reduzir flakiness dos 11 specs E2E substituindo seletores frágeis (texto traduzido, `h1, h2`, `article`, fallbacks `text=...`) por `data-testid` estáveis. Também ampliar e padronizar `e2e/fixtures/selectors.ts` como SSOT, e atualizar specs/helpers para consumi-lo.

## Diagnóstico atual

- `e2e/fixtures/selectors.ts` cobre apenas 3 áreas (login, app, quotes) — subutilizado.
- Cobertura de `data-testid` no `src/` é mínima (~12 ocorrências, todas em Magic Up / Admin Connections).
- Specs usam padrões frágeis recorrentes:
  - `page.locator("h1, h2").first()` (04-quotes, 05-orders, etc.)
  - `text=/favoritos|carrinhos|sem.../i` (08, 12)
  - Cadeias longas `'[data-testid="product-card"], article:has(...), [role="article"]:has(...)'`
  - `button[type="submit"]` global em login
  - `nav >> text=Label` para sidebar
  - `input, [role="tablist"], [data-testid*="step"]` (04-quotes)

## Mudanças propostas

### 1. Adicionar `data-testid` no `src/` (apenas pontos críticos consumidos pelos testes)

| Componente | testid | Usado por |
|---|---|---|
| `LoginForm` (form, email, password, submit, toggle senha, link "esqueci") | `login-form`, `login-email-input`, `login-password-input`, `login-submit`, `login-password-toggle`, `login-forgot-link` | 01-auth, login.spec, auth.spec |
| `AppSidebar` link items (cada `NavLink`) | `sidebar-link-{slug}` | 02-navigation |
| Page headings das rotas principais (`Catálogo`, `Orçamentos`, `Pedidos`, `Coleções`, `Favoritos`, `Kit Builder`, `Simulador`, `Carrinhos`) | `page-title-{slug}` | 03–09 |
| `ProductCard` (raiz, nome, botão favorito, botão carrinho, link detalhe) | `product-card`, `product-card-name`, `product-card-favorite`, `product-card-add-cart`, `product-card-link` | 03, 08, 12 |
| Wizard de orçamento (stepper + cada step) | `quote-wizard`, `quote-step-{n}` | 04 |
| Lista de favoritos + item + botão remover | `favorites-list`, `favorite-item`, `favorite-remove` | 08 |
| Carrinho/checkout (drawer, item qty, increment, checkout cta, dialog confirm) | `cart-drawer`, `cart-item`, `cart-qty-input`, `cart-qty-increment`, `cart-checkout-cta`, `cart-confirm-dialog` | 12 |
| Toast/erro genérico (já cobertos por sonner/role=alert — manter) | — | 11 |

### 2. Refatorar `e2e/fixtures/selectors.ts`

Reescrever como SSOT completo, agrupado por domínio, retornando objetos `Locator`-friendly (strings padronizadas `[data-testid="..."]` com fallback documentado em comentário). Estrutura:

```text
Sel.login.{form,email,password,submit,toggle,forgot}
Sel.sidebar.link(slug)
Sel.page.title(slug)
Sel.product.{card,name,favorite,addCart,link}
Sel.quote.{wizard,step(n),newButton}
Sel.favorites.{list,item,remove}
Sel.cart.{drawer,item,qty,increment,checkoutCta,confirmDialog}
Sel.app.{toast,errorBanner}
```

Manter `Sel.app.toast`/`errorBanner` como estão (já robustos por role).

### 3. Atualizar os 11 specs + helpers

Substituir literais frágeis por `Sel.*` em:

- `e2e/flows/01-auth.spec.ts` … `12-cart-checkout.spec.ts` (12 arquivos — os "11 specs" + o novo `12-cart-checkout`)
- `e2e/auth.spec.ts`, `e2e/login.spec.ts`, `e2e/navigation.spec.ts`, `e2e/quote-create.spec.ts`, `e2e/quote-approval.spec.ts`, `e2e/discount-approval.spec.ts`, `e2e/mockup-generate.spec.ts`, `e2e/protected-routes.spec.ts` (se compartilharem padrões)
- `e2e/helpers/forms.ts` e `e2e/helpers/nav.ts` para usar `Sel`

Padrão de migração (exemplo):

```ts
// antes
await page.fill("#login-email", email);
await page.click('button[type="submit"]');
await expect(page.locator("h1, h2").first()).toBeVisible();

// depois
await page.fill(Sel.login.email, email);
await page.click(Sel.login.submit);
await expect(page.locator(Sel.page.title("orcamentos"))).toBeVisible();
```

### 4. Documentação

Atualizar `e2e/README.md` com seção "Convenção de seletores":
- Regra: sempre via `Sel` do `selectors.ts`.
- Quando criar novo componente testado por E2E, adicionar `data-testid` seguindo o padrão `kebab-case` por domínio.

## Detalhes técnicos

- Não alterar comportamento visual nem props públicas — apenas atributos `data-testid` adicionais.
- `data-testid` permanece em produção (decisão deliberada — overhead trivial, ganha estabilidade).
- Manter fallbacks `or(...)` somente onde o componente ainda não tem testid (transição gradual). Marcar com `// TODO: remover fallback após adicionar testid em <Componente>`.
- Sem mudanças em rotas, RLS, edge functions ou banco.

## Arquivos afetados

Criar/editar:
- `e2e/fixtures/selectors.ts` (reescrever)
- `e2e/README.md` (seção nova)
- `e2e/helpers/forms.ts`, `e2e/helpers/nav.ts`
- 12 specs em `e2e/flows/*.spec.ts`
- 8 specs legados em `e2e/*.spec.ts` (passagem mais leve, só onde se aplica)
- ~10 componentes em `src/` para adicionar `data-testid` (LoginForm, AppSidebar, ProductCard, headings das páginas-alvo, wizard de orçamento, drawer de carrinho, lista de favoritos)

## Fora de escopo

- Não rodar o suite (ambiente atual não executa Playwright); validação será feita pelo usuário.
- Não criar novos specs.
- Não mexer em lógica de cleanup, auth.setup ou edge functions.
