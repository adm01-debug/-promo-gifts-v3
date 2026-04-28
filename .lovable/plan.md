## Objetivo

Adicionar cabeçalho padronizado (ícone + h1 + subtítulo) à página `/novidades`, alinhado ao padrão já usado em Favoritos, Pedidos e Clientes.

## Mudanças

### 1. `src/pages/NoveltiesPage.tsx`
Inserir bloco de cabeçalho antes de `<NoveltyStatsCards />`:

```tsx
<div className="flex items-center gap-3">
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
    <Sparkles className="h-5 w-5" />
  </div>
  <div className="min-w-0">
    <h1 data-testid="page-title-novidades" className="font-display text-2xl font-bold tracking-tight">
      Novidades
    </h1>
    <p className="text-sm text-muted-foreground">
      Produtos recém-chegados ao catálogo nos últimos 30 dias
    </p>
  </div>
</div>
```

Adicionar `import { Sparkles } from "lucide-react"`.

### 2. `src/lib/page-slugs.ts`
Adicionar `"novidades"` ao tipo `PageSlug` (atualmente 26 slugs → 27).

## Escopo

- Apenas a página Novidades nesta iteração (Reposição e Mockup Generator ficam para chamadas separadas, conforme a sua mensagem foca só em Novidades).
- Nenhum redesign de outros componentes; apenas adição do bloco de header.
- Breadcrumb global continua removido — o h1 + chip do header global cobrem o contexto.

## Verificação

- `data-testid="page-title-novidades"` permite que o spec `e2e/routes/app/novidades.spec.ts` valide o título via `Sel.page.title("novidades")` quando aplicável.
- Doc `docs/E2E_SMOKE_COVERAGE.md` é regenerada automaticamente pelo gate de CI.
