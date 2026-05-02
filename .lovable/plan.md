## Remover efeito de sombra do sidebar de navegação

Pelas screenshots, o "efeito sombra" são os **glows laranjas** (`shadow-glow`) e sombras suaves (`shadow-soft`, `shadow-md shadow-primary/20`) aplicados nos itens do sidebar e no logo da marca. Vou removê-los mantendo:
- Cores e tipografia (laranja para item ativo)
- Indicador de barra lateral (`before:` pseudo-element) que marca o item ativo
- Estados de foco (`focus-visible:ring`) — necessários para acessibilidade

### Alterações

**1. `src/components/layout/sidebar/SidebarNavGroup.tsx`**
- Linha 122: remover `shadow-glow` do estado "tem filho ativo"
- Linha 123: remover `hover:shadow-soft` do hover de grupos
- Linha 174: remover `shadow-glow` do `NavLink` ativo
- Linha 175: remover `hover:shadow-soft` do hover de itens
- Linha 251: remover `shadow-glow` do botão colapsado com item ativo

**2. `src/components/layout/sidebar/SidebarBrandHeader.tsx`**
- Linhas 13 e 23: remover `shadow-md shadow-primary/20` do bloco do logo Promo Gifts (mantém o `bg-gradient-primary`)

### Não vou tocar

- `PanelComponents.tsx` (`shadow-2xl`) — é um Drawer/Panel genérico, não o sidebar de navegação
- `ui/sidebar.tsx` — sombras de variantes `floating`/`inset` do shadcn não estão em uso aqui
- `Header.tsx` — é o topbar, não o sidebar
- `shadow-glow-focus` (apenas em `:focus-visible`) — acessibilidade de teclado

### Resultado esperado

Sidebar com itens ativos destacados apenas por **fundo laranja translúcido + texto laranja + barra lateral**, sem nenhum brilho/halo ao redor dos botões nem sombra sob o logo.