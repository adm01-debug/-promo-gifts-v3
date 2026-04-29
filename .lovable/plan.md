## Diagnóstico

- **`Header`** (`src/components/layout/Header.tsx`) é `sticky top-0 z-40` — fixo no topo durante o scroll (já corrigido).
- **`PersistentBreadcrumbs`** (`src/components/common/PersistentBreadcrumbs.tsx`) existe e é completo (rotas, ícones, back, a11y), mas **NÃO está montado** no `MainLayout`. Há até um comentário enganoso em `AdminProductFormPage.tsx:344` ("Breadcrumbs are rendered by MainLayout's PersistentBreadcrumbs") — isso não corresponde à realidade.
- **`DynamicBreadcrumbs`** é usado pontualmente em `QuotesListPage.tsx` dentro do conteúdo da página (rola junto com o conteúdo).
- Resultado: hoje **nenhum breadcrumb persiste** durante o scroll em rotas globais.

## Objetivo

Quando há breadcrumb (rota ≠ `/`), ele deve ficar **fixo logo abaixo do Header** durante o scroll, formando uma hierarquia visual:

```text
┌─────────────────────────────────────────────┐
│ Header (sticky top-0, z-40, h-16)           │ ← sempre visível
├─────────────────────────────────────────────┤
│ Breadcrumb (sticky top-16, z-30, h-10)      │ ← sempre visível quando existe
├─────────────────────────────────────────────┤
│ Conteúdo da página (rola normalmente)       │
│                                             │
│  ↕ scroll                                   │
└─────────────────────────────────────────────┘
```

## Mudanças

### 1. `src/components/layout/MainLayout.tsx`

Inserir um wrapper sticky para o breadcrumb **entre** o `Header` (linha 100) e o `<main>` (linha 102):

```tsx
{/* Breadcrumb persistente — sticky abaixo do Header */}
<div
  className={cn(
    "sticky top-16 z-30 print:hidden",
    "bg-background/85 backdrop-blur-md",
    "border-b border-border/40",
    // Esconde-se em "/" (PersistentBreadcrumbs já oculta nas rotas vazias,
    // mas escondemos a barra inteira para não deixar borda solta na home)
    location.pathname === "/" && "hidden",
  )}
  data-testid="breadcrumb-bar"
>
  <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-2">
    <Suspense fallback={<div className="h-6" />}>
      <PersistentBreadcrumbs showBackButton />
    </Suspense>
  </div>
</div>
```

Adicionar:
- `import { useLocation } from "react-router-dom"` + `const location = useLocation();` (no topo do componente).
- `const PersistentBreadcrumbs = lazyWithRetry(() => import("@/components/common/PersistentBreadcrumbs").then(m => ({ default: m.PersistentBreadcrumbs })));` junto dos demais lazies (linha ~11).
- Importar `cn` se ainda não estiver.

**Por que `top-16` e `z-30`?**
- O `Header` mede `h-16` (64px) — confirmado pelo fallback `<div className="h-16" />` da linha 93.
- `z-30` deixa o breadcrumb abaixo do Header (`z-40`) e abaixo de modais/sheets (`z-50`), mas acima do conteúdo (`z-0`).
- `bg-background/85 backdrop-blur-md` segue o mesmo padrão visual do Header (transparente com blur), mantendo coesão.

### 2. `src/pages/QuotesListPage.tsx`

Remover o `<DynamicBreadcrumbs />` interno (linha 179) e o import (linha 51) — agora o breadcrumb global cobre essa rota e evita duplicação. Sem isso, o usuário veria 2 breadcrumbs em `/orcamentos`.

### 3. `src/pages/admin/AdminProductFormPage.tsx`

Atualizar/remover o comentário enganoso em `:344` para refletir que agora é verdade.

### 4. (opcional, leve) `src/components/common/PersistentBreadcrumbs.tsx`

Adicionar `data-testid="breadcrumb"` no `<nav>` para testes E2E. Sem mudança funcional.

## Hierarquia visual final

| Camada | z-index | Comportamento |
|--------|---------|---------------|
| Modais / Sheets / Dialog (Radix) | 50 | overlay |
| Header | 40 | `sticky top-0` |
| Breadcrumb bar | 30 | `sticky top-16` |
| ScrollToTop button | 30 | `fixed bottom-6 right-6` |
| Conteúdo | 0 | flow normal |

## Verificação manual (após deploy)

1. Acessar qualquer rota que não seja `/` (ex: `/produtos`, `/colecoes/foo`, `/orcamentos`) → ver Header + Breadcrumb empilhados no topo.
2. Rolar para baixo → ambos permanecem fixos, sem sobreposição, sem "flash".
3. Em `/` (catálogo home) → barra de breadcrumb não aparece (sem borda órfã).
4. Em `/orcamentos` → apenas **um** breadcrumb (o global), não dois.
5. Print (`window.print`) → ambos somem (`print:hidden`).

## Não vou mexer em

- Rotas públicas (`/lista-publica`, `/orcamento/:token`, `/colecao-publica`, `/comparar-publica`) — usam layouts próprios, não `MainLayout`.
- `Header.tsx` — já está sticky e correto.
- `DynamicBreadcrumbs` (componente separado) — segue disponível para casos onde alguém quer um breadcrumb inline customizado dentro do conteúdo (ex: páginas admin específicas que não usam MainLayout).
