# Plano: tornar o glow laranja do sidebar mais discreto

## Diagnóstico

A "sombra" laranja que aparece ao redor do item ativo (ex.: "Estoque" no print) **não é uma `box-shadow` do item**. Os testes de regressão (`SidebarNoShadow`, `SidebarMobileRegression`) já garantem isso e por isso não conseguimos removê-la mexendo nos itens — não há nada para remover lá.

A fonte real é o **ambient glow global do dark mode**, declarado em `src/index.css`:

```text
.dark .ambient-glow::before  → radial laranja fixo no topo, 60vh, alpha 0.06
.dark .ambient-glow::after   → radial azul fixo no canto inferior direito, alpha 0.04
```

Esse `::before` é aplicado pelo `MainLayout.tsx` (`<div className="... ambient-glow">`) e ocupa os primeiros 60% da altura da viewport. Como o sidebar é escuro e fica exatamente nessa faixa, o gradiente vaza por trás dos itens visíveis e parece um halo/shadow ao redor do item ativo. Não é o item — é o fundo.

## O que será alterado

Apenas tokens CSS. Sem mexer em componente, sem novos arquivos, sem quebrar os testes de regressão existentes (eles validam ausência de `shadow-*` em itens, e nada disso muda).

### `src/index.css` — `.dark .ambient-glow::before`

Reduzir intensidade e área do glow laranja para que praticamente não toque o sidebar:

- Alpha: `0.06` → `0.025` (cerca de 60% mais discreto)
- Altura: `60vh` → `35vh` (não desce mais até a área dos itens do sidebar)
- Elipse: `80% 50% at 50% -10%` → `70% 40% at 50% -15%` (mais concentrado no topo, longe da lista)

### `src/index.css` — `.dark .ambient-glow::after`

Manter como está (é o glow azul do canto inferior direito, não interfere no sidebar).

## O que NÃO será alterado

- Nenhum item do sidebar (`SidebarMenuButton`, `SidebarNavGroup`, `SmartMobileNav`, `SidebarReorganized`).
- Nenhum dos tokens `--shadow-glow*` ou `--gradient-glow` (usados em cards, CTAs e focus a11y).
- Nenhum teste existente (`SidebarNoShadow.test.ts`, `SidebarMobileRegression.test.ts`, `SidebarNavGroup.harmony.test.tsx`) — todos continuam passando porque nada de `shadow-*` em item muda.
- O modo claro (`.ambient-glow` só tem efeito no `.dark`).

## Resultado esperado

O halo laranja sutil ao redor dos itens visíveis do sidebar (incluindo o item ativo "Estoque") fica visivelmente mais discreto, mantendo a identidade premium "neon laranja" do tema dark em hero/CTAs sem poluir a área de navegação.

Pronto para aprovar e aplicar?
