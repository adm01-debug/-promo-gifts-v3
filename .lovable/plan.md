

# Plano: Módulo "Reposição" — Espelho do Módulo Novidades

## Objetivo
Criar o módulo `/reposicao` com layout, arquitetura e funcionalidades idênticas ao `/novidades`, focado em produtos que foram **repostos** (estoque atualizado) nos últimos 30 dias.

## Critério de Detecção de Reposição
Um produto é considerado "reposição" quando:
- `updated_at` está nos últimos 30 dias **E**
- `updated_at` é pelo menos 1 dia após `created_at` (descarta produtos recém-criados, que são "novidades")
- Isso captura produtos cujo estoque foi atualizado pelo fornecedor

## Arquivos a Criar

### 1. Hook de dados — `src/hooks/useReplenishments.ts`
Espelho do `useNovelties.ts` com:
- `ReplenishmentWithDetails` (mesma interface que `NoveltyWithDetails`, com campos adaptados: `replenished_at` em vez de `detected_at`)
- `useReplenishmentsWithDetails()` — busca produtos com `updated_at >= 30 dias` e `updated_at > created_at + 1d`
- `useReplenishmentStats()` — KPIs: repostos hoje, 7 dias, 15 dias, top fornecedor, total ativo
- `useReplenishmentCount()` — contagem para badge no sidebar
- Enriquecimento idêntico (categorias + fornecedores)

### 2. Hook de seleção — `src/hooks/useReplenishmentsSelectionMode.ts`
Cópia adaptada do `useNoveltiesSelectionMode.ts`, referenciando `ReplenishmentWithDetails`.

### 3. Componentes — `src/components/replenishments/`
- **`ReplenishmentStatsCards.tsx`** — KPIs (Repostos Hoje / 7d / 15d / Top Fornecedor / Total Ativo). Ícones adaptados (RefreshCw em vez de Sparkles).
- **`ReplenishmentProductGrid.tsx`** — Grid/Lista/Tabela com toolbar, filtros, busca, seleção em lote. Espelho do `NoveltyProductGrid.tsx`.
- **`ReplenishmentCards.tsx`** — Cards grid/tabela com badge "Reposição Xd" em vez de "Novidade Xd".
- **`RecentReplenishmentsWidget.tsx`** — Sidebar widget "Repostos Recentes" (espelho do `ExpiringNoveltiesWidget`).

### 4. Badge — `src/components/products/ReplenishmentBadge.tsx`
Badge dinâmico com cores baseadas na recência da reposição (mesmo padrão do `NoveltyBadge` mas com tom azul/info em vez de verde/success).

### 5. Página — `src/pages/ReplenishmentsPage.tsx`
Layout idêntico ao `NoveltiesPage.tsx`:
- StatsCards no topo
- Grid principal + Widget sidebar

### 6. Integração

- **Sidebar** (`SidebarReorganized.tsx`): Adicionar item "Reposição" com ícone `RefreshCw` logo abaixo de "Novidades"
- **Router** (`App.tsx`): Rota `/reposicao` → `ReplenishmentsPage`
- **Skeleton** (`SkeletonLoaders.tsx`): Incluir `/reposicao` no fallback de catálogo

## Diferenças Visuais vs Novidades
- Cor tema: **azul/info** em vez de verde/success
- Ícone principal: `RefreshCw` em vez de `Sparkles`/`Zap`
- Badge: "Reposição 3 dias" em vez de "Novidade 3 dias"
- Widget sidebar: "Repostos Recentes" com borda azul

## Arquivos Modificados
- `src/components/layout/SidebarReorganized.tsx` — novo item no menu
- `src/App.tsx` — nova rota lazy
- `src/components/layout/SkeletonLoaders.tsx` — fallback

## Total: ~10 arquivos (7 novos + 3 modificados)

