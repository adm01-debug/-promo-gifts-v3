## Auditoria de chaves MCP — cobertura completa

### Estado atual (já implementado)
- `mcp_key.issued` — registrado pela edge function `mcp-keys-issue` (com IP, UA, escopos, justificativa, full flag).
- `mcp_key.rotated` — registrado pela edge function `mcp-keys-rotate` (com origem, escopos, full flag).
- `mcp_key.revoked` — registrado por trigger DB `trg_log_mcp_key_revocation` ao mudar `revoked_at`.

### Lacunas identificadas
1. **Updates diretos** (nome, descrição, escopos, expiração) feitos via cliente Supabase **não geram log**. Hoje não existe UI para editar, mas um admin com role pode fazê-lo via SQL/API e ficar invisível.
2. **Trigger de revogação** depende de `auth.uid()`, que é `NULL` quando o update vem da edge function via service-role. Precisa receber o ator real.
3. **Não há painel central** que liste todos os eventos de chaves (issued/rotated/revoked) com filtros por ator, ação, período. Hoje só existe o histórico por chave dentro do drawer.
4. **Detalhes do evento de revogação** não capturam IP/UA porque o trigger roda no Postgres sem essa info.

---

### Plano de implementação

#### 1. Migração SQL (auditoria expandida)

Criar trigger genérico que registra **toda mudança relevante** em `mcp_api_keys`:

- `mcp_key.updated` quando `name`, `description`, `scopes` ou `expires_at` mudam (com diff `before`/`after`).
- Manter `mcp_key.revoked` para mudanças de `revoked_at` (NULL → NOT NULL).
- Detectar `scope_escalated` quando `*` é adicionado a uma chave que não era full (alerta crítico).
- Capturar ator real via `current_setting('request.jwt.claims', true)::jsonb->>'sub'` quando disponível, fallback `auth.uid()`, fallback `NEW.created_by`.

Adicionar índice em `admin_audit_log(resource_type, resource_id, created_at DESC)` para acelerar consultas por chave.

#### 2. Nova edge function `mcp-keys-update`

Centraliza qualquer alteração em chave existente (rename, mudar descrição, ajustar `expires_at`, alterar escopos). Bloqueia o update direto via cliente para esses campos sensíveis.

- Valida JWT + role admin.
- Se a alteração introduzir escopo `*`, exige a mesma fricção do issue (justificativa ≥ 20 chars + frase `CONCEDER FULL`).
- Registra `mcp_key.updated` com payload `{ before, after, fields_changed[] }`, IP e UA.

A revogação continua server-side: refatorar o front (`useMcpKeys.revoke` e `McpTab.revoke`) para chamar uma nova edge function `mcp-keys-revoke` que faz o update server-side e grava log com IP/UA antes da trigger disparar (a trigger fica como rede de segurança).

#### 3. RLS endurecida em `mcp_api_keys`

- Manter SELECT para admins.
- Restringir UPDATE direto: política nega update em `name`, `scopes`, `description`, `expires_at`, `revoked_at` para qualquer role exceto `service_role`. Admins passam a operar exclusivamente pelas edge functions.
- DELETE continua permitido só para admin (operação rara).

#### 4. Painel de auditoria na página `/admin/seguranca/chaves`

Nova aba/seção "Histórico de auditoria":
- Lista cronológica de todos os eventos `mcp_key.*` (paginada, 50/página).
- Filtros: ação (issued/rotated/updated/revoked), ator, período, somente FULL.
- Cada linha mostra: badge da ação, ator (email + avatar), prefixo da chave, escopos antes/depois (para updated), IP/UA, link para o drawer da chave.
- Botão "Exportar CSV" (gera no client a partir dos resultados filtrados).

Componentes novos em `src/components/admin/security/keys/audit/`:
- `useMcpAuditFeed.ts` — hook com query + filtros.
- `McpAuditFeed.tsx` — lista virtualizada.
- `McpAuditRow.tsx` — linha com diff visual para `updated`.
- `McpAuditFilters.tsx` — toolbar.

#### 5. Atualizações no Drawer existente

Mostrar diff visual nos eventos `updated` e exibir IP/UA quando presentes. Adicionar badge "ESCALAÇÃO" nos eventos onde `*` foi adicionado.

---

### Detalhes técnicos

**Arquivos novos:**
- `supabase/migrations/<timestamp>_mcp_audit_expanded.sql`
- `supabase/functions/mcp-keys-update/index.ts`
- `supabase/functions/mcp-keys-revoke/index.ts`
- `src/components/admin/security/keys/audit/useMcpAuditFeed.ts`
- `src/components/admin/security/keys/audit/McpAuditFeed.tsx`
- `src/components/admin/security/keys/audit/McpAuditRow.tsx`
- `src/components/admin/security/keys/audit/McpAuditFilters.tsx`

**Arquivos editados:**
- `src/components/admin/security/keys/useMcpKeys.ts` — `revoke()` chama edge function.
- `src/components/admin/connections/McpTab.tsx` — `revoke()` chama edge function.
- `src/components/admin/security/keys/McpKeyDetailsDrawer.tsx` — diff + IP/UA + badge de escalação.
- `src/pages/admin/AdminSegurancaChavesPage.tsx` — abas: "Chaves" / "Histórico".

**Ações auditadas (resumo):**

| Ação | Origem | Captura |
|------|--------|---------|
| `mcp_key.issued` | edge `mcp-keys-issue` | ator, IP, UA, escopos, justificativa, full |
| `mcp_key.rotated` | edge `mcp-keys-rotate` | ator, IP, UA, origem, escopos, justificativa |
| `mcp_key.updated` | edge `mcp-keys-update` + trigger | ator, IP, UA, diff before/after, fields_changed |
| `mcp_key.revoked` | edge `mcp-keys-revoke` + trigger fallback | ator, IP, UA, motivo opcional |
| `mcp_key.scope_escalated` | trigger (sub-evento de updated) | ator, escopos antes/depois |

### Fora de escopo
- Notificações em tempo real para escalação (pode entrar em onda futura).
- Retenção/arquivamento dos logs (já há job pg_cron de manutenção).
