## Objetivo

Eliminar a duplicação no grupo **CARRINHOS** da sidebar. Hoje aparecem dois itens (`+ Novo Carrinho` e `Carrinhos`) que entregam telas idênticas. Vai ficar **apenas um item "Carrinhos"** que leva à página de gestão (`/carrinhos`), onde o vendedor cria, lista e gerencia tudo pelo botão azul "+ Novo Carrinho" já existente no topo da página.

## Mudanças

### 1. `src/components/layout/SidebarReorganized.tsx`
No `navGroups`, no grupo `carts` (linhas 57–67), remover o item `+ Novo Carrinho` e manter só `Carrinhos`:

```ts
{
  id: "carts",
  label: "Carrinhos",
  icon: ShoppingCart,
  defaultOpen: true,
  items: [
    { icon: ShoppingCart, label: "Carrinhos", href: "/carrinhos", exact: true },
  ],
},
```

### 2. `src/pages/SellerCartsPage.tsx`
Remover o `useEffect` que detectava `/carrinhos/novo` e abria o modal automaticamente (lógica adicionada nas rodadas anteriores) — sem o atalho na sidebar, esse hook fica órfão e só polui a página.

### 3. `src/App.tsx` (verificar)
Se houver uma rota explícita `/carrinhos/novo` registrada, removê-la. Se a rota só existia implicitamente, nada a fazer.

### 4. `src/components/cart/CartCompanyPickerDialog.tsx`
Mantido como está — continua sendo aberto pelo botão "+ Novo Carrinho" no topo da página `/carrinhos`.

## Fora de escopo

- Layout interno da página `/carrinhos`.
- Comportamento do botão "+ Novo Carrinho" no header da página (continua igual).
