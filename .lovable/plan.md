## Objetivo

Eliminar o fallback `setUserRoles(["agente"])` quando a query a `user_roles` vier vazia sem erro, e fazer o `RoleBadge` ficar **oculto** (em vez de exibir "Agente" enganosamente) enquanto as roles ainda não foram carregadas.

Isso resolve o sintoma reportado: usuário com `dev` + `supervisor` no banco vê badge "Agente" porque o fallback mascara um estado intermediário (sessão hidratando, RLS sem auth ainda, etc).

## Alterações

### 1. `src/contexts/AuthContext.tsx`

**`fetchUserData`** — eliminar fallback silencioso:

- Quando `rolesResult.data` vier **vazio sem erro**: NÃO setar `["agente"]`. Apenas logar o caso e deixar `userRoles` como `[]` (estado indeterminado), preservando a tentativa de retry já existente.
- Quando `rolesResult.error`: continuar logando o erro, mas também NÃO chutar `["agente"]` — manter `userRoles` como `[]` para que o consumidor (Header) possa decidir não exibir nada em vez de mostrar role errada.
- Bloco `catch` externo: idem — remover `setUserRoles(["agente"])`.

Resultado: `userRoles === []` passa a significar "ainda não carregou ou falhou", não "é agente por padrão".

**Novo flag derivado** (próximo de `primaryRole`):

```ts
const rolesLoaded = userRoles.length > 0;
```

Exposto no `AuthContextType` e no `value` para que componentes possam diferenciar "carregando" de "sem role".

### 2. `src/components/layout/Header.tsx`

- Consumir `rolesLoaded` do `useAuth()`.
- Renderizar `<RoleBadge />` apenas quando `rolesLoaded === true`. Enquanto `false`, exibir um placeholder discreto (skeleton fino de mesma altura, `h-4 w-12 rounded bg-muted/40 animate-pulse`) para não causar layout shift no header colapsado e no dropdown.

### 3. Sem alterações em `RoleBadge.tsx` nem em `getRoleVisual`

O fallback "Agente" do `getRoleVisual(null)` permanece como salvaguarda de último recurso para qualquer outro consumidor legado, mas o Header — único caso visível ao usuário no momento — passa a respeitar o estado de carregamento.

## Arquivos afetados

- `src/contexts/AuthContext.tsx` — remover 3 ocorrências de `setUserRoles(["agente"])`, expor `rolesLoaded`.
- `src/components/layout/Header.tsx` — gating do `RoleBadge` por `rolesLoaded` + skeleton placeholder.

## Comportamento esperado após o ajuste

- Login social com Google → header mostra skeleton no lugar do badge por ~200-500ms → badge correto ("Dev") aparece assim que `user_roles` retorna.
- Falha real de rede ou RLS → badge não aparece (em vez de mentir "Agente"); erro fica visível no console via `[AUTH-DEBUG]` e o usuário não fica com permissões aparentemente reduzidas.
- Usuário legitimamente sem role no banco → badge não aparece; comportamento de RBAC permanece restritivo (correto).