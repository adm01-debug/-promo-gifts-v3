## Objetivo

Remover o grupo **CARRINHOS** da sidebar e mover o item "Carrinhos" para dentro do grupo **ORÇAMENTOS**, ficando logo abaixo de "Orçamentos".

## Resultado visual

```text
ORÇAMENTOS                    ▾
  + Novo Orçamento     Alt+N
  Orçamentos           Alt+O
  Carrinhos
```

## Mudança

### `src/components/layout/SidebarReorganized.tsx` (linhas 58–76)

Remover o grupo `carts` inteiro e adicionar o item "Carrinhos" como terceira entrada do grupo `quotes`:

```ts
{
  id: "quotes",
  label: "Orçamentos",
  icon: FileText,
  defaultOpen: true,
  items: [
    { icon: Plus, label: "Novo Orçamento", href: "/orcamentos/novo", isCta: true, shortcut: "Alt+N" },
    { icon: FileText, label: "Orçamentos", href: "/orcamentos", tourId: "quotes", exact: true, shortcut: "Alt+O" },
    { icon: ShoppingCart, label: "Carrinhos", href: "/carrinhos", exact: true },
  ],
},
```

Nada mais muda — rota `/carrinhos`, página `SellerCartsPage` e o botão "+ Novo Carrinho" no topo da página continuam iguais.
