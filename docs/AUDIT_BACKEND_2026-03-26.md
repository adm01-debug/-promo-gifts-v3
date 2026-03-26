# 🔍 Auditoria Completa de Backend — Gifts Store
**Data:** 2026-03-26  
**Auditor:** Análise automatizada (Sênior Back-End)  
**Escopo:** Edge Functions, RLS, Auth, Bridges, Segurança, Performance, Manutenibilidade

---

## 📋 Sumário Executivo

O sistema apresenta uma arquitetura multi-database sofisticada com **39 Edge Functions**, **38 tabelas com RLS ativo**, e **3 bases de dados** (Local, Catálogo Externo, CRM Externo). A governança de segurança é **acima da média** para projetos deste porte, com RBAC implementado via `SECURITY DEFINER` functions e isolamento por `seller_id`/`user_id`.

### Métricas Gerais
| Indicador | Valor | Avaliação |
|---|---|---|
| Tabelas com RLS ativo | 38/38 | ✅ Excelente |
| Edge Functions com Auth | ~85% | ⚠️ Bom (gaps abaixo) |
| Código morto estimado | ~600 linhas (external-db-bridge) | ⚠️ Dívida técnica |
| Linter warnings (Supabase) | 2 | ⚠️ Ação necessária |
| CORS wildcard | 100% das functions | 🔴 Risco (ver SEC-01) |

### Top 5 Riscos Críticos
1. **SEC-01**: CORS `Access-Control-Allow-Origin: *` em todas as Edge Functions
2. **SEC-02**: `log-login-attempt` sem autenticação — permite log injection
3. **SEC-03**: `external-db-bridge` permite leitura pública sem JWT (product tables)
4. **SEC-04**: Leaked Password Protection desabilitada (Supabase Linter)
5. **PERF-01**: `external-db-bridge` com 1.765 linhas — manutenibilidade comprometida

---

## 🔴 Categoria 1: SEGURANÇA

### SEC-01 — CORS Wildcard (`Access-Control-Allow-Origin: *`)
- **Severidade:** Alta
- **Impacto:** Segurança
- **Prioridade:** Crítico
- **Descrição:** Todas as 39 Edge Functions usam `Access-Control-Allow-Origin: *`, permitindo que qualquer domínio faça requests. Para um sistema interno de gestão comercial, isto é um risco desnecessário.
- **Evidência:**
  ```typescript
  // Presente em TODAS as edge functions
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    ...
  };
  ```
- **Recomendação:** Restringir para os domínios de produção:
  ```typescript
  const ALLOWED_ORIGINS = [
    "https://criar-together-now.lovable.app",
    "https://seu-dominio-customizado.com",
  ];
  const origin = req.headers.get("Origin") || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  ```

### SEC-02 — `log-login-attempt` sem autenticação
- **Severidade:** Alta
- **Impacto:** Segurança, Estabilidade
- **Prioridade:** Crítico
- **Descrição:** A edge function `log-login-attempt` aceita qualquer request sem JWT. Um atacante pode inundar a tabela `login_attempts` com dados falsos, corrompendo auditorias e potencialmente causando lockouts falsos no `validate-access`.
- **Evidência:**
  ```typescript
  // log-login-attempt/index.ts — SEM verificação de auth
  Deno.serve(async (req) => {
    const { email, user_id, ip_address, success, failure_reason } = await req.json();
    // Insere diretamente com service_role, sem validar quem enviou
    await supabaseAdmin.from("login_attempts").insert({...});
  });
  ```
- **Impacto:** Um adversário pode:
  - Registrar milhares de tentativas falsas para um IP, ativando lockout no `validate-access`
  - Poluir logs de auditoria com dados fabricados
- **Recomendação:**
  1. Adicionar rate limiting via `_shared/rate-limiter.ts`
  2. Validar que o `email` corresponde a um usuário real antes de inserir
  3. Ou mover a lógica de logging para um trigger `AFTER INSERT` na tabela de auth

