
## Problema

Ao recarregar a página, o app mostra a tela "Ops! Algo deu errado" com a mensagem:

> **Rendered more hooks than during the previous render.**

Isso acontece **exatamente porque o fix anterior funcionou**: o `AuthContext` agora consegue ler `user_roles` (RLS desbloqueada), descobre que sua conta tem role `dev`, e o `DevOnlyBridgeOverlay` finalmente monta o `BridgeMetricsOverlay` — que tem um bug clássico de Rules-of-Hooks.

### Causa raiz

`src/components/dev/BridgeMetricsOverlay.tsx` faz `early return` **antes** de chamar a maior parte dos hooks:

```tsx
export default function BridgeMetricsOverlay() {
  const { isAllowed } = useDevGate();        // hook 1 ✅

  if (import.meta.env.PROD) return null;     // ❌ return antes de hooks
  if (!isAllowed) return null;               // ❌ return antes de hooks

  const { ... } = useBridgeMetrics(isAllowed); // hooks 2..N — pulados quando !isAllowed
  const [showInfo, setShowInfo] = useState(false);
  const handleTogglePause = useCallback(...);
  const handleClose = useCallback(...);
```

Quando `useDevGate` retornou `isAllowed=false` num render e `isAllowed=true` no render seguinte, o React contou mais hooks do que antes → erro fatal → Error Boundary engole o app inteiro.

## Solução

### 1. `src/components/dev/BridgeMetricsOverlay.tsx`
- Remover os early-returns no topo do componente.
- Mover a checagem de `isAllowed` e `import.meta.env.PROD` para **depois** de todos os hooks (ou simplesmente remover, já que `DevOnlyBridgeOverlay` já gateia o mount).
- Manter os hooks (`useDevGate`, `useBridgeMetrics`, `useState`, `useCallback`) sempre na mesma ordem em todo render.

Estrutura corrigida:
```tsx
export default function BridgeMetricsOverlay() {
  const { isAllowed } = useDevGate();
  const { open, setOpen, ... } = useBridgeMetrics(isAllowed);
  const [showInfo, setShowInfo] = useState(false);
  const handleTogglePause = useCallback(...);
  const handleClose = useCallback(...);

  // Guards APÓS todos os hooks
  if (import.meta.env.PROD) return null;
  if (!isAllowed) return null;
  if (!open) return <FloatingButton ... />;
  return <Panel ... />;
}
```

### 2. Verificação

Após o fix, recarregar a página deve:
- Não disparar mais o Error Boundary.
- Mostrar o botão flutuante "bridge metrics · `" no canto inferior direito (porque sua conta tem role `dev`).
- Header exibir os menus Admin e Dev normalmente.

### Arquivos alterados
- `src/components/dev/BridgeMetricsOverlay.tsx` — reordenar hooks antes dos guards.

Sem mudanças de banco, sem mudanças de testes (os testes existentes mockam `useDevGate` direto e continuam válidos).
