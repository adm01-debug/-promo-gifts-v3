## Objetivo

Adicionar uma asserção em `fetchUserData` (em `src/contexts/AuthContext.tsx`) que loga o estado de `supabase.auth.getSession()` antes de consultar `user_roles`, e **aborta** a query se não houver sessão ativa ou se o `user.id` da sessão não bater com o `userId` alvo. Isso garante que `user_roles` jamais seja consultado como anônimo (que produziria `data: []` por RLS e mascararia roles reais).

## Alteração

### `src/contexts/AuthContext.tsx` — bloco `doFetch` em `fetchUserData`

Após `await supabase.auth.getSession()`, extrair:

- `session.user.id` (presença de usuário)
- `session.user.app_metadata.provider` (google / email)
- `session.token_type`, `session.expires_at` e `aal` claim (contexto)

Logar via `authDebug("AuthContext.fetchUserData", "session asserted", {...})` mascarando nada sensível (apenas IDs/flags).

**Asserções de aborto** antes da query:

1. Se `!session || !session.user.id` → log de erro `ABORT — no active session (would query as anon)` + `console.warn` em DEV + `return` (não chama `queryRoles`).
2. Se `session.user.id !== userId` (target) → log de erro `ABORT — session user mismatch` + `return`.

Em ambos os abortos, `userRoles` permanece como está (estado indeterminado, já tratado pelo `rolesLoaded` no Header) e `isLoading` é resetado no `finally` existente.

## Comportamento esperado

- Console (filtro `[AUTH-DEBUG]`) passa a mostrar `session asserted` com `provider: "google"` (ou `"email"`) imediatamente antes de cada query a `user_roles`. Isso comprova que a query nunca rodou como anon.
- Em qualquer race condition em que `fetchUserData` for chamado antes da sessão hidratar, vemos `ABORT — no active session` em vez de uma resposta vazia silenciosa que escolheria roles erradas.
- Comportamento bem-sucedido (caso normal) é idêntico ao atual — só adiciona observabilidade e proteção.

## Arquivos afetados

- `src/contexts/AuthContext.tsx` — apenas o bloco `try` interno de `fetchUserData` (~10 linhas substituídas por ~40, mantendo o retry-on-empty já existente).

Sem mudanças em UI, RLS, edge functions ou tipos públicos.