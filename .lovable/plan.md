## Resultado da auditoria

Verifiquei as 50+ páginas do app cruzando: `<h1>` na própria página, headers em componentes filhos dedicados (CatalogHeader, ProductDetailHero, CollectionDetailHeader, ClientDetailHeader, ProductStickyHeader) e o registro `page-title-*` (26 páginas canônicas).

### ✅ Páginas com cabeçalho adequado (todas que você citou)

- **Catálogo (`/`)** → `CatalogHeader` com h1 "Catálogo".
- **Filtros / Produtos (`/produtos`)** → h1 `page-title-produtos`.
- **Detalhe de Produto (`/produto/:id`)** → `ProductDetailHero` (h1 com nome do produto) + `ProductStickyHeader` (h2 sticky ao rolar).
- **Coleções / Detalhe da Coleção** → headers próprios (`page-title-colecoes` e `CollectionDetailHeader` com h1).
- **Clientes / Detalhe do Cliente** → `page-title-clientes` e `ClientDetailHeader` com h1 + nome fantasia.
- **Pedidos / Detalhe do Pedido** → h1 com `Pedido #PED-YY-XXXX`.
- **Orçamentos (lista, funil, dashboard, templates, builder, view, detail)** → todos com h1 próprio.
- **Favoritos, Comparador, Match, BI, Inteligência, Tendências, Magic Up, Mockup Histórico, Kits, Simuladores, Dashboard, Carrinhos, Dropbox, Cadastro de Produtos** → todos com `page-title-*` ou h1 inline.
- **Cadastro de Gravações (`/gravacoes`)** → renderiza dentro de `AdminCadastrosPage` como aba; o header da página-pai cobre. OK.

### ❌ Lacunas encontradas (3 páginas)

Estas páginas perderam contexto visual após a remoção do breadcrumb. O nome ainda aparece no Header global (chip de seção via `useCurrentSection`), mas não há h1, ícone ou subtítulo no corpo da página:

1. **`/novidades` — `NoveltiesPage.tsx`** — vai direto para `NoveltyStatsCards`. Sem título "Novidades" visível.
2. **`/reposicao` — `ReplenishmentsPage.tsx`** — vai direto para `ReplenishmentStatsCards`. Sem título "Reposição".
3. **`/mockup-generator` — `MockupGenerator.tsx`** — vai direto para o wizard de passos. Sem título "Gerador de Mockups".

## Plano de correção

Adicionar em cada uma das 3 páginas um cabeçalho compacto e padronizado, seguindo exatamente o padrão já usado por `FavoritesPage`, `OrdersPage`, `ClientsPage` (ícone em quadrado tonal + h1 + subtítulo curto).

### Padrão visual (idêntico ao já existente no app)

```text
┌────────────────────────────────────────────┐
│ ┌──┐  Título da Página                     │
│ │🎁│  Subtítulo curto explicando o módulo  │
│ └──┘                                        │
└────────────────────────────────────────────┘
```

### Mudanças por arquivo

**1. `src/pages/NoveltiesPage.tsx`** — adicionar antes de `<NoveltyStatsCards />`:
- Ícone `Sparkles` (ou `PackagePlus`) em chip `bg-primary/10`.
- `<h1 data-testid="page-title-novidades">Novidades</h1>` (registrar slug `novidades` em `PageSlug`).
- Subtítulo: "Produtos recém-chegados ao catálogo nos últimos 30 dias".

**2. `src/pages/ReplenishmentsPage.tsx`** — adicionar antes de `<ReplenishmentStatsCards />`:
- Ícone `RotateCw` (ou `PackageCheck`) em chip `bg-primary/10`.
- `<h1 data-testid="page-title-reposicao">Reposição</h1>` (registrar slug `reposicao`).
- Subtítulo: "Produtos repostos pelos fornecedores nos últimos 30 dias".

**3. `src/pages/MockupGenerator.tsx`** — adicionar antes do `<MockupWizard>`:
- Ícone `Wand2` em chip `bg-primary/10`.
- `<h1 data-testid="page-title-mockup-generator">Gerador de Mockups</h1>` (registrar slug `mockup-generator`).
- Subtítulo: "Crie mockups profissionais aplicando logos sobre produtos".

### Atualizações auxiliares

- `src/lib/page-slugs.ts` (ou onde está o tipo `PageSlug`): adicionar `"novidades"`, `"reposicao"`, `"mockup-generator"` aos 26 slugs canônicos atuais → 29.
- `docs/E2E_SMOKE_COVERAGE.md` será regenerado automaticamente pelo gate de CI ao rodar `scripts/e2e-smoke-coverage-doc.mjs`.

### O que **não** vou mexer

- Nenhum redesign das páginas em si — só adição do bloco de cabeçalho (memória `ui-redesign-protocol`: consultar antes de redesign).
- Não vou tocar em páginas que já têm h1 funcional, mesmo que o estilo varie (cada página tem sua identidade).
- Não vou adicionar/remover o item "Novidades" no menu.
- Componente `PersistentBreadcrumbs` permanece no repositório como código morto — posso removê-lo numa próxima iteração se você confirmar que não há intenção de revivê-lo.

## Resumo executivo

Catálogo, detalhes de produto/coleção/cliente/pedido/orçamento e todas as áreas principais **estão OK** após a remoção do breadcrumb — cada uma já tem seu próprio cabeçalho. Apenas 3 páginas secundárias (Novidades, Reposição, Mockup Generator) ficaram sem título visível no corpo e precisam do bloco padrão. Aprovação para implementar?