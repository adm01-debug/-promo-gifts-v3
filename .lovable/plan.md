## Problema confirmado
O erro não está mais no login nem no carregamento inicial da sessão.

A sessão do seu usuário foi confirmada como autenticada, e o banco mostra que seu usuário **já tem as roles `dev` e `supervisor`**. Mesmo assim, o app não exibe as ferramentas porque a consulta em `user_roles` está falhando com:

```text
permission denied for function is_admin_strict
```

Isso deixa `userRoles` vazio no `AuthContext`, e como a sidebar e os guards dependem de `isAdmin` / `isDev`, a área Admin/Dev some da interface.

## Causa raiz
A policy atual de `user_roles` inclui uma regra `FOR ALL` que usa `public.is_admin_strict(auth.uid())`.

Como `FOR ALL` também participa da leitura, o Postgres tenta avaliar essa função durante o `SELECT` em `user_roles`. Só que a função não está com `EXECUTE` liberado para o papel autenticado do cliente. Resultado:

- a sessão existe
- o usuário está autenticado
- as roles existem no banco
- mas o `SELECT` quebra antes de retornar dados

## Plano de correção
1. **Ajustar a permissão da função de RLS no banco**
   - Criar uma migration que conceda `EXECUTE` em `public.is_admin_strict(uuid)` para `authenticated`.
   - Manter a função como `SECURITY DEFINER` e restrita ao uso via policies, sem abrir acesso indevido aos dados.

2. **Endurecer a policy de leitura de `user_roles`**
   - Revisar a policy atual para garantir que leitura use apenas o helper semântico correto para leitura (`is_supervisor_or_above`) e não dependa incidentalmente de uma policy de escrita.
   - Se necessário, separar com mais clareza as policies de `SELECT` e de `ALL` para evitar regressões futuras.

3. **Manter o frontend consistente com o estado real**
   - Preservar o comportamento atual do `AuthContext`: sem fallback para `agente`, sem assumir role quando a query falha.
   - Adicionar um log mais explícito para distinguir:
     - sessão ausente
     - RLS negando a query
     - roles realmente inexistentes

4. **Validar ponta a ponta**
   - Confirmar que o `SELECT` em `user_roles` volta a retornar `dev` e `supervisor` para o seu usuário.
   - Verificar que:
     - badge de role mostra corretamente
     - grupo **Admin** aparece
     - itens técnicos de **Dev** aparecem
     - guards de rota passam a liberar `/admin/usuarios`, `/admin/conexoes`, `/admin/telemetria` etc. conforme a hierarquia.

5. **Adicionar cobertura contra regressão**
   - Incluir um teste focado no cenário: usuário autenticado com `dev/supervisor` não pode perder acesso por erro de função em policy.
   - Cobrir pelo menos o fluxo do `AuthContext`/guard ou um teste de navegação que falharia se `user_roles` voltasse a quebrar.

## Arquivos e áreas envolvidos
- `src/contexts/AuthContext.tsx`
- `src/components/layout/SidebarReorganized.tsx`
- `src/components/layout/sidebar/SidebarNavGroup.tsx`
- `src/components/layout/ProtectedRoute.tsx`
- `supabase/migrations/*` (nova migration de RLS/permissões)

## Detalhes técnicos
Constatações já verificadas:

- Seu usuário autenticado: `1c36907b-d39e-49e0-a711-ca651586035a`
- Roles existentes no banco:
  - `supervisor`
  - `dev`
- Log do frontend:
  - sessão válida
  - profile carregado
  - falha em `user_roles` com `42501`
  - mensagem: `permission denied for function is_admin_strict`

Leitura da policy relevante:

```text
user_roles
- SELECT: is_supervisor_or_above(auth.uid())
- ALL:    is_admin_strict(auth.uid())
```

Como a policy `FOR ALL` também afeta `SELECT`, a falta de `GRANT EXECUTE` em `is_admin_strict(uuid)` explica exatamente o seu sintoma atual.

## Resultado esperado após a correção
Seu usuário volta a carregar as roles reais do banco, e a UI passa a mostrar normalmente as ferramentas e áreas de Admin/Dev às quais você já tem direito.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>
<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>