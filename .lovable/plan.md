# Campos editáveis para GitHub no `/admin/conexoes`

Adicionar `GITHUB_TOKEN`, `GITHUB_REPO` e `GITHUB_DEFAULT_BRANCH` como credenciais gerenciáveis pelo painel — usando exatamente o mesmo pipeline do Promobrind/CRM/Bitrix24/n8n: tabela `integration_credentials` + edge function `secrets-manager` + componente `SecretField` (mascaramento, badge DB/ENV/AUSENTE, rotação, auditoria, tooltip de impacto).

## O que aparece para o usuário

Na aba **MCP** do `/admin/conexoes`, um novo card **"GitHub — código-fonte do app"** acima da seção de chaves emitidas, com três campos:

- **Personal Access Token** (`GITHUB_TOKEN`) — secret mascarado, badge DB/ENV/AUSENTE, botão rotacionar.
- **Repositório** (`GITHUB_REPO`) — formato `owner/repo`.
- **Branch padrão** (`GITHUB_DEFAULT_BRANCH`) — default sugerido `mcp-edits/main`; aceita qualquer branch.

Cada campo carrega o tooltip de impacto (telas/fluxos quebrados quando ausente), exatamente como os demais secrets já fazem hoje.

## Mudanças técnicas

1. **Backend whitelist** — `supabase/functions/secrets-manager/index.ts`
   Adicionar ao `ALLOWED_SECRETS`:
   - `GITHUB_TOKEN`
   - `GITHUB_REPO`
   - `GITHUB_DEFAULT_BRANCH`

2. **Frontend whitelist** — `src/components/admin/connections/secretWhitelist.ts`
   Espelhar os 3 nomes em `ALLOWED_SECRET_NAMES` para que a validação client-side aceite gravar/rotacionar.

3. **Mapa de impacto** — `src/components/admin/connections/secretImpactMap.ts`
   Adicionar entradas:
   - `GITHUB_TOKEN` (severity: `critical`) → quebra `list_repo_files`, `read_repo_file`, `write_repo_file` no MCP; chave `*` perde poder de edição de código.
   - `GITHUB_REPO` (severity: `critical`) → todas as tools de código apontam para repositório indefinido.
   - `GITHUB_DEFAULT_BRANCH` (severity: `medium`) → escritas caem direto em `main` (perigoso) ou falham; recomenda-se `mcp-edits/*`.

4. **UI card** — `src/components/admin/connections/McpTab.tsx`
   Antes do card "Chaves emitidas", inserir novo `<Card>` com header "GitHub — código-fonte do app" e três `<SecretField>` consumindo o hook `useSecretsManager` (mesmo `connectionId="mcp"` ou novo `connectionId="github"`, seguindo o padrão de N8nTab.tsx). Reuso direto de `SecretField` garante: máscara, diff de rotação, modal de confirmação, badge de origem, tooltip de impacto e auditoria.

## O que NÃO faz parte deste plano

- Implementação das tools `list_repo_files` / `read_repo_file` / `write_repo_file` no `mcp-server` (já planejada separadamente, pendente da chave full).
- Mudanças no schema do banco — `integration_credentials` já comporta os 3 nomes sem migração.

## Resultado

Após aprovação e implementação, o admin pode em `/admin/conexoes → MCP` colar o PAT do GitHub, definir `owner/repo` e o branch alvo das edições do MCP, com a mesma UX (mascaramento, rotação, auditoria, tooltip de impacto) já usada para Promobrind, CRM, Bitrix24 e n8n.