### SEC-03 — Leitura pública no `external-db-bridge`
- **Severidade:** Média
- **Impacto:** Segurança
- **Prioridade:** Importante
- **Descrição:** O `external-db-bridge` permite operações `SELECT` em ~86 tabelas de produtos **sem JWT**. Embora sejam dados de catálogo, a superfície de ataque é ampla: um atacante pode enumerar todas as tabelas de preços de fornecedores, markups de organização e dados de estoque.
- **Evidência:**
  ```typescript
  // external-db-bridge/index.ts, linha ~908-912
  const allowPublicAccess = isReadOperation && isPublicTable;
  // PRODUCT_TABLES inclui: variant_supplier_sources, organization_markup_customization, price_history
  ```
- **Tabelas sensíveis expostas publicamente:**
  - `variant_supplier_sources` — preços de custo dos fornecedores
  - `organization_markup_customization` — markups de lucro da organização
  - `price_history` — histórico de alterações de preço
- **Recomendação:** Criar dois grupos:
  - `PUBLIC_PRODUCT_TABLES`: products, categories, product_images, tags (dados de catálogo)
  - `AUTHENTICATED_PRODUCT_TABLES`: variant_supplier_sources, price_history, markups (dados comerciais)

### SEC-04 — Leaked Password Protection desabilitada
- **Severidade:** Média
- **Impacto:** Segurança
- **Prioridade:** Importante
- **Descrição:** O Supabase Linter detectou que a proteção contra senhas vazadas (HIBP) está desabilitada, apesar da memória `auth-governance-and-standards` afirmar que foi habilitada.
- **Recomendação:** Reativar via `configure_auth`:
  ```
  cloud--configure_auth → enable leaked password protection
  ```

### SEC-05 — Extensão instalada no schema `public`
- **Severidade:** Baixa
- **Impacto:** Segurança
- **Prioridade:** Desejável
- **Descrição:** O Supabase Linter detectou extensão(ões) no schema `public`. Extensões devem residir em um schema dedicado (`extensions`) para isolar privilégios.
- **Recomendação:** Migrar extensões para schema `extensions` conforme [docs Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).

### SEC-06 — `expert-chat` consulta tabelas inexistentes localmente
- **Severidade:** Baixa
- **Impacto:** Estabilidade
- **Prioridade:** Desejável
- **Descrição:** O `expert-chat` consulta `bitrix_clients`, `bitrix_deals` e faz `search_products_semantic` — tabelas que podem não existir no banco local (migradas para CRM externo). Erros são silenciados mas geram overhead.
- **Evidência:**
  ```typescript
  // expert-chat/index.ts, linhas ~116-137
  const { data: client } = await supabase.from("bitrix_clients").select("*")...
  const { data: deals } = await supabase.from("bitrix_deals").select("*")...
  ```
- **Recomendação:** Migrar para uso do `crm-db-bridge` ou remover referências a tabelas do CRM externo.

### SEC-07 — `manage-users` permite criação de admin por admin
- **Severidade:** Baixa
- **Impacto:** Segurança
- **Prioridade:** Desejável
- **Descrição:** A function `manage-users` permite que qualquer admin crie outros admins sem restrição. Não há auditoria formal (apenas `console.log`) nem limite de roles que podem ser atribuídas.
- **Evidência:**
  ```typescript
  // manage-users/index.ts, linhas 78-83
  if (role && role !== 'vendedor' && newUser.user) {
    await supabaseAdmin.from('user_roles').update({ role }).eq('user_id', newUser.user.id);
  }
  ```
- **Recomendação:** Adicionar log de auditoria em tabela e validar roles permitidas.

---

## 🟡 Categoria 2: PERFORMANCE

