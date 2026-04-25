## Objetivo

Garantir que o cliente **só dispare cargas pesadas (catálogo, admin, fan-outs) quando o backend Lovable Cloud estiver `ACTIVE_HEALTHY`**, com retries inteligentes e alerta visual durante estados transitórios (`COMING_UP`, `RESTARTING`, `UPGRADING`, `ACTIVE_UNHEALTHY`, `INACTIVE`).

Hoje temos `pingHealth` + `waitForBridgeReady` testando apenas o `external-db-bridge`. Falta:
1. Um sondador genérico de **plataforma** (não só bridge) que distinga "backend pausado/subindo" de "isolate frio".
2. Gate global aplicado nos pontos de entrada de dados.
3. Alerta UI quando o estado for transitório/degradado.

---

## Mudanças

### 1. Novo módulo `src/lib/cloud-status.ts`
Sondador único de status do Cloud com 3 sinais combinados:
- `auth.getSession()` (verifica plataforma viva, <500ms quando OK).
- `pingHealth()` (bridge externo).
- HEAD em `/rest/v1/` com timeout 2s (Postgres reachable).

Mapeia para estados normalizados: `healthy | warming | degraded | down`.
- 3/3 OK → `healthy`
- 2/3 OK ou latência >2s → `warming`
- 1/3 OK → `degraded`
- 0/3 OK → `down`

Cache 15s, coalescing de chamadas paralelas, EventTarget para broadcast.

### 2. Hook `useCloudStatus()` em `src/hooks/useCloudStatus.ts`
Retorna `{ status, lastChecked, retry() }`. Polling adaptativo:
- `healthy`: re-checa a cada 60s.
- `warming/degraded`: re-checa a cada 5s com backoff 5→10→15s.
- `down`: para automático em 30s e exige retry manual.

### 3. Gate de fetch em `src/lib/external-db/invoke.ts` e `bridge.ts`
Antes de toda chamada externa, aguarda `ensureCloudReady(timeoutMs)` (wrapper sobre `waitForBridgeReady` + status check). Se status ≠ `healthy` após orçamento, rejeita com `CloudNotReadyError` tipado em vez de deixar o fetch estourar 503/timeout no meio da query.

### 4. Componente `<CloudStatusBanner />`
Banner discreto (top, dismissible) renderizado em `App.tsx` quando status é `warming|degraded|down`:
- `warming`: "Backend reiniciando, aguarde alguns segundos…" (info, com spinner).
- `degraded`: "Backend instável — algumas operações podem falhar" (warning).
- `down`: "Backend indisponível" + botão "Tentar novamente" (destructive).

Usa tokens semânticos do design system (`bg-warning`, `bg-destructive`).

### 5. Retry inteligente no React Query
Em `src/lib/queryClient.ts` (ou onde o `QueryClient` é instanciado), atualizar `defaultOptions.queries.retry`:
- Se erro for `CloudNotReadyError` → retry até 5x com delay alinhado ao polling do status.
- Se erro 5xx do bridge → retry 3x com backoff exponencial.
- Erros 4xx → não retry.

### 6. Testes
- `tests/lib/cloud-status.test.ts`: estados combinados (healthy/warming/degraded/down) e cache.
- `tests/lib/ensure-cloud-ready.test.ts`: gate rejeita com `CloudNotReadyError` quando status persiste degradado.

---

## Detalhes técnicos

- Sem novo edge function — tudo client-side reusando `external-db-bridge` ping + REST endpoint público do Supabase.
- `CloudNotReadyError extends Error` com `code: 'CLOUD_NOT_READY'` e `status` atual para telemetria.
- Banner usa `framer-motion` (já no projeto) com `AnimatePresence`.
- Logger estruturado: `[CloudStatus] state change healthy → warming` em `logger.warn`.

## Arquivos

**Criar:**
- `src/lib/cloud-status.ts`
- `src/hooks/useCloudStatus.ts`
- `src/components/system/CloudStatusBanner.tsx`
- `tests/lib/cloud-status.test.ts`
- `tests/lib/ensure-cloud-ready.test.ts`

**Editar:**
- `src/lib/external-db/invoke.ts` (gate)
- `src/lib/external-db/bridge.ts` (gate)
- `src/App.tsx` (montar banner)
- `src/lib/queryClient.ts` (retry policy)
- `.lovable/plan.md` (registro)

## Critério de sucesso

- Em cold start do Cloud, o catálogo aguarda o status virar `healthy` antes de disparar 4 queries paralelas (zero 503 em cascata).
- Usuário vê feedback visual em até 1s quando o backend está degradado.
- Erros de "backend indisponível" passam a ser categorizados (`CloudNotReadyError`) ao invés de timeouts genéricos.
## ✅ Implementado (cloud-status gate + retries)

- `src/lib/cloud-status.ts`: sondador unificado (auth + bridge + REST), estados `healthy|warming|degraded|down`, cache 15s, EventTarget broadcast, `ensureCloudReady()` e `CloudNotReadyError`.
- `src/hooks/useCloudStatus.ts`: hook com polling adaptativo (60s healthy, 5→10→15s warming/degraded, parada automática em 30s para `down`).
- `src/components/system/CloudStatusBanner.tsx`: banner sticky com tokens semânticos e botão de retry para `down`.
- `src/lib/external-db/invoke.ts`: gate best-effort (só bloqueia se cache indica `down/degraded`, retornando `CloudNotReadyError`).
- `src/lib/query-config.ts`: retry policy por tipo de erro (`CLOUD_NOT_READY` → 5x; 5xx → 3x; 4xx → no retry); delay alinhado ao polling.
- `src/App.tsx`: `<CloudStatusBanner />` montado acima do `<BridgeStatusBanner />`.
- `tests/lib/cloud-status.test.ts`: 7 testes cobrindo todos os estados, cache e gate.

Validação: 17/17 testes (`cloud-status` + `external-db-invoke`) passam. Cloud atualmente `ACTIVE_HEALTHY`.
