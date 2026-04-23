

# Consertar "Rotacionar": surface de "Última rotação" + verificação do fluxo

## Diagnóstico

**O backend já funciona** (verificado em `secrets-manager/index.ts`):
- `action: "rotate"` faz `upsert` em `integration_credentials` (grava nova credencial)
- Insere linha em `secret_rotation_log` com `previous_suffix`/`new_suffix`/`rotated_by`/`rotated_at`
- Resposta inclui `previous_suffix`, `new_suffix`, `length` e `secret` re-lido do banco
- Cache invalidado via `invalidateCredentialCache(name)`
- `useSecretsManager` expõe `getRotationHistory(name?)` mas **nunca é chamado pela UI**

**O que está quebrado é a percepção do usuário**: depois de clicar "Rotacionar", o toast aparece e some, mas o card não mostra "Última rotação há Xm" persistente. O badge superior do `SecretField` mostra `atualizado há Xm` (vem de `updated_at` do `integration_credentials`), mas **não distingue rotação de update normal**, e não mostra de qual sufixo veio.

## Solução

### 1. Novo componente `RotationHistoryRow` (compartilhado)

Pequeno componente inline que renderiza, abaixo do badge do `SecretField` (quando existe rotação registrada):

```text
🔄 Última rotação há 3d • ••••AB12 → ••••YZ89 • por admin@promogifts.com.br
[Ver histórico completo]
```

- Recebe `{ secretName }` e busca via `getRotationHistory(secretName)` no mount + a cada refresh externo (prop `refreshKey`).
- Mostra apenas a entrada mais recente; botão "Ver histórico completo" abre um `Dialog` com a lista das últimas 100 rotações (data, sufixo de→para, autor, notas).
- Se não houver rotação registrada → não renderiza nada (não polui o card).

### 2. `SecretField` integra a linha + dispara refresh após rotacionar

- Após `rotateSecret()` retornar `ok`, incrementar um `rotationRefreshKey` local que faz o `RotationHistoryRow` recarregar imediatamente.
- A linha aparece com `animate-in fade-in` para o usuário ver "ah, foi registrado".
- Mantém o `JustSavedFlash` atual (verde, some em 2s) — são complementares: o flash confirma "salvou agora", a `RotationHistoryRow` é o registro persistente.

### 3. Dialog "Histórico de rotações" reutilizável

`RotationHistoryDialog` exibe tabela com colunas:

| Quando | De | Para | Autor | Notas |
|---|---|---|---|---|
| há 3d (24/03 14:32) | ••••AB12 | ••••YZ89 | admin@... | "Rotação trimestral" |

- Resolve `rotated_by` (uuid) → email do `auth.users` via uma query auxiliar nova no `secrets-manager`: `action: "rotation_history"` já retorna o uuid; adicionamos um join leve no edge para devolver `rotated_by_email` também (faz o lookup com service role).
- Skeleton loading enquanto busca; estado vazio amigável "Nenhuma rotação registrada para este secret ainda".

### 4. Backend — enriquecer `rotation_history` com email do autor

No `secrets-manager`, dentro de `action: "rotation_history"`:
- Após buscar `secret_rotation_log`, coletar `rotated_by` distintos
- Chamar `service.auth.admin.listUsers()` filtrado pelos uuids (ou `service.from("profiles").select("id,email")` se tabela existir) e devolver `rotated_by_email` em cada item.
- Mantém retrocompatibilidade: campo extra opcional, não quebra consumidores.

### 5. Verificação de smoke test (sem código de teste novo)

Após implementar, validar manualmente clicando "Rotacionar" em `EXTERNAL_PROMOBRIND_URL`:
1. Toast "Rotação concluída" com `••••XXXX → ••••YYYY` ✓ (já funciona)
2. Linha verde `JustSavedFlash` por 2s ✓ (já funciona)
3. **NOVO**: Linha `🔄 Última rotação há instantes • ••••XXXX → ••••YYYY` aparece persistente
4. Recarrega página → linha continua (vem do banco)
5. Clica "Ver histórico completo" → dialog mostra a entrada com timestamp e autor

## O que o usuário verá

Após rotacionar `EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY`:

```text
Service Role Key                     ✓ ••••YZ89 (203 chars) · atualizado agora
[•••••••••••••••••]   [Atualizar]  [Rotacionar]
✓ Rotacionado • ••••YZ89 • 203 chars • atualizado agora      ← flash 2s
🔄 Última rotação há instantes • ••••AB12 → ••••YZ89 • por você   ← persistente
                                                       [Ver histórico]
```

Clicando "Ver histórico":

```text
┌─ Histórico de rotações: EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY ─┐
│ Quando         De        Para       Autor              Notas │
│ há instantes   ••••AB12  ••••YZ89   admin@promo.com.br  —    │
│ há 12d         ••••XX99  ••••AB12   admin@promo.com.br  —    │
│ há 47d         (env)     ••••XX99   admin@promo.com.br  —    │
└──────────────────────────────────────────────────────────────┘
```

## Arquivos tocados

**Backend**
- `supabase/functions/secrets-manager/index.ts`: enriquecer `rotation_history` com `rotated_by_email` (lookup via `auth.admin.listUsers` ou tabela `profiles`).

**Frontend**
- `src/components/admin/connections/RotationHistoryRow.tsx` (novo, ~60 linhas): linha inline com a última rotação, fetch on-mount + via `refreshKey`.
- `src/components/admin/connections/RotationHistoryDialog.tsx` (novo, ~80 linhas): dialog com tabela das últimas 100 rotações.
- `src/components/admin/connections/SecretField.tsx`: incluir `<RotationHistoryRow secretName={secretName} refreshKey={rotationRefreshKey} />`; bumpar `rotationRefreshKey` após rotação bem-sucedida.
- `src/hooks/useSecretsManager.ts`: tipar `rotated_by_email?: string | null` no retorno de `getRotationHistory`.

## Fora de escopo

- Não muda o backend de upsert/log (já está correto)
- Não adiciona política de "rotacionar a cada 90d" automática (já existe alerta via `IntegrationsHealthCard`; só estamos expondo o registro)
- Não adiciona export do histórico (CSV/JSON) — pode vir em uma onda futura
- Não muda o flash verde nem o toast (continuam iguais)

