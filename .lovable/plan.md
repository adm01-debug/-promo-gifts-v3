## Diagnóstico (causa raiz)

O Header global **está** sticky, mas tem **altura dinâmica**:

```tsx
// src/components/layout/Header.tsx:85-87
isScrolled
  ? "bg-card/98 ... h-11 sm:h-12"  // 44px mobile / 48px desktop
  : "h-12 sm:h-14"                  // 48px mobile / 56px desktop
```

E na rota `/` (`src/pages/Index.tsx:62`) há **outra barra sticky** dentro do `<main>`:

```tsx
<div className="sticky top-0 z-20 ..."> {/* ← cola no topo da viewport! */}
  <CatalogToolbar ... />
</div>
```

Como ela usa `top-0`, ela cola no **topo absoluto da viewport**, sobrepondo / brigando com o Header global (que tem `z-40` mas a toolbar tem `z-20`, então o Header passa POR CIMA dela visualmente — o que dá a impressão de que "o topo desapareceu" quando na verdade o que sumiu foi a toolbar interna sob o Header).

Pior: meu fix anterior do breadcrumb usou `top-16` (64px) e Suspense fallback `<div className="h-16" />` (64px), mas o Header nunca chega a 64px (máx 56px). Isso cria um **gap de 8px** entre Header e Breadcrumb durante o scroll.

E na rota `/orcamentos` há mais uma barra similar (vou checar todas as toolbars sticky).

## Solução

Centralizar a altura do Header em uma **CSS variable** `--header-h` definida pelo próprio Header, e fazer todos os stickys filhos referenciarem essa variável. O breadcrumb também expõe `--breadcrumb-h`. Toolbars internas usam `top-[calc(var(--header-h)+var(--breadcrumb-h))]`.

Isso resolve os 3 sintomas de uma vez:
1. Breadcrumb encosta exatamente abaixo do Header em qualquer estado (sem gap).
2. Toolbar do catálogo cola abaixo de Header+Breadcrumb (não no topo da viewport).
3. Quando o Header encolhe ao scrollar, breadcrumb e toolbar se reposicionam automaticamente.

## Mudanças

### 1. `src/components/layout/Header.tsx`

Substituir as classes `h-11 sm:h-12` / `h-12 sm:h-14` por uma única altura `h-[var(--header-h)]` e definir `--header-h` via `style` no próprio `<header>`:

```tsx
const headerHeightPx = isScrolled ? 48 : 56;

return (
  <header
    data-testid="app-header"
    style={{ "--header-h": `${headerHeightPx}px` } as React.CSSProperties}
    className={cn(
      "sticky top-0 z-40 border-b transition-all duration-300",
      "bg-card/95 backdrop-blur-md border-border",
      "h-[var(--header-h)]",
      isScrolled && "bg-card/98 backdrop-blur-lg shadow-md border-border/80",
    )}
  >
```

Também propagar a var para o `<html>` via `useEffect` para que stickys fora da árvore do Header (improvável, mas defensivo) também leiam:

```tsx
useEffect(() => {
  document.documentElement.style.setProperty("--header-h", `${headerHeightPx}px`);
}, [headerHeightPx]);
```

Trade-off: a animação `transition-all` antes interpolava a classe Tailwind (que não anima entre classes); agora interpola o valor numérico via CSS var → animação real e suave.

### 2. `src/components/layout/MainLayout.tsx`

Trocar:
```tsx
<Suspense fallback={<div className="h-16" />}>     // ← errado (64px)
  <Header ... />
```
por:
```tsx
<Suspense fallback={<div style={{ height: 56 }} />}> // altura "expandida" padrão
```

Trocar a barra do breadcrumb:
```tsx
<div className={cn(
  "sticky top-[var(--header-h,56px)] z-30 print:hidden",  // ← antes: top-16
  "bg-background/85 backdrop-blur-md",
  "border-b border-border/40",
  location.pathname === "/" && "hidden",
)}
  style={{ "--breadcrumb-h": "40px" } as React.CSSProperties}
  data-testid="breadcrumb-bar"
>
```

Propagar `--breadcrumb-h` ao `<html>` via `useEffect` no `MainLayout` baseado em `location.pathname === "/"` (40px ou 0px):

```tsx
useEffect(() => {
  const h = location.pathname === "/" ? 0 : 40;
  document.documentElement.style.setProperty("--breadcrumb-h", `${h}px`);
}, [location.pathname]);
```

### 3. `src/pages/Index.tsx` (linha 62)

Trocar:
```tsx
<div className="sticky top-0 z-20 ...">           // ← cola no topo da viewport
```
por:
```tsx
<div className="sticky top-[calc(var(--header-h,56px)+var(--breadcrumb-h,0px))] z-20 ...">
```

Para `/` (home) o breadcrumb-h é 0, então fica abaixo só do Header (~56px). Para `/produtos` (se o catálogo for usado lá) ficaria abaixo de Header+Breadcrumb (~96px).

### 4. Buscar e corrigir outros `sticky top-0` internos

Vou rodar `rg "sticky top-0" src/pages src/components -l` e atualizar todas as ocorrências que ficam dentro de `<main>` (sob o Header) para usar a mesma fórmula `top-[calc(var(--header-h,56px)+var(--breadcrumb-h,0px))]`. Casos esperados: barras de filtro, toolbars de listas, abas. Modais/popovers/sidebars NÃO mudam.

## Verificação

Após aplicar, vou usar o browser em viewport 1280×800 para:

1. Abrir `/` (catálogo) → screenshot inicial → scroll 800px → screenshot.
   - Esperado: Header global "Catálogo / Busca inteligente / ícones" + toolbar "Filtros / Sort / Layout" empilhados visíveis no topo, sem gap, sem sobreposição.
2. Abrir `/produtos` → mesmo teste com Header + Breadcrumb + (se houver) toolbar.
3. Abrir `/orcamentos` → Header + Breadcrumb visíveis após scroll.

Se passar, fecho a tarefa. Se não, reporto e ajusto.

## Observação

Não vou redesenhar nada — apenas ancorar corretamente os stickys que já existiam. Visual idêntico, comportamento correto.
