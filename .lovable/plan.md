## Problema

Hoje os dois itens da sidebar (**"+ Novo Carrinho"** e **"Carrinhos"**) levam a telas visualmente idênticas. As rotas `/carrinhos` e `/carrinhos/novo` renderizam o mesmo `SellerCartsPage` sem qualquer diferença de comportamento — `/carrinhos/novo` é uma rota "fantasma" que não dispara nada.

## Objetivo

Ao clicar em **"+ Novo Carrinho"** na sidebar, o usuário deve cair em `/carrinhos` com o **modal de seleção de empresa já aberto** (mesmo comportamento do botão azul "+ Novo Carrinho" no topo da página).

## Mudanças

### 1. `src/pages/SellerCartsPage.tsx`
Detectar quando a rota é `/carrinhos/novo` e abrir o modal automaticamente:
- Ler `useLocation()` e, se `pathname === "/carrinhos/novo"`, chamar `s.setShowNewCart(true)` em um `useEffect` (uma única vez por navegação).
- Após abrir, fazer `navigate("/carrinhos", { replace: true })` para limpar a URL — assim o usuário não fica preso na rota `/novo` se fechar o modal e não polui o histórico.

### 2. `src/App.tsx`
Manter as duas rotas (`/carrinhos` e `/carrinhos/novo`) renderizando `SellerCartsPage` — a rota `/novo` continua existindo só como gatilho de UX, sem precisar de componente próprio.

### 3. `src/components/layout/SidebarReorganized.tsx`
Sem mudança de href. O item **"+ Novo Carrinho"** continua apontando para `/carrinhos/novo`, que agora tem comportamento real.

## Detalhes técnicos

- Usar uma flag local (`useRef`) para garantir que o modal só abre **uma vez** por entrada na rota `/novo` — evita reabrir se o usuário fechar e ficar na página.
- O `navigate("/carrinhos", { replace: true })` é disparado **junto** com o `setShowNewCart(true)`, de forma que o estado `showNewCart` (controlado pelo `useSellerCartsPage`) sobreviva à troca de URL (é state do React, não query param).
- Sem mudanças no router, no contexto, nas edge functions ou no banco. Só comportamento da página.

## Fora de escopo

- Diferenciação visual entre carrinhos da mesma empresa (badge, sequencial, nome editável) — assunto da minha mensagem anterior, fica para próxima rodada se você quiser.
- Bloqueio/aviso de duplicata por empresa.
