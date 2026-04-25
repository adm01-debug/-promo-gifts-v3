# Tela dedicada de Chaves MCP em /admin/seguranca/chaves

Substitui o card "Chaves emitidas" do tab MCP por uma tela completa dentro do módulo Segurança, com listagem rica, criação (delegando ao formulário já existente), revogação e rotação por duplicação.

## O que o usuário verá

Nova rota **`/admin/seguranca/chaves`**, acessível também como terceira aba dentro de `/admin/seguranca` (ao lado de "Central de Segurança" e "Restrições de Acesso").

Layout:

```text
┌─ Chaves MCP ──────────────────────────────── [+ Nova chave] ─┐
│ Filtros: [Buscar] [Status ▼ ativa/expirada/revogada] [FULL ☐] │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ⚡ Claude Desktop — Pedro            mcp_a1b2c3d4…       │  │
│ │ [FULL] [expira em 87d]                                   │  │
│ │ Escopos: * | Criada por joao@... em 12/04 às 14:32       │  │
│ │ Último uso: há 3 horas                                    │  │
│ │                          [Rotacionar] [Revogar] [Detalhes]│  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

Para cada chave:
- **Status visual**: badge `Ativa` (verde) / `Expirada` (cinza) / `Revogada` (vermelho) / `FULL` (vermelho extra quando scope `*`).
- **Datas**: criação, expiração com contagem regressiva ("expira em 12d"), último uso ("há 3h" / "nunca usada").
- **Autor**: email do `created_by` (lookup via `profiles`).
- **Ações**: Rotacionar (🔄), Revogar (🗑), Detalhes (👁 — abre drawer com audit log filtrado por `resource_id`).

Filtros e ordenação:
- Busca por nome/prefixo.
- Filtro de status (`ativa` / `expirada` / `revogada` — combinável).
- Toggle "somente FULL".
- Ordenação por criação (default desc), último uso, expiração.

## Fluxo de Rotação (duplicação)

Ao clicar **Rotacionar**:

1. Modal de confirmação mostrando: "Será criada uma nova chave com nome `{nome} (rotacionada)`, mesmos escopos e expiração. A chave antiga **continua ativa** — revogue manualmente quando o cliente migrar."
2. Se a chave original tem scope `*`, exige novamente justificativa + frase `CONCEDER FULL` (igual à emissão original) — não é possível rotacionar uma chave full silenciosamente.
3. Backend cria nova chave linkada à anterior via campo novo `rotated_from`.
4. Audit log: `mcp_key.rotated` com `resource_id` = nova chave e `details.rotated_from` = id antigo.
5. Retorna chave plana **uma vez** (mesmo padrão da emissão).

Após rotação, a UI mostra um badge "↻ rotação de mcp_xxxx…" na chave nova e um banner amarelo na chave antiga: "Substituída em 12/04. Revogue quando seguro."

## Arquitetura técnica

### 1. Migração SQL

```sql
ALTER TABLE public.mcp_api_keys
  ADD COLUMN rotated_from uuid REFERENCES public.mcp_api_keys(id) ON DELETE SET NULL;

CREATE INDEX idx_mcp_api_keys_rotated_from
  ON public.mcp_api_keys(rotated_from)
  WHERE rotated_from IS NOT NULL;