### PERF-01 — Monólito `external-db-bridge` (1.765 linhas)
- **Severidade:** Média
- **Impacto:** Manutenibilidade, Performance
- **Prioridade:** Importante
- **Descrição:** A edge function `external-db-bridge` concentra toda a lógica de proxy para o banco externo em um único arquivo de 1.765 linhas, incluindo ~600 linhas de código morto identificado. Cold starts são impactados pelo tamanho.
- **Recomendação:**
  1. Extrair handlers de alias (technique, price table) para módulos separados
  2. Remover as ~600 linhas de código morto identificadas
  3. Considerar split em 2-3 functions menores (catalog-read, catalog-write, rpc-proxy)

### PERF-02 — Cache in-memory sem limite de entradas
- **Severidade:** Baixa
- **Impacto:** Performance, Estabilidade
- **Prioridade:** Desejável
- **Descrição:** O cache `referenceCache` no `external-db-bridge` usa um `Map` sem limite de tamanho. Em isolates de longa duração com muitas queries distintas, o uso de memória pode crescer sem controle.
- **Evidência:**
  ```typescript
  const referenceCache = new Map<string, CacheEntry<unknown>>();
  // Sem maxSize, apenas TTL de 10min
  ```
- **Recomendação:** Implementar LRU cache com limite (ex: 100 entradas):
  ```typescript
  const MAX_CACHE_ENTRIES = 100;
  function setCache<T>(key: string, data: T): void {
    if (referenceCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = referenceCache.keys().next().value;
      referenceCache.delete(oldest);
    }
    referenceCache.set(key, { data, timestamp: Date.now() });
  }
  ```

### PERF-03 — Rate limiter in-memory não persiste entre isolates
- **Severidade:** Baixa
- **Impacto:** Segurança, Performance
- **Prioridade:** Desejável
- **Descrição:** O `_shared/rate-limiter.ts` usa `Map` em memória, que é resetado quando o isolate do Deno recicla (~5-15min). Rate limits efetivos são muito mais frouxos do que configurados.
- **Recomendação:** Para rate limiting robusto, usar Redis ou a tabela `login_attempts` com contagem por janela temporal.

### PERF-04 — `AuthContext` faz `UPDATE last_login_at` a cada refresh de sessão
- **Severidade:** Baixa
- **Impacto:** Performance
- **Prioridade:** Desejável
- **Descrição:** O `fetchUserData` no `AuthContext.tsx` atualiza `last_login_at` toda vez que é chamado — incluindo tab focus e recarregamentos. Isto gera writes desnecessários.
- **Evidência:**
  ```typescript
  // AuthContext.tsx, linhas 92-100
  supabase.from("profiles").update({ last_login_at: new Date().toISOString() })...
  ```
- **Recomendação:** Throttle: atualizar apenas se última atualização > 5 minutos.

---

## 🟠 Categoria 3: ARQUITETURA E MANUTENIBILIDADE

### ARCH-01 — Duplicação de lógica de autenticação entre Edge Functions
- **Severidade:** Média
- **Impacto:** Manutenibilidade
- **Prioridade:** Importante
- **Descrição:** Cada Edge Function reimplementa a autenticação JWT de forma ligeiramente diferente. O `crm-db-bridge` usa `authenticateRequest()`, o `external-db-bridge` usa inline auth, `expert-chat` usa outro padrão, e `manage-users` outro.
- **Recomendação:** Extrair para `_shared/auth.ts`:
  ```typescript
  export async function authenticateRequest(req: Request, options?: { requireRole?: AppRole }): 
    Promise<{ userId: string; userRole: string } | Response>
  ```

### ARCH-02 — `profiles.role` como campo legado sem trigger de sync
- **Severidade:** Baixa
- **Impacto:** Consistência de dados
- **Prioridade:** Desejável
- **Descrição:** A tabela `profiles` tem um campo `role` (string) que é legado — a fonte de verdade é `user_roles`. No entanto, não há trigger para manter sincronismo, potencialmente causando inconsistência se alguém consultar `profiles.role` diretamente.
- **Recomendação:** Adicionar trigger ou remover o campo `profiles.role` em uma migration.

