## Objetivo

Eliminar acúmulo de favoritos, carrinhos, coleções, comparações e orçamentos criados pelos testes E2E, removendo automaticamente toda vez que o pipeline rodar.

## Arquitetura

```text
playwright.config.ts
   └─ globalTeardown ─► e2e/global-teardown.ts
                            │
                            └─► POST /functions/v1/e2e-cleanup
                                 headers: x-e2e-cleanup-token: $E2E_CLEANUP_TOKEN
                                 body:    { email: $E2E_USER_EMAIL, dryRun?: bool }
                                          │
                                          ▼
                          supabase/functions/e2e-cleanup/index.ts
                          (service-role, 3 camadas de segurança)
                            1. token compartilhado (E2E_CLEANUP_TOKEN)
                            2. allow-list de e-mails (E2E_CLEANUP_ALLOWED_EMAILS)
                            3. resolve user_id via auth.admin.listUsers
                            4. DELETE em cascata por user_id/seller_id
                            5. retorna contagem por tabela
```

## Componentes

### 1. Edge function `supabase/functions/e2e-cleanup/index.ts` (nova)

- **Auth**: `verify_jwt = false` + validação manual:
  - Header obrigatório `x-e2e-cleanup-token` deve bater com `Deno.env.get("E2E_CLEANUP_TOKEN")` (timing-safe compare).
  - Email do body precisa estar em `E2E_CLEANUP_ALLOWED_EMAILS` (CSV). Sem isso, **rejeita 403**, garantindo que ninguém apaga dados de um usuário real mesmo com o token vazado.
- Resolve `user_id` via `supabase.auth.admin.listUsers({ filter })` usando service role.
- Modo `dryRun: true` retorna apenas as contagens sem apagar (default em ambiente local).
- Apaga, em ordem segura (filhos → pais), filtrando por `user_id` ou `seller_id`:
  - `favorite_item_reactions` (via `favorite_items.id`), `favorite_items`, `favorite_items_trash`, `favorite_lists`
  - `collection_item_reactions`, `collection_items`, `collection_items_trash`, `collections`
  - `seller_cart_items` (via `seller_carts.id`), `seller_carts`, `cart_templates`
  - `user_comparisons`, `comparison_reactions` (via cascade)
  - `quote_items`, `quote_item_personalizations`, `quote_history`, `quote_comments`, `quote_approval_tokens`, `quotes` (filtra `seller_id = user_id`)
  - `kit_comments`, `custom_kits`, `kit_variants`, `kit_collaborators` (quando ownerless: skip)
  - `generated_mockups`, `mockup_drafts`
- Retorna `{ ok, dryRun, userId, deleted: { table: count }, totalMs }`.
- Usa CORS padrão. Logs estruturados (sem PII além do email).

### 2. `e2e/global-teardown.ts` (novo)

- Usa `fetch` global (Node 18+). Sem deps novas.
- Lê `E2E_USER_EMAIL`, `E2E_CLEANUP_TOKEN`, `VITE_SUPABASE_URL` do env.
- Skip silencioso (sem falhar a suite) se qualquer variável faltar — assim devs locais sem token não quebram.
- Em CI, se `CI=true && E2E_CLEANUP_TOKEN ausente`, loga warning amarelo mas não falha.
- Faz a chamada com timeout 15s e imprime tabela de contagens.
- Repete para `E2E_ADMIN_EMAIL` se também estiver definido.

### 3. `playwright.config.ts` (edição mínima)

- Adicionar `globalTeardown: require.resolve("./e2e/global-teardown.ts")`.

### 4. `supabase/config.toml` (edição mínima)

- Adicionar bloco `[functions.e2e-cleanup]` apenas se necessário; default JWT desligado já é o padrão do projeto.

### 5. Secrets (necessários)

Pedirei via `add_secret` depois da aprovação:
- **`E2E_CLEANUP_TOKEN`** — token aleatório longo (gerado pelo usuário, ex: `openssl rand -hex 32`). Usado pela function e pelo CI.
- **`E2E_CLEANUP_ALLOWED_EMAILS`** — CSV com os emails permitidos (ex: `e2e-tester@promogifts.com.br,e2e-admin@promogifts.com.br`). Defesa em profundidade.

`SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL` já existem no ambiente das edge functions.

### 6. Documentação

Atualizo `e2e/README.md` com seção **"Cleanup automático"** explicando:
- Como configurar os 2 secrets em CI/local.
- Como rodar o cleanup manualmente: `curl -H "x-e2e-cleanup-token: …" -d '{"email":"…","dryRun":true}' …/e2e-cleanup`
- Como adicionar novas tabelas à lista (passo único na function).

## Segurança (camadas)

1. Token compartilhado fora do código (secret).
2. Allow-list de emails — sem ela, mesmo com o token correto, retorna 403.
3. Apaga apenas pelo `user_id` resolvido server-side (cliente nunca passa UUID).
4. Logs em `admin_audit_log` (entry `event = "e2e_cleanup"`) com email + contagens — auditável.
5. `dryRun` é default verdadeiro se body não enviar — exige opt-in explícito para deletar.

## Não-objetivos

- Não tocar em `auth.users` (não apagar a conta — só dados de aplicação).
- Não tocar em tabelas globais (catálogo externo, ai_usage_*, admin_settings).
- Não rodar entre testes (só após a suite inteira) para não interferir em assertions cruzadas.

## Arquivos

- **Novo**: `supabase/functions/e2e-cleanup/index.ts`
- **Novo**: `e2e/global-teardown.ts`
- **Editado**: `playwright.config.ts` (+1 linha `globalTeardown`)
- **Editado**: `e2e/README.md` (seção nova)