```

Sem mudança de RLS — as policies criadas na sessão anterior já cobrem (admin lê/atualiza/deleta; INSERT só via service_role na edge function).

### 2. Edge function `mcp-keys-rotate`

Caminho: `supabase/functions/mcp-keys-rotate/index.ts`

Reusa toda a infraestrutura de `mcp-keys-issue`:
- CORS, JWT, role check `has_role(uid, 'admin')`.
- Body Zod: `{ source_key_id: uuid, justification?: string, confirmation_phrase?: string }`.
- Carrega a chave fonte com service-role (`select * from mcp_api_keys where id = source_key_id and revoked_at is null`).
- Se `isFullAccess(source.scopes)` → exige justificativa ≥20 chars + frase `CONCEDER FULL` (mesmas regras do `_shared/mcp-scopes.ts`, reusadas).
- Gera nova chave com mesmos `scopes` e `expires_at` da fonte, `name = "{source.name} (rotacionada)"`, `rotated_from = source.id`.
- Audit log `mcp_key.rotated` com `details = { source_id, source_prefix, scopes, is_full_access, justification }`.
- Retorna `{ ok, key, prefix, scopes, expires_at, id, rotated_from }`.

A chave antiga **não é revogada** (decisão do usuário: revogação manual). Apenas marcamos visualmente que foi rotacionada.

### 3. Lookup de criador

Hook `useMcpKeysWithCreators` faz join client-side: lista chaves + busca `profiles` por `id IN (created_by[])` em uma query única, monta `Map<userId, { email, display_name }>`.

### 4. Componentes novos (modulares)

```
src/pages/admin/AdminSegurancaChavesPage.tsx       (rota + layout)
src/components/admin/security/keys/
├── McpKeysList.tsx                                 (orquestra filtros + lista)
├── McpKeysFilters.tsx                              (busca + status + FULL toggle)
├── McpKeyRow.tsx                                   (linha individual com badges/ações)
├── McpKeyDetailsDrawer.tsx                         (audit log filtrado por resource_id)
├── RotateMcpKeyDialog.tsx                          (confirmação + revalidação FULL)
└── useMcpKeys.ts                                   (hook listagem + filtros + creators)
```

`IssueMcpKeyForm.tsx` (já existente) é reusado **sem alteração** dentro do botão "Nova chave".

### 5. Atualização do MCP tab

Em `src/components/admin/connections/McpTab.tsx`:
- Remove o card "Chaves emitidas" inteiro (linhas 146-228).
- No lugar, deixa um card menor: **"Gerenciar chaves"** com link `<Link to="/admin/seguranca/chaves">` + contagem rápida ("3 ativas, 1 expirada"). Evita duplicação e mantém o tab MCP focado em endpoint + GitHub.

### 6. Roteamento

`src/App.tsx`:
```tsx
const AdminSegurancaChavesPage = lazyWithRetry(() => import("./pages/admin/AdminSegurancaChavesPage"));
// ...
<Route path="/admin/seguranca/chaves" element={<AdminSegurancaChavesPage />} />
```

A página `AdminSegurancaPage` ganha uma terceira aba que linka para `/admin/seguranca/chaves` (não embutida — usa `<Link>` com `useLocation` para destacar o tab ativo), preservando a rota dedicada como SSOT.

### 7. Audit log

Reusa `admin_audit_log` (já existente). Novas actions:
- `mcp_key.rotated` (criada agora)
- `mcp_key.revoked` (passa a ser registrada — hoje a revogação é UPDATE direto no banco sem log; vamos adicionar um trigger ou registrar via wrapper no frontend)
- `mcp_key.viewed_details` (opcional, baixa prioridade — pode ficar fora desta entrega)

Opto por **trigger PG** em `mcp_api_keys` para `revoked_at IS NOT NULL`, escrevendo no audit log automaticamente — garante log mesmo se chamada vier por outra rota no futuro.

## Arquivos afetados

**Criados:**
- `supabase/functions/mcp-keys-rotate/index.ts`
- `src/pages/admin/AdminSegurancaChavesPage.tsx`
- `src/components/admin/security/keys/McpKeysList.tsx`
- `src/components/admin/security/keys/McpKeysFilters.tsx`
- `src/components/admin/security/keys/McpKeyRow.tsx`
- `src/components/admin/security/keys/McpKeyDetailsDrawer.tsx`
- `src/components/admin/security/keys/RotateMcpKeyDialog.tsx`
- `src/components/admin/security/keys/useMcpKeys.ts`
- Migração SQL (coluna `rotated_from` + trigger de audit em revogação)

**Editados:**
- `src/App.tsx` (nova rota lazy)
- `src/pages/admin/AdminSegurancaPage.tsx` (terceira aba apontando para a rota dedicada)
- `src/components/admin/connections/McpTab.tsx` (substitui card de chaves por link resumido)

## O que NÃO entra

- Rotação automática agendada (cron job para chaves próximas do vencimento).
- Notificação por email/webhook em rotação ou expiração próxima.
- Aprovação por dois admins (4-eyes) — fica para evolução futura.
- Filtros avançados (por escopo específico, range de datas) — só status/FULL/busca nesta entrega.

## Resultado

Após implementação:
- Tela única e dedicada (`/admin/seguranca/chaves`) substitui o gerenciamento embutido no MCP tab.
- Status visual claro de cada chave (ativa/expirada/revogada/FULL) + datas + último uso + criador.
- Rotação por duplicação preserva escopos/expiração e re-exige fricção FULL quando aplicável.
- Audit log automático em revogação via trigger; rotação registrada pela edge function.