### ARCH-03 — Ausência de tabela de `audit_log` para operações administrativas
- **Severidade:** Média
- **Impacto:** Segurança, Conformidade
- **Prioridade:** Importante
- **Descrição:** Operações críticas como criação/exclusão de usuários (`manage-users`), alteração de roles e configurações de segurança são registradas apenas em `console.log`, que é efêmero.
- **Recomendação:** Criar tabela `admin_audit_log`:
  ```sql
  CREATE TABLE public.admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    metadata jsonb DEFAULT '{}',
    ip_address text,
    created_at timestamptz DEFAULT now()
  );
  ```

### ARCH-04 — `order_items.order_id` é `text` mas referencia `orders.id` (uuid)
- **Severidade:** Baixa
- **Impacto:** Consistência, Performance
- **Prioridade:** Desejável
- **Descrição:** Na política RLS de `order_items`, o join usa `(o.id)::text = order_items.order_id`, indicando que `order_id` é `text` quando deveria ser `uuid`. Isto impede uso de índices e foreign key constraints.
- **Evidência:** Policy `Sellers can read own order items` contém cast `(o.id)::text`.
- **Recomendação:** Migrar `order_items.order_id` para `uuid` com FK para `orders.id`.

---

## 🔵 Categoria 4: RLS E GOVERNANÇA DE DADOS

### RLS-01 — Tabelas com políticas insuficientes
Todas as 38 tabelas têm RLS ativo ✅. Análise de cobertura:

| Tabela | Policies | Avaliação | Observação |
|---|---|---|---|
| `quotes` | 2 (ALL + SELECT manager) | ⚠️ | Managers podem ler tudo mas não veem `quote_items` diretamente |
| `quote_history` | 1 (ALL via ownership) | ✅ | Adequado |
| `quote_templates` | 1 (ALL via ownership + admin) | ✅ | Adequado |
| `login_attempts` | 2 (admin SELECT + service INSERT) | ✅ | Adequado para tabela de auditoria |
| `web_vitals` | 2 (admin SELECT + user INSERT) | ✅ | Adequado |
| `query_telemetry` | 3 (admin R/D + user INSERT) | ✅ | Adequado |

### RLS-02 — `quote_comments` tem 3 políticas SELECT potencialmente redundantes
- **Severidade:** Baixa
- **Impacto:** Performance
- **Prioridade:** Desejável
- **Descrição:** A tabela `quote_comments` possui 3 políticas SELECT: (1) managers, (2) sellers por ownership, (3) users por user_id + admin. Policies PERMISSIVE são OR-merged, funcionam corretamente, mas a redundância entre (1) e (3) para admins gera avaliação de 3 policies em vez de 2.

---

## 🟢 Categoria 5: INTEGRAÇÕES

### INT-01 — `crm-db-bridge` usa `SUPABASE_ANON_KEY` para conectar ao CRM externo
- **Severidade:** Média
- **Impacto:** Segurança
- **Prioridade:** Importante
- **Descrição:** O bridge usa `CRM_SUPABASE_ANON_KEY` para criar o client, o que significa que o CRM externo deve ter RLS desabilitado ou policies abertas para funcionar. Se o CRM tem dados sensíveis além das tabelas whitelistadas, eles ficam acessíveis.
- **Evidência:**
  ```typescript
  const crm = createClient(CRM_URL, CRM_KEY); // CRM_KEY = anon key
  ```
- **Recomendação:** Se possível, usar service_role key com queries restritas no bridge, ou garantir que o CRM tem RLS estrito.

### INT-02 — `VENDOR_WRITE_TABLES` vazio no CRM bridge
- **Severidade:** Info
- **Impacto:** Funcionalidade
- **Prioridade:** Desejável
- **Descrição:** `VENDOR_WRITE_TABLES` é `[]`, então vendedores não podem escrever em nenhuma tabela do CRM. Se orçamentos do CRM precisarem de write, este array precisa ser populado.

