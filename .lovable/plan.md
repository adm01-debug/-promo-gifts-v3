# Emissão Segura de Chaves MCP com Alçada para Acesso Full

## Problema atual

A emissão de chaves MCP em `/admin/conexoes → MCP → Nova chave` é feita **inteiramente no cliente** (`McpTab.tsx` linhas 57-85):

- A chave plana e o `key_hash` SHA-256 são gerados no browser e enviados via `INSERT` direto na tabela `mcp_api_keys`.
- Os `scopes` (incluindo `*`) chegam ao banco sem validação server-side — só passam pela RLS `has_role(uid, 'admin')`.
- Não há confirmação dupla, justificativa, expiração obrigatória nem audit trail diferenciado para chaves full.
- Um admin com sessão sequestrada (XSS, extensão maliciosa) pode emitir uma chave `*` silenciosamente.

A RLS já bloqueia não-admins, mas o modelo "qualquer admin pode emitir full sem fricção" é frágil para a operação que essa chave habilita (edição de código-fonte, leitura de CRM, etc.).

## O que muda para o usuário

No card "Chaves emitidas" da aba MCP, o diálogo de "Nova chave" passa a ter:

1. **Campo de escopos enriquecido** — cada escopo lista as tools que habilita (tooltip).
2. **Campo "Expira em"** obrigatório para escopo `*`, opcional para escopos restritos (default: 90 dias para `*`, sem expiração para outros).
3. **Campo "Justificativa"** obrigatório quando `*` é selecionado (mín. 20 caracteres) — fica gravada no audit log.
4. **Modal de confirmação dupla** quando o escopo `*` está marcado: exige redigitar a palavra `CONCEDER FULL` para liberar o botão "Gerar".
5. **Badge "FULL" vermelho** nas chaves `*` listadas, com data de expiração visível e contador "expira em Xd".
6. Mensagem de erro clara se o servidor recusar (ex.: usuário não é admin, justificativa curta, escopo inválido).

## Arquitetura técnica

### 1. Nova edge function `mcp-keys-issue`

Caminho: `supabase/functions/mcp-keys-issue/index.ts`

Responsabilidades (em ordem):

1. **CORS** — usa `corsHeaders` do SDK Supabase v2.95+.
2. **Autenticação JWT** — extrai `Authorization: Bearer`, chama `supabase.auth.getUser(jwt)`. Retorna 401 se ausente/inválido.
3. **Verificação de role** — chama RPC `has_role(uid, 'admin')` com client service-role. Retorna 403 se não admin.
4. **Validação Zod** do body:
   - `name`: string 3-100 chars
   - `scopes`: array não-vazio de enums conhecidos (`quotes:read`, `orders:read`, `crm:read`, `products:read`, `code:read`, `code:write`, `*`)
   - `expires_at`: ISO date string opcional, mas **obrigatório quando `scopes.includes('*')`** com janela máxima de 180 dias
   - `justification`: string opcional, mas **obrigatório (≥20 chars) quando `scopes.includes('*')`**
   - `confirmation_phrase`: string igual a `"CONCEDER FULL"` quando `scopes.includes('*')`
5. **Geração server-side da chave** — `crypto.getRandomValues(32 bytes)` no Deno → `mcp_<hex64>`; SHA-256 → `key_hash`; primeiros 12 chars → `key_prefix`.
6. **Insert** em `mcp_api_keys` com `created_by = uid`, `expires_at`, `scopes` (já validados).
7. **Audit log dedicado** — insert em `admin_audit_log` com `action = 'mcp_key.issued'`, payload contendo: `key_id`, `key_prefix`, `scopes`, `expires_at`, `justification`, `is_full_access` (boolean), `request_ip`, `user_agent`.
8. **Resposta** — retorna `{ key: plain, prefix, scopes, expires_at }` apenas uma vez. A chave plana **nunca é gravada nem logada**.

Erros tratados:
- 400 `validation_failed` (Zod errors)
- 401 `unauthenticated`
- 403 `forbidden` (não admin)
- 422 `policy_violation` (justificativa curta, expiração ausente, frase incorreta)
- 500 `internal_error`

