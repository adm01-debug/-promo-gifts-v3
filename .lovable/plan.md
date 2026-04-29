## Objetivo
Adicionar atalho de teclado para o item **"Carrinhos"** na sidebar, em paridade com os demais itens do grupo "Orçamentos" (`Novo Orçamento` = Alt+N, `Orçamentos` = Alt+O).

## Escolha da tecla
- Letras já usadas no escopo `Alt+*`: **N** (Novo Orçamento), **O** (Orçamentos), **P** (Produtos), **F** (Super Filtro / Favoritos no Header), **M** (Mockup), **S** (Simulador), **C** (Comparar — Header), **T** (Tema — Header).
- Proposta: **`Alt+R`** para "Ca**R**rinhos".
  - Letra livre, sem conflito com atalhos do navegador relevantes (Alt+R não tem ação padrão no Chrome/Firefox/Edge no Linux/Windows; no macOS Alt vira Option e teclas isoladas não disparam navegação).
  - Mnemônico: `R` de ca**R**rinhos (já que `C` está ocupado por "Comparar").
- Tooltip e aria-label exibirão `Alt+R`, padronizados com os demais itens via prop `shortcut` já existente em `SidebarNavGroup.tsx`.

## Mudanças

### 1. `src/components/layout/SidebarReorganized.tsx`
- Linha 67: adicionar `shortcut: "Alt+R"` ao item Carrinhos:
  ```ts
  { icon: ShoppingCart, label: "Carrinhos", href: "/carrinhos", shortcut: "Alt+R" },
  ```
- O loop `useEffect` (linhas 215-238) que monta o `shortcutMap` já é genérico — a navegação para `/carrinhos` via `Alt+R` passa a funcionar automaticamente. Nada mais a alterar nesse arquivo.

### 2. `src/hooks/useGlobalShortcuts.ts`
- Atualizar o comentário do registry (linha 10) para refletir o novo atalho:
  ```
  * Existing Alt shortcuts (sidebar): Alt+N novo orçamento, Alt+O orçamentos,
  *   Alt+R carrinhos, Alt+P produtos, Alt+F super filtro, Alt+M mockup,
  *   Alt+S simulador. Header: Alt+F favoritos, Alt+C comparar, Alt+T tema.
  ```
- Sem mudanças funcionais aqui (o hook só documenta os atalhos `Ctrl/Cmd`).

### 3. Testes — `src/components/layout/sidebar/__tests__/`
Atualizar as fixtures `quotesItems` (ou equivalente) para incluir `shortcut: "Alt+R"` no item Carrinhos nos arquivos:
- `SidebarNavGroup.harmony.test.tsx`
- `SidebarNavGroup.history.test.tsx`
- `SidebarNavGroup.collapse.test.tsx`
- `SidebarNavGroup.a11y.test.tsx`
- `SidebarNavGroup.suspense.test.tsx`

E adicionar **um novo arquivo** `SidebarNavGroup.shortcut-carrinhos.test.tsx` com cenários:
1. **Navegação por atalho**: `fireEvent.keyDown(window, { key: "r", altKey: true })` → assert que `navigate("/carrinhos")` foi chamado.
2. **Ignorar em inputs**: dentro de `<input>` focado, `Alt+R` não deve navegar.
3. **Ignorar com Ctrl/Meta**: `Alt+Ctrl+R` e `Alt+Meta+R` não devem navegar (paridade com a guarda existente).
4. **Tooltip/aria-label**: o item Carrinhos renderiza o hint `Alt+R` (paridade visual com `Alt+N` e `Alt+O`).
5. **Default-prevented**: `e.preventDefault()` é chamado quando o atalho dispara a navegação.

### 4. Memória
Atualizar `mem://features/keyboard-shortcuts-registry` adicionando linha `Alt+R → /carrinhos` na tabela de atalhos da sidebar, e atualizar `mem://index.md` se a descrição da entrada precisar de tweak (provavelmente não).

## Não-mudanças
- `Header.tsx` não é alterado (o atalho `Ctrl/Cmd+Shift+C` continua abrindo o **drawer** do carrinho — conceito diferente de navegar para a página `/carrinhos`).
- `SidebarNavGroup.tsx` já lê `item.shortcut` e renderiza o hint visual — sem alterações.

## Validação
- `npm run test -- SidebarNavGroup` passa com a fixture atualizada e o novo arquivo de teste.
- Manual no preview: pressionar `Alt+R` em qualquer rota navega para `/carrinhos`; o grupo "Orçamentos" expande e o item destaca conforme as regras já testadas em `active-match.test.ts`.