---

## 📊 Categoria 6: OBSERVABILIDADE

### OBS-01 — Telemetria de queries com persistência seletiva
- **Severidade:** Info  
- **Impacto:** Operacionalidade
- **Prioridade:** Desejável
- **Descrição:** O `external-db-bridge` persiste apenas queries slow/error na tabela `query_telemetry` (fire-and-forget). Queries normais são perdidas. Para análise de padrões de uso, considerar sampling (ex: 1% das queries OK).

### OBS-02 — Sem monitoramento de saúde dos bridges
- **Severidade:** Média
- **Impacto:** Estabilidade
- **Prioridade:** Importante
- **Descrição:** Não existe healthcheck automatizado para os bancos externos. Se o CRM ou o catálogo ficarem indisponíveis, o sistema descobre apenas quando um usuário falha.
- **Recomendação:** Criar cron job (via Supabase pg_cron ou edge function schedulada) que faz ping nos bridges a cada 5 minutos e registra status.

---

## 📈 Roadmap de Prioridades

### 🔴 Prioridade Crítica (Semana 1)
1. **SEC-01** — Restringir CORS para domínios de produção
2. **SEC-02** — Adicionar auth/rate-limit ao `log-login-attempt`
3. **SEC-04** — Reativar Leaked Password Protection

### 🟠 Prioridade Alta (Semana 2-3)
4. **SEC-03** — Separar tabelas públicas de tabelas comerciais no bridge
5. **ARCH-01** — Extrair auth para módulo compartilhado `_shared/auth.ts`
6. **ARCH-03** — Criar tabela `admin_audit_log`
7. **OBS-02** — Implementar healthcheck automatizado dos bridges

### 🟡 Prioridade Média (Semana 4-6)
8. **PERF-01** — Refatorar `external-db-bridge` (remover código morto, modularizar)
9. **INT-01** — Avaliar uso de service_role no CRM bridge
10. **SEC-06** — Migrar `expert-chat` para usar CRM bridge

### 🔵 Prioridade Baixa (Backlog)
11. **PERF-02** — Implementar LRU cache com limite
12. **PERF-04** — Throttle em `last_login_at`
13. **ARCH-02** — Remover `profiles.role` legado
14. **ARCH-04** — Migrar `order_items.order_id` para uuid
15. **RLS-02** — Simplificar policies de `quote_comments`

---

## 📊 Benchmarking vs. Padrões do Mercado

| Aspecto | Gifts Store | Padrão Mercado | Gap |
|---|---|---|---|
| RLS em 100% das tabelas | ✅ | ✅ | Nenhum |
| CORS restritivo | ❌ Wildcard | ✅ Domínios específicos | **Gap crítico** |
| Audit trail persistente | ❌ console.log | ✅ Tabela dedicada | **Gap importante** |
| Rate limiting distribuído | ❌ In-memory | ✅ Redis/DB | Gap moderado |
| Auth centralizado | ❌ Duplicado | ✅ Middleware shared | Gap moderado |
| Healthchecks automatizados | ❌ Manual | ✅ Cron + alertas | Gap moderado |
| Password leak protection | ❌ Desabilitado | ✅ HIBP integrado | **Gap importante** |
| Código morto | ~600 linhas | 0 | Gap moderado |

---

## Conclusão

O sistema tem uma **base sólida** com RLS 100%, RBAC via SECURITY DEFINER, e bridges bem estruturados. Os gaps mais críticos estão na **superfície de ataque** (CORS wildcard, endpoints sem auth) e na **observabilidade** (ausência de audit log e healthchecks). A refatoração do monólito `external-db-bridge` é a maior dívida técnica do backend.

**Score geral de maturidade: 7.2/10**

---

*Relatório gerado automaticamente. Recomenda-se revisão humana das recomendações antes de implementação.*
