# Plano: E2E de todas as funcionalidades do sistema

## Contexto atual

A suíte E2E já é extensa (Playwright):

- `e2e/flows/01-19` — fluxos funcionais (auth, navegação, produtos, orçamentos, pedidos, kit-builder, coleções, favoritos×12, simulador, admin, errors, cart/checkout).
- `e2e/routes/app|admin|quotes|public` — specs por rota com padrão de 8 casos (render, happy, auth-fail, payload, timeout, 5xx, a11y, mobile).
- `e2e/flows/p0/01-05` — cenários P0 (catalog degraded, quote blocked, checkout blocked, admin down, auth recovery).
- Infra robusta: `global-setup/teardown`, `cleanup-client` com retry/backoff, `e2eName` policy, `Sel.*` SSOT só por `data-testid`.

Comparando com `src/pages/`, faltam specs por rota para várias funcionalidades. Este plano cobre as lacunas e adiciona uma **matriz smoke** que valida em uma única execução que **todas** as funcionalidades sobem sem erro.

## Escopo

### 1. Specs de rota faltantes (padrão das 8 verificações de `routes/README.md`)

**routes/app/** (autenticadas):
- `pedidos.spec.ts` — `/pedidos`
- `pedido-detail.spec.ts` — `/pedidos/:id`
- `clientes.spec.ts` — `/clientes`
- `cliente-detail.spec.ts` — `/clientes/:id`
- `cliente-comparator.spec.ts` — `/clientes/comparar`
- `simulador.spec.ts` — `/simulador`
- `simulador-wizard.spec.ts` — `/simulador/wizard`
- `simulador-precos.spec.ts` — `/simulador-precos`
- `personalizacao.spec.ts` — `/personalizacao`
- `kit-builder.spec.ts` — `/kit-builder`
- `kit-library.spec.ts` — `/kit-library`
- `mockup-generator.spec.ts` — `/mockup`
- `mockup-history.spec.ts` — `/mockup/historico`
- `magic-up.spec.ts` — `/magic-up`
- `novidades.spec.ts` — `/novidades`
- `tendencias.spec.ts` — `/tendencias`
- `business-intelligence.spec.ts` — `/bi`
- `comercial-intelligence.spec.ts` — `/inteligencia-comercial`
- `dashboard.spec.ts` — `/dashboard`
- `dashboard-customizavel.spec.ts` — `/dashboard/personalizar`
- `colecao-detail.spec.ts` — `/colecoes/:id`
- `replenishments.spec.ts` — `/reposicao`
- `stock-dashboard.spec.ts` — `/estoque`
- `dropbox.spec.ts` — `/dropbox`
- `product-match.spec.ts` — `/product-match`
- `advanced-price-search.spec.ts` — `/advanced-price-search`
- `seller-carts.spec.ts` — `/seller-carts`
- `engraving-registration.spec.ts` — `/cadastros/gravacao`
- `product-registration.spec.ts` — `/cadastros/produto`
- `system-status.spec.ts` — `/system-status`

**routes/admin/**:
- `roles.spec.ts` — `/admin/roles`
- `permissions.spec.ts` — `/admin/permissoes`
- `role-permissions.spec.ts` — `/admin/role-permissions`
- `migracao-papeis.spec.ts` — `/admin/migracao-papeis`
- `prompts-ia.spec.ts` — `/admin/prompts-ia`
- `ai-usage.spec.ts` — `/admin/ai-usage`
- `seguranca.spec.ts` — `/admin/seguranca`
- `seguranca-chaves.spec.ts` — `/admin/seguranca/chaves`
- `price-freshness.spec.ts` — `/admin/price-freshness`
- `workflows.spec.ts` — `/admin/workflows`
- `rate-limit.spec.ts` — `/admin/rate-limit`
- `telemetry.spec.ts` — `/admin/telemetry`
- `login-attempts.spec.ts` — `/admin/login-attempts`
- `video-variants.spec.ts` — `/admin/video-variants`

**routes/quotes/**:
- `templates.spec.ts` — `/orcamentos/templates`
- `detail.spec.ts` — `/orcamentos/:id`
- `approval.spec.ts` — `/orcamentos/:id/aprovar`

**routes/public/**:
- `kit-publico.spec.ts` — `/kit-publico/:token`

Cada spec usa `buildAuthedRouteSuite` / `buildPublicRouteSuite` em `e2e/routes/_factories.ts` — mantém o padrão de 8 casos com mocks `_shared.ts`. Sem rede real, sem flake.

### 2. Suíte agregadora "all-features" (smoke)

Novo arquivo `e2e/flows/20-all-features-smoke.spec.ts`:

- Itera sobre o **mapa central de rotas** (extraído de `src/App.tsx`) e valida para cada uma:
  1. carrega sem redirect para `/login` (quando autenticada),
  2. título da página visível via `Sel.page.title(slug)`,
  3. zero `pageerror` fatais (filtra `ResizeObserver`, `loading chunk`),
  4. nenhum `data-state="loading"` permanece após 5s.
- Roda em paralelo (workers default), tagged `@smoke`.

### 3. Matriz de funcionalidades cross-feature

Novo `e2e/flows/21-feature-matrix.spec.ts` validando interações que cruzam módulos:

- Produto → Favoritar → Adicionar a Coleção → Comparar → Criar Orçamento → Aprovar (fluxo end-to-end real, com `e2eName(...)` em todos os recursos criados).
- Catálogo → Filtro por cor/preço/categoria → Salvar busca → Aplicar.
- Carrinho → Salvar como Template → Reabrir Template.
- Mockup → Gerar → Adicionar ao Orçamento.
- Pedido aprovado → Ver detalhe → Sync Bitrix mockado.

Cada cenário usa helpers existentes (`favorites.ts`, `forms.ts`, `nav.ts`) e cria recursos com `createE2eQuote`, `createE2eCollection`, etc. Cleanup automático via `cleanupOnFailure` + `global-teardown`.

### 4. Helpers/infra

- `e2e/fixtures/selectors.ts`: adicionar entradas que faltarem (`Sel.page.title("clientes" | "tendencias" | …)`, `Sel.order.detail`, `Sel.kit.*`, `Sel.mockup.*`, `Sel.simulator.*`).
- `src/pages/*`: adicionar `data-testid="page-title-<slug>"` apenas onde ainda não existir (necessário para o smoke do item 2).
- `e2e/routes/_factories.ts`: revisar para garantir suporte a rotas dinâmicas (ex.: `/pedidos/:id` mockando 1 item).
- `playwright.config.ts`: adicionar tag `@smoke` ao `routes-mobile` se quisermos rodar smoke também em mobile (opcional).

### 5. Documentação

- Atualizar `e2e/routes/README.md` com a nova lista completa.
- Criar `mem://testing/e2e-coverage-matrix.md` listando rota × spec × tags, para detectar futuras lacunas automaticamente.

## Detalhes técnicos

```text
e2e/
├── flows/
│   ├── 20-all-features-smoke.spec.ts   (novo, @smoke)
│   └── 21-feature-matrix.spec.ts       (novo, cross-feature)
├── routes/
│   ├── app/        + ~30 specs novos
│   ├── admin/      + ~14 specs novos
│   ├── quotes/     + 3 specs novos
│   └── public/     + 1 spec novo
└── fixtures/
    └── selectors.ts                    (entradas adicionais)
```

Convenções obrigatórias mantidas:
- Apenas `data-testid` no SSOT `Sel.*` (sem text/role/aria/class).
- Recursos criados via `createE2e*` com prefixo `[E2E]`.
- Esperas baseadas em `expect.poll`/locator, sem `networkidle` ou `waitForTimeout` arbitrário.
- Mocks por `page.route()` em specs de rota; sem rede real.
- `requireAuth()`/`requireAdmin()` em specs que dependem de credenciais.

## Execução

```bash
# Tudo
npm run test:e2e

# Só smoke (rápido — valida que nada quebrou)
npx playwright test --grep @smoke

# Só rotas
npx playwright test --project=routes-public --project=routes-authed
```

## Entregáveis

- ~50 specs novos cobrindo todas as rotas de `src/pages/`.
- 2 specs agregadores (smoke + matriz cross-feature).
- `data-testid` adicionados onde faltavam.
- Documentação de cobertura atualizada e memória registrada.
