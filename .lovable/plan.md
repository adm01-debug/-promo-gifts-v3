## Objetivo

Harmonizar visualmente os três itens do grupo "Orçamentos" na sidebar — **Novo Orçamento**, **Orçamentos** e **Carrinhos** — para que sigam exatamente o mesmo padrão de layout, espaçamento, cores e tipografia. Hoje o "Novo Orçamento" é renderizado como CTA destacado (gradiente laranja, borda, fundo, texto em negrito laranja), o que quebra a harmonia visual com os outros dois itens.

## Comparativo atual

| Item | Estilo |
|---|---|
| Novo Orçamento | Fundo `bg-gradient-to-r from-orange/15 to-orange/5`, borda `border-orange/30`, ícone `text-orange/70`, texto `text-orange/80 font-medium`, hover com sombra laranja |
| Orçamentos | Estilo padrão: texto `text-sidebar-foreground/60`, hover `bg-sidebar-accent/50`, sem fundo nem borda |
| Carrinhos | Idêntico ao "Orçamentos" |

## Mudanças

### 1. `src/components/layout/sidebar/SidebarNavGroup.tsx`

- **Remover toda a lógica de CTA** (`isCta`) na renderização do `NavLink` (linhas ~163, 173, 174, 177, 186, 190).
- O item passa a usar o **mesmo conjunto de classes** que "Orçamentos" e "Carrinhos":
  - Container: `hover:bg-sidebar-accent/50` em qualquer estado não-ativo.
  - Ícone: `group-hover:text-orange/70` (sem variação para CTA).
  - Label: `truncate text-sm flex-1` (sem `text-orange/80 font-medium`).
  - Indicador lateral laranja (`before:`) presente em todos os itens igualmente — mantém afordância de hover/active uniforme.
- Manter `Plus` como ícone e o `kbd` "Alt+N" como atalho — esses são os únicos diferenciais permitidos (já são consistentes com "Alt+O" do item "Orçamentos").

### 2. Tipo `NavItem`

- Manter o campo `isCta?: boolean` como opcional para não quebrar nada, mas ele deixa de ter efeito visual. Alternativa: remover de vez. **Decisão**: remover do tipo e de `SidebarReorganized.tsx` (linha 65) para evitar dead code.

### 3. Não alterar

- `SidebarReorganized.tsx`: apenas remover a flag `isCta: true` da linha 65.
- Nenhuma mudança em `active-match.ts`, testes, ou comportamento do grupo "Orçamentos" (auto-open, destaque ativo continuam funcionando).

## Resultado esperado

Os três itens — Novo Orçamento, Orçamentos, Carrinhos — ficam com:
- Mesmo padding (`px-3 py-2`), mesmo `rounded-lg`, mesmo `gap-3`.
- Mesma cor de texto e ícone em estado idle, hover e active.
- Mesmo comportamento do indicador lateral laranja (`before:`).
- Mesma renderização do `kbd` de atalho à direita.
- Único diferencial visual entre eles é o ícone (`Plus` / `FileText` / `ShoppingCart`) e o label.

## Arquivos a modificar

- `src/components/layout/sidebar/SidebarNavGroup.tsx` — remover branches `isCta` na renderização.
- `src/components/layout/SidebarReorganized.tsx` — remover `isCta: true` do item "Novo Orçamento".
- (Opcional) remover `isCta?: boolean` do tipo `NavItem`.
