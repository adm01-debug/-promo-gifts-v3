## Problema

O `<Header />` global em `src/components/layout/Header.tsx` já está marcado como `sticky top-0 z-40`, mas **não fica fixo** ao rolar a página em nenhum módulo. A causa é o container pai em `src/components/layout/MainLayout.tsx` (linha 91):

```tsx
<div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden print:min-h-0">
```

O `overflow-x-hidden` transforma esse `<div>` em um **scroll container** (mesmo só no eixo X). A partir disso, o `position: sticky` do Header passa a ser ancorado a esse container — que tem altura igual ao conteúdo total da página — e por isso o header "rola junto" em vez de grudar no topo do viewport.

Isso afeta **todos os módulos** porque todos passam pelo `MainLayout`.

## Solução

Trocar `overflow-x-hidden` no wrapper do conteúdo por uma estratégia que evita scroll horizontal **sem criar scroll context** no eixo Y, preservando o sticky do Header em relação ao viewport.

### Mudança principal

**`src/components/layout/MainLayout.tsx`** — linha 91:

De:
```tsx
<div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden print:min-h-0">
```

Para:
```tsx
<div className="flex-1 flex flex-col min-h-screen min-w-0 print:min-h-0">
```

E mover a contenção horizontal para o `<main>` (que não envolve o Header), trocando linha 106:

De:
```tsx
className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 sm:pb-20 lg:pb-6 print:p-0 print:pb-0 outline-none"
```

Para:
```tsx
className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 sm:pb-20 lg:pb-6 print:p-0 print:pb-0 outline-none overflow-x-clip"
```

`overflow-x-clip` corta overflow horizontal **sem** criar scroll container (diferente de `overflow-x-hidden`), então não interfere em nenhum sticky de descendentes (ex.: toolbars sticky internas em /produtos, /pedidos, etc).

### Verificação adicional

Confirmar que o `<header>` no `Header.tsx` já está com `sticky top-0 z-40` (sim, linha 81) — nenhuma mudança necessária lá.

## Escopo

- Apenas `src/components/layout/MainLayout.tsx` (2 linhas).
- Resolve o problema em **todos os módulos** simultaneamente, pois todos compartilham o mesmo layout.
- Não muda visual, espaçamentos, ou comportamento de scroll — apenas restaura o sticky.

## Verificação manual após implementação

1. Catálogo (`/produtos`) — rolar e confirmar que header preto com busca/notificações fica fixo no topo.
2. Pedidos, Favoritos, Coleções, Admin — mesma verificação.
3. Confirmar que não surgiu scroll horizontal em telas estreitas (mobile/tablet).
4. Confirmar que toolbars sticky internas (ex.: filtros do catálogo) continuam grudando corretamente.

## Observação técnica

`overflow-x-clip` tem suporte total em Chrome 90+, Firefox 81+, Safari 16+ — coerente com o `target: 'esnext'` do projeto. Caso surja necessidade de compatibilidade com browsers muito antigos, alternativa é remover o overflow do wrapper e adicionar `max-w-full` + `overflow-x-clip` no `<main>` (mesmo efeito).