### 2. Endurecer RLS de `mcp_api_keys`

Adicionar política de `INSERT` mais restrita que a atual (`ALL` permissiva). Como a edge function usa service-role, podemos:

```sql
-- Remove permissão de INSERT direto via cliente (mantém SELECT/UPDATE/DELETE)
DROP POLICY "Admins manage mcp_api_keys" ON public.mcp_api_keys;

CREATE POLICY "Admins read mcp_api_keys"
  ON public.mcp_api_keys FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update mcp_api_keys"
  ON public.mcp_api_keys FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sem policy de INSERT: clientes não podem mais inserir;
-- só a edge function (service_role) consegue.
```

Isso fecha o vetor de "admin com XSS insere chave `*` direto pelo cliente".

### 3. Atualização do frontend

**`src/components/admin/connections/McpTab.tsx`** — substituir a função `generate()`:

```ts
const { data, error } = await supabase.functions.invoke("mcp-keys-issue", {
  body: { name, scopes, expires_at, justification, confirmation_phrase },
});
if (error) { toast.error(translateError(error)); return; }
setGenerated(data.key);
```

**Novos campos no Dialog** (separados em sub-componente `IssueMcpKeyForm.tsx` para manter o arquivo modular conforme `mem://architecture/component-refactoring-and-modularity`):

- Select de scopes com tooltips por tool.
- DatePicker "Expira em" (obrigatório se `*` marcado).
- Textarea "Justificativa" (obrigatório se `*` marcado, contador de caracteres).
- Input de confirmação "Digite CONCEDER FULL" (aparece somente se `*` marcado).
- Botão "Gerar" só habilita quando todas as validações client-side passarem.

### 4. Catálogo de scopes server-side

Novo arquivo `supabase/functions/_shared/mcp-scopes.ts` com a lista canônica:

```ts
export const KNOWN_SCOPES = [
  "quotes:read", "orders:read", "crm:read",
  "products:read", "code:read", "code:write", "*",
] as const;
export const FULL_SCOPE = "*";
```

Reutilizado pela edge function `mcp-keys-issue` e pelo `mcp-server` (validação de scope na hora de chamar tools). Frontend importa um espelho em `src/lib/mcp/scopes.ts`.

### 5. Audit log

Tabela `admin_audit_log` já existe (usada pelo `secrets-manager` e `github-credentials-test`). Adicionamos a action `mcp_key.issued` com payload acima. UI de visualização (timeline existente em `ConnectionTimelineDrawer`) já renderiza qualquer action — só precisamos garantir formatação amigável da label.

## Arquivos afetados

**Criados:**
- `supabase/functions/mcp-keys-issue/index.ts`
- `supabase/functions/_shared/mcp-scopes.ts`
- `src/lib/mcp/scopes.ts`
- `src/components/admin/connections/IssueMcpKeyForm.tsx`

**Editados:**
- `src/components/admin/connections/McpTab.tsx` (delega geração para edge function + extrai form)
- Migração SQL: substituir policy `ALL` por policies separadas em `mcp_api_keys`

## O que NÃO entra neste plano

- Aprovação por **dois admins** (4-eyes principle) para chave `*` — pode ser uma evolução futura, requer fluxo de "pending approval" que muda a UX significativamente.
- Rotação automática de chaves expiradas (job de cron).
- Notificação por email/webhook quando uma chave `*` é emitida (pode ser adicionado depois enganchando no audit log).

## Resultado

Após implementação:
- Geração de chave **só ocorre server-side**, com chave plana retornada uma vez via response e nunca persistida em texto puro.
- Cliente comprometido (XSS) **não consegue mais** emitir chave porque RLS bloqueia INSERT direto.
- Escopo `*` exige **expiração + justificativa + frase de confirmação**, todos validados duplamente (cliente e servidor).
- Audit log diferenciado permite responder "quem emitiu chave full, quando, com qual justificativa" em segundos.
