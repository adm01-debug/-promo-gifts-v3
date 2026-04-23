

# Indicador de "fallback de env" + botão "Atualizar do banco"

## Diagnóstico

Em `supabase/functions/_shared/credentials.ts`, o resolvedor de credenciais tem 2 origens:
1. **DB** — `integration_credentials.secret_value` (preferencial, editável via `/admin/conexoes`)
2. **ENV** — `Deno.env.get(name)` (fallback estático, configurado no deploy)

Hoje a UI não distingue entre os dois. Se o admin edita um secret em `/admin/conexoes` mas a edge ainda está servindo o valor antigo do `Deno.env` (ex: porque a row não existe no DB ou o cache de 60s ainda não expirou), não há sinal visual. O admin clica "Salvar", vê "Salvo ✓", e o sistema continua usando o valor antigo silenciosamente.

Além disso, o cache em memória de 60s (`TTL_MS` em `credentials.ts`) significa que mesmo após salvar, a próxima invocação pode pegar o valor cached do env. Não há forma de invalidar de fora.

## Solução

### 1. Backend: expor `source` ("db" | "env" | "missing") em `secrets-manager`

Em `supabase/functions/secrets-manager/index.ts`, na action `list`, retornar para cada secret:
```ts
{
  name,
  has_value: boolean,
  masked_suffix: string | null,
  length: number,
  source: "db" | "env" | "missing",  // NOVO
  env_fallback_active: boolean,       // NOVO — true quando source === "env" mas o secret é configurável via DB
}
```

Lógica: para cada secret name esperado (lista hardcoded já existe), checar se há row em `integration_credentials`. Se sim → `source: "db"`. Se não, mas `Deno.env.get(name)` → `source: "env"` + `env_fallback_active: true`. Se nenhum → `source: "missing"`.

Tipo `env_fallback_active` é o sinal de "está funcionando, mas via fallback".

### 2. Backend: nova action `refresh_cache` em `secrets-manager`

Endpoint que invoca `invalidateCredentialCache()` (já existe em `_shared/credentials.ts`) para limpar o cache de 60s. Aceita `{ name?: string }` para invalidar 1 secret ou todos.

Além disso, `secrets-manager` já chama `invalidateCredentialCache(name)` automaticamente após `set`/`rotate` — vou confirmar e, se não, adicionar (1 linha). Isso garante que **salvar = invalidar imediato**, sem depender do botão.

O botão "Atualizar do banco" serve para o cenário onde o admin quer forçar refresh **sem editar** (ex: alterou o valor diretamente no DB via SQL, ou suspeita de cache stale).

### 3. Frontend: badge "ENV fallback" no `SecretField`

Em `src/components/admin/connections/SecretField.tsx`:
- Quando `status.env_fallback_active === true`, exibir badge âmbar discreto ao lado do label:
  ```
  Webhook URL completa  [⚠ Usando ENV]
  ```
- Tooltip: "Este secret está vindo da variável de ambiente do deploy, não do banco. Salve um valor aqui para sobrescrever."
- Cores: `bg-amber-500/10 text-amber-700 border-amber-500/30` (mesmo padrão do `ConnectionStatusBadge` "degradado")

Quando `source === "db"`: nenhuma badge (estado normal).
Quando `source === "missing"`: já existe o badge "Sem valor" do componente atual — mantém.

### 4. Frontend: botão "Atualizar do banco" no card

Novo componente `RefreshFromDbButton` em `src/components/admin/connections/RefreshFromDbButton.tsx` (~50 linhas):
- Ícone `DatabaseZap` + label "Atualizar do banco"
- `variant="ghost"` `size="sm"`
- Onclick → invoca `secrets-manager` com `action: "refresh_cache"` → recarrega `list()` → toast "Cache invalidado · valores atualizados"
- Cooldown de 5s (igual padrão do `RetestButton`)
- Spinner durante operação

Posicionado no rodapé de cada `*Tab` (Bitrix24, n8n, Supabase, MCP), ao lado do `ConnectionTimelineDrawer`:
```
[Testar conexão] [Timeline] [↻ Atualizar do banco]
```

### 5. Auto-flash após salvar

Quando o usuário salva um secret que estava em `env_fallback_active: true`, o `SecretField` já dispara `onSaved` → `list()` → o badge "ENV fallback" desaparece automaticamente. Adicionar transição suave (`animate-out fade-out`) para feedback visual claro.

Adicionalmente, quando `JustSavedFlash` é exibido após salvar e o secret estava em fallback de env, ampliar a mensagem:
```
✓ Salvo • ••••abc1 • 64 chars • agora vem do banco
```
(sufixo "agora vem do banco" só quando `was_env_fallback === true` no momento do save)

### 6. Visual

```text
┌─ Bitrix24 ──────────────────────────────────────┐
│  Webhook URL completa  [⚠ Usando ENV]           │
│  ┌──────────────────────────────────────┐ [Editar]
│  │ ••••xyz9 · 87 chars                  │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  Domínio Bitrix24                                │
│  ┌──────────────────────────────────────┐ [Editar]
│  │ ••••.br · 24 chars                   │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  [Testar conexão] [Timeline] [↻ Atualizar do banco]
│                                                  │
│  ✓ Verificado há 2min · 245ms · OK              │
└──────────────────────────────────────────────────┘
```

Após salvar a Webhook URL:
```
│  Webhook URL completa                            │  ← badge sumiu
│  ✓ Salvo • ••••abc1 • 64 chars • agora vem do banco
```

## Arquivos tocados

**Backend (editados)**
- `supabase/functions/secrets-manager/index.ts` (~30 linhas adicionadas):
  - Action `list` agora retorna `source` e `env_fallback_active` por secret.
  - Nova action `refresh_cache` que chama `invalidateCredentialCache(name?)`.
  - Confirmar/garantir invalidação automática após `set`/`rotate`.

**Frontend (novos)**
- `src/components/admin/connections/RefreshFromDbButton.tsx` (~50 linhas): botão com cooldown de 5s que invoca `refresh_cache` + recarrega lista.

**Frontend (editados)**
- `src/hooks/useSecretsManager.ts`: adicionar campos `source` e `env_fallback_active` no tipo `SecretStatus`; nova função `refreshCache(name?)` que invoca a action.
- `src/components/admin/connections/SecretField.tsx`: badge "⚠ Usando ENV" quando `env_fallback_active`; passar `was_env_fallback` para `JustSavedFlash`.
- `src/components/admin/connections/JustSavedFlash.tsx`: prop opcional `was_env_fallback` que adiciona "• agora vem do banco" ao texto.
- `src/components/admin/connections/Bitrix24Tab.tsx`, `N8nTab.tsx`, `SupabaseConnectionsTab.tsx`, `McpTab.tsx`: adicionar `<RefreshFromDbButton />` na linha de ações.

**Tipos**
- Atualizar tipo `SecretStatus` em `useSecretsManager.ts` com os 2 novos campos opcionais (backward-compatible).

## Fora de escopo

- Não muda a TTL de 60s do cache (`TTL_MS` em `credentials.ts`) — botão de refresh manual cobre o caso de urgência.
- Não adiciona indicador no `IntegrationsHealthCard` global — fallback é granular por secret, não por conexão.
- Não adiciona alerta proativo (notificação) quando muitos secrets estão em fallback — apenas indicador visual passivo.
- Não adiciona "migrar tudo do ENV para o DB" em batch — admin precisa salvar um por um (intencional, evita acidentes).
- Não toca em `_shared/credentials.ts` além de já invocar `invalidateCredentialCache` (que já existe).

