## Problema

A faixa preta no topo do conteúdo mostrando "🏠 Catálogo de Produtos" é o `PersistentBreadcrumbs`, renderizado globalmente em **todas as páginas** pelo `MainLayout`. Você quer removê-la para o conteúdo subir.

## Proposta

Em `src/components/layout/MainLayout.tsx` (linhas 110-112), remover o bloco:

```tsx
<div className="print:hidden">
  <PersistentBreadcrumbs className="mb-4" showBackButton />
</div>
```

O título principal ("Catálogo de Produtos · 6.090 itens" + busca + filtros) já é renderizado pelo `CatalogHeader` da página, então não há perda de contexto — apenas a faixa de breadcrumb redundante some e tudo sobe ~40px.

Também removerei o import não usado de `PersistentBreadcrumbs` no MainLayout.

## Impacto

- **Todas as páginas** que usam `MainLayout` (catálogo, orçamentos, coleções, admin etc.) deixam de exibir o breadcrumb superior.
- Páginas que precisam de breadcrumb específico (ex.: `AdminProductFormPage`) continuam funcionando, pois usam o componente diretamente.

## Arquivo afetado

- `src/components/layout/MainLayout.tsx`
