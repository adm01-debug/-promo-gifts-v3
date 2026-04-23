

## Pré-carregamento de notificações + estado de loading inteligente

### Diagnóstico

`useWorkspaceNotifications` já busca na montagem do `Header` (sempre montado), mas há 3 problemas que causam atraso/flicker percebido ao abrir o drawer:

1. **`setIsLoading(true)` em todo refetch** (linha 27) — cada poll de 30s ou refresh manual reativa o skeleton, mesmo com dados já em memória. Se o usuário abre o drawer durante um poll, vê skeleton em vez dos dados existentes.
2. **Sem prefetch on hover/focus** — usuário só dispara nova busca ao abrir; se o último poll foi há 25s, dados podem estar levemente stale.
3. **Sem cache compartilhado/persistente** — primeiro carregamento após login espera o roundtrip completo (200-800ms) antes de mostrar contador no badge.

### Mudanças (2 arquivos)

#### 1. `src/hooks/useWorkspaceNotifications.tsx`

- **Distinguir initial load de refetch silencioso:** dois flags, `isLoading` (apenas primeira busca) e `isRefetching` (background). `setIsLoading(true)` só quando `notifications.length === 0`.
- **Adicionar `prefetch()`** idempotente: dispara `fetchNotifications()` apenas se a última busca foi há mais de 5s (cache TTL curto via `lastFetchAtRef`). Não muda `isLoading`.
- **Persistir snapshot em `sessionStorage`** sob chave `workspace_notifications_cache:<userId>` com TTL de 60s. No mount, hidratar o estado imediatamente (zero flash, contador aparece em < 16ms) e disparar refetch em background.
- **Expor `prefetch` no retorno** do hook.

#### 2. `src/hooks/useNotifications.ts` (façade)

- Repassar `prefetch` no retorno.
- Atualizar `UseNotificationsReturn` interface.

#### 3. `src/components/notifications/NotificationDrawer.tsx`

- **Prefetch on hover/focus do bell:** adicionar `onMouseEnter` e `onFocus` no `<Button>` do trigger, chamando `prefetch()`. Latência percebida vai a ~zero porque a busca começa antes do clique.
- **Prefetch on `onOpenChange(true)`** do `Sheet` como fallback (touch devices sem hover).
- **Skeleton só na primeira carga:** trocar `isLoading` por `isLoading && notifications.length === 0` no render do skeleton (na prática já será o comportamento via flag corrigida no hook, mas defensivo).

### Validação

1. **Typecheck:** `npm run typecheck` — zero erros.
2. **Testes existentes:** `npm run test -- --run tests/hooks/useWorkspaceNotifications.test.ts` — manter compatibilidade da API pública (`notifications`, `unreadCount`, `isLoading`, `markAsRead`, `markAllAsRead`, `clearAll`, `refresh`).
3. **Smoke manual via session_replay:**
   - Login fresh → badge aparece quase instantaneamente (hidratação do cache OU em < 1 frame após primeira fetch).
   - Hover no bell → DevTools Network mostra request disparada antes do clique.
   - Abrir drawer com cache quente → conteúdo aparece sem skeleton.
   - Refetch automático (esperar 30s) não pisca skeleton.
4. **Verificação de localStorage/sessionStorage:** chave `workspace_notifications_cache:<userId>` presente após primeira busca.

### Critério de aceite

- Badge de contador visível em < 100ms após mount do Header em sessão recorrente (cache hit).
- Skeleton só aparece na primeiríssima busca quando não há cache.
- Hover/focus no bell dispara prefetch (visível em DevTools Network).
- Polling de 30s não causa flicker visível no drawer aberto ou no badge.
- Zero regressão na API pública do hook (`tests/hooks/useWorkspaceNotifications.test.ts` passa sem mudanças).
- Nenhuma alteração visual perceptível além da redução de flicker.

### Fora de escopo

- Migração para React Query (mudança maior, fora do escopo).
- Realtime via Supabase channels (removido por segurança conforme memória do projeto).
- Push notifications nativas (já cobertas por `usePushNotifications`).
- Persistência cross-tab via `BroadcastChannel` (over-engineering para 50 itens).

### Estimativa

~6-10 chamadas: 3 edições, 1 typecheck, 1 run de testes, 1-2 verificações via session_replay/DOM.

