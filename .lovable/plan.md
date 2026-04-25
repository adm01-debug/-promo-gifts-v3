# Plano: Otimização de cold starts no `external-db-bridge`

## Diagnóstico (já confirmado por leitura)

A função tem **3 ineficiências reais** que causam picos de latência em rajadas:

1. **Client recriado a cada request** — `getExternalClient()` chama `createClient()` toda vez. Em rajadas de 6+ chamadas paralelas (catálogo, dashboards), cada uma paga TLS handshake + auth round-trip (~300–800ms).
2. **Sem warm-up no boot do isolate** — quando o isolate sobe (cold start ~50ms), a primeira query ainda paga handshake completo. Total cold + 1ª query: 800–1500ms.
3. **Backoff do health-check no front começa em 300ms** — para cold starts típicos (~300ms), poderíamos polar antes.

O handler `ping` e o `circuit-breaker` já existem e funcionam bem. Sem mexer.

## Mudanças

### 1. `supabase/functions/external-db-bridge/index.ts`

**Singleton de client por isolate:**
- Cachear `cachedExternalClient` em escopo de módulo
- `getExternalClient()` retorna a instância existente em vez de recriar
- Mantém o fallback gracioso quando env vars faltam

**Warm-up no boot:**
- Função `warmupExternalClient()` que cria o client e dispara `select id from suppliers limit 1`
- Chamada uma única vez, em paralelo ao `Deno.serve` (não bloqueia)
- Logs `[boot-warmup] ✅ external client ready (Xms)` para telemetria
- Idempotente (`warmupPromise` cacheado)

**Ping não checa breaker:**
- Mover o check `breaker.canRequest()` para depois do parse do body
- Se `body.operation === 'ping'`, ignorar circuit breaker (ping é diagnóstico — útil saber que isolate respira mesmo com BD em falha)

### 2. `src/lib/external-db/health-check.ts`

**Backoff mais agressivo para cold starts curtos:**
- Backoff inicial: 300ms → **150ms**
- Cap: 1500ms → **800ms**
- Sequência: 150 → 300 → 600 → 800 → 800 (em vez de 300 → 600 → 1200 → 1500)
- Mantém timeout total de 8s e cache de 30s

### 3. Teste

- Atualizar `tests/lib/external-db-prewarm.test.ts` (sem mudanças necessárias — o mock já cobre o ping)
- Adicionar 1 teste em `supabase/functions/external-db-bridge/` validando que `getExternalClient` retorna mesma instância em chamadas consecutivas (singleton)

## Detalhes técnicos

**Arquivos editados:**
- `supabase/functions/external-db-bridge/index.ts` — substituir bloco `getExternalClient` (linhas 1458–1481), reorganizar entrada do handler para mover ping antes do breaker (linhas 388–412)
- `src/lib/external-db/health-check.ts` — ajustar constantes de backoff (linhas 89, 96)
- `supabase/functions/external-db-bridge/singleton.test.ts` — novo teste Deno

**Não toca:**
- Schema, RLS, credenciais
- Lógica de retry em `statement timeout` (já calibrada)
- Circuit breaker config (5 falhas / 30s)
- Front-end consumidor (compatibilidade total com payload `ping` atual)

**Impacto esperado:**
- Cold start + 1ª query: 800–1500ms → **~250ms**
- Rajada paralela 6 requests pós-warm: 800ms peak → **~200ms peak**
- Health-check em isolate quase pronto: 600ms → **~150ms**

**Riscos:**
- Singleton de client no isolate: Deno isolates já são per-instance, não há vazamento entre tenants
- Warm-up usa tabela `suppliers` (poucos registros, sempre presente — confirmado no schema do projeto)

Após aprovação, executo na ordem: edição do bridge → deploy → edição do health-check → testes.