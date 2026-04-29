## Diagnóstico

Em `/` (sem breadcrumb) o Header gruda. Em `/orcamentos`, `/produtos`, `/favoritos`, `/colecoes`, `/comparar`, `/admin/*` (com breadcrumb), o Header desaparece ao rolar — apenas o breadcrumb fica fixo. O `<header>` permanece no DOM, mas suas regras `sticky top-0 z-40` não são honradas visualmente: o conteúdo rola por cima dele.

A causa mais provável é que a classe Tailwind `sticky` (compilada como `position: sticky`) está sendo derrotada por outra regra em alguma camada CSS específica desta árvore (já vimos `!important` no `index.css` para outros casos). O breadcrumb, que está em outro wrapper, não sofre o mesmo conflito.

## Correção

### 1. `src/components/layout/Header.tsx`
Forçar `position: sticky`, `top: 0` e `z-index: 50` via **inline style** (vence qualquer classe), removendo as classes equivalentes do `cn()`:

```tsx
return (
  <header
    data-testid="app-header"
    style={{
      "--header-h": `${headerHeightPx}px`,
      position: "sticky",
      top: 0,
      zIndex: 50,
    } as CSSProperties}
    className={cn(
      "border-b transition-all duration-300",
      "bg-card/95 backdrop-blur-md border-border",
      "h-[var(--header-h)]",
      isScrolled && "bg-card/98 backdrop-blur-lg shadow-md border-border/80",
    )}
  >
```

Subo `z-index` para 50 (era 40) garantindo que o Header fique acima do breadcrumb (z-30), de toolbars internas (z-20), do FAB QuickQuote, e de qualquer outro sticky de página.

### 2. `src/components/layout/MainLayout.tsx`
Adicionar `isolation: isolate` no container `<div className="flex-1 flex flex-col min-h-screen">` para criar um stacking context isolado, evitando que outros elementos da página (incluindo `transform`/`backdrop-blur` em descendentes) interfiram no sticky do Header:

```tsx
<div className="flex-1 flex flex-col min-h-screen min-w-0 print:min-h-0 isolate">
```

`isolate` é seguro: não muda layout nem cria containing block para `position: fixed`.

### 3. Verificação
Rotas a testar com scroll de ~1500px e screenshot do topo:
- `/` (catálogo, sem breadcrumb) — Header + toolbar Catálogo visíveis
- `/orcamentos` — Header + breadcrumb + chips de status visíveis empilhados
- `/produtos` — Header + breadcrumb visíveis
- `/favoritos` — Header + breadcrumb visíveis
- `/comparar` — Header + breadcrumb visíveis
- `/colecoes` — Header + breadcrumb + (BulkSelectionBar se houver seleção) visíveis
- `/admin/usuarios` — Header + breadcrumb visíveis

Se em alguma rota o Header ainda falhar, investigo o stacking context dessa rota especificamente (provavelmente `transform`/`filter` em algum wrapper de página) e adiciono `isolate` localmente.

## Observação

Não estou redesenhando nada — só forçando o `position: sticky` do Header via inline style para vencer qualquer conflito de specificity, e isolando o stacking context da coluna principal. Visual idêntico, comportamento corrigido em todas as rotas.
