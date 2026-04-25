## Objetivo

Permitir que uma única chave MCP (`scope = *`) controle tudo: ler/escrever no banco e ler/editar arquivos do repositório via GitHub.

## O que será entregue

### 1. UI — `McpTab.tsx` (atalho "Acesso total")
- Botão **"Gerar chave full"** ao lado de "Nova chave" que pré-preenche `name = "Full Access — <data>"` e `scopes = ["*"]`.
- Aviso vermelho no diálogo quando `*` está marcado: "Esta chave pode criar/alterar dados e editar código-fonte. Trate como senha de root."
- Coluna nova na lista de chaves: badge **"FULL"** quando `scopes` contém `*`.

### 2. mcp-server — novas ferramentas de **escrita no banco** (escopo `*` ou `<area>:write`)
Adicionadas em `supabase/functions/mcp-server/index.ts`:
- `create_quote` (quotes:write) — cria draft com client/items.
- `update_quote_status` (quotes:write) — muda status com validação.
- `create_order_from_quote` (orders:write) — converte aprovado → pedido.
- `upsert_company` (crm:write) — cria/atualiza cliente.
- `update_order_fulfillment` (orders:write) — muda fulfillment_status.

Cada handler valida o input com Zod, exige o escopo apropriado e grava `admin_audit_log` com `action = 'mcp_write:<tool>'`, `resource_id` e payload resumido.

### 3. mcp-server — novas ferramentas de **código-fonte** (escopo `code:read` / `code:write` ou `*`)
Implementadas via GitHub API (REST `/repos/{owner}/{repo}/contents/...`):
- `list_repo_files({ path })` — lista diretório.
- `read_repo_file({ path, ref? })` — devolve conteúdo do arquivo (decodifica base64).
- `write_repo_file({ path, content, message, branch? })` — cria/atualiza arquivo (commit direto). Valida path para impedir escrita em `supabase/migrations/*`, `.env`, `src/integrations/supabase/{client,types}.ts` e `supabase/config.toml` (lista negra).
- `create_branch({ name, from_ref })` — opcional, recomendado em vez de commit direto na default branch.

Toda escrita grava em `admin_audit_log` com `action = 'mcp_code:<tool>'` e o SHA do commit retornado pelo GitHub.

### 4. Secrets necessários
- `GITHUB_TOKEN` — Personal Access Token (fine-grained) com permissão **Contents: Read & Write** apenas no repo do projeto.
- `GITHUB_REPO` — string `owner/repo` (ex.: `pedro/promogifts`).
- `GITHUB_DEFAULT_BRANCH` — opcional, default `main`.

Vou pedir esses 3 secrets via add_secret após sua aprovação. Sem eles as tools de código retornam 412 com mensagem clara, mas as tools de banco continuam funcionando.

### 5. Catálogo de escopos atualizado
`ALL_SCOPES` em `McpTab.tsx`:
```
quotes:read, quotes:write,
orders:read, orders:write,
crm:read, crm:write,
products:read,
code:read, code:write,
*
```

### 6. Banco
Sem migrações novas — `mcp_api_keys.scopes` já é `text[]` e `validate_mcp_key` retorna o array como está. O auditoria reusa `admin_audit_log` existente.

## Riscos e mitigações
- **Escrita de código sem PR**: por padrão a tool `write_repo_file` cria/usa branch `mcp-edits/<timestamp>` em vez de commitar direto na `main`; flag `direct=true` é obrigatória para escrever na default branch.
- **Lista negra de paths**: bloqueia arquivos auto-gerados e segredos.
- **Auditoria total**: cada chamada com efeito colateral é registrada em `admin_audit_log` com `key_id` da chave MCP.
- **Revogação**: a UI já permite revogar a chave a qualquer momento; revogação é instantânea (validate_mcp_key rejeita).

## Arquivos tocados
- `supabase/functions/mcp-server/index.ts` (expandido)
- `src/components/admin/connections/McpTab.tsx` (botão full + escopos novos + badge)

Após aprovação eu peço o `GITHUB_TOKEN`/`GITHUB_REPO` antes de implementar as tools de código; as tools de banco eu já implemento direto.