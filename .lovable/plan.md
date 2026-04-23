

# Cron de teste automático de conexões ativas

## Diagnóstico

Hoje em `/admin/conexoes`:
- O cron `connections-health-check` (`*/15 * * * *`) **lê** `external_connections.last_test_ok` para detectar quedas, mas **não testa** as conexões — depende do admin clicar manualmente em "Testar conexão" em cada aba.
- A edge function `connection-tester` já implementa toda a lógica de ping e persistência (atualiza `last_test_at`, `last_test_ok`, `last_test_message`, `last_latency_ms` em `external_connections` + grava em `connection_test_history`).
- Resultado: `last_test_at` envelhece silenciosamente. O health-check pode marcar uma conexão como "verde" porque o último teste manual foi OK há 3 dias, mesmo que o serviço esteja fora há 6 horas.

## Solução

Novo cron `connections-auto-test` que executa a cada 30 minutos, lê todas as conexões ativas em `external_connections` e dispara `connection-tester` para cada uma, atualizando os campos de status automaticamente.

### 1. Nova edge function `connections-auto-test`

`supabase/functions/connections-auto-test/index.ts`:

- Cron-driven (sem JWT, `verify_jwt = false` no `config.toml`)
- Lê `external_connections` onde `status = 'active'` (ignora `disabled`/`unconfigured`)
- Para cada conexão, invoca internamente a mesma lógica do `connection-tester` (action `test`) reutilizando helpers — não vamos chamar a edge via HTTP para evitar overhead e problemas de auth.
- **Refatoração mínima**: extrair o núcleo de teste de `connection-tester/index.ts` para `_shared/connection-test-runner.ts` (função `runConnectionTest(type, config, env_key, connection_id, serviceClient)`) que ambas as edges importam.
- Concorrência: testa em paralelo em batches de 5 (`Promise.all` com chunking) para não saturar.
- Timeout por conexão: 8s (mesmo do tester atual).
- Retorna JSON resumido: `{ tested: N, ok: X, failed: Y, skipped: Z, durations_ms: {...} }`.
- Loga estruturado por conexão: `[auto-test] {type} {name} → ok=true latency=234ms`.

### 2. Refatoração de `connection-tester` (não-quebrante)

Mover o switch `case "supabase"|"bitrix24"|"n8n"|"mcp"|"webhook_outbound"` que executa o ping HTTP para `_shared/connection-test-runner.ts`. A edge `connection-tester` continua expondo as actions `test` e `last_test` como hoje, apenas delegando o teste real ao helper compartilhado. Nenhuma mudança de contrato no frontend.

### 3. Cron schedule

Inserir via tool de SQL (não migração — contém URL específica do projeto, igual ao padrão dos crons existentes):

```sql
SELECT cron.schedule(
  'connections-auto-test',
  '*/30 * * * *',  -- a cada 30 minutos
  $$
  SELECT net.http_post(
    url := 'https://nmojwpihnslkssljowjh.supabase.co/functions/v1/connections-auto-test',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_ANON_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Frequência **30 minutos** (não 15) para ficar deslocado do `connections-health-check` — assim o health-check sempre vê dados frescos do auto-test imediatamente anterior, sem condição de corrida.

### 4. Visibilidade na UI

No `IntegrationsHealthCard` adicionar uma linha discreta:

```text
Última auto-verificação: há 12 min · 7 OK · 1 falha
[ Ver últimos testes → ]
```

Calculada client-side a partir do `MAX(last_test_at)` e contagens em `external_connections`. Sem endpoint novo — usa a query já existente de `useConnectionsOverview`.

### 5. Proteção contra spam de notificações

O `connections-health-check` já tem dedupe de 4h por `incident_key`. Quando o auto-test começar a popular `last_test_ok = false` automaticamente, o health-check vai notificar — mas o dedupe garante 1 alerta por conexão a cada 4h, não a cada 30min. Sem mudança necessária.

### 6. Observabilidade

- Logs estruturados em `connections-auto-test` com `console.log` JSON.
- Linha extra em `connection_test_history` com coluna implícita `triggered_by = 'cron'` vs `'manual'`. Já existe a coluna? Vou verificar e, se não, adicionar via migração leve (`ALTER TABLE connection_test_history ADD COLUMN triggered_by text DEFAULT 'manual'`). O `connection-tester` passa `'manual'` (default), o auto-test passa `'cron'`.

## Arquivos tocados

**Backend (novos)**
- `supabase/functions/connections-auto-test/index.ts` (~120 linhas): orquestrador cron, leitura de `external_connections` ativos, batch de 5, agregação de resultado.
- `supabase/functions/_shared/connection-test-runner.ts` (~250 linhas): núcleo de teste extraído de `connection-tester` — `runConnectionTest({ type, config, env_key, connection_id, triggered_by, serviceClient })` que retorna `{ ok, status, latency_ms, error, message }` e persiste em `external_connections` + `connection_test_history`.

**Backend (editados)**
- `supabase/functions/connection-tester/index.ts`: passa a importar e delegar para `runConnectionTest`. Mantém actions `test`/`last_test` e o contrato JSON existente.
- `supabase/config.toml`: adicionar `[functions.connections-auto-test]` com `verify_jwt = false`.

**Migration**
- `ALTER TABLE public.connection_test_history ADD COLUMN IF NOT EXISTS triggered_by text NOT NULL DEFAULT 'manual'` + check constraint via trigger (`'manual' | 'cron' | 'webhook'`).

**SQL (insert tool, não migration)**
- `cron.schedule('connections-auto-test', '*/30 * * * *', ...)`.

**Frontend (editados)**
- `src/components/admin/connections/IntegrationsHealthCard.tsx`: adicionar linha "Última auto-verificação: há X min · Y OK · Z falha" a partir dos dados de `useConnectionsOverview`.
- `src/components/admin/connections/ConnectionTestHistoryPanel.tsx`: adicionar badge sutil `auto` (`Bot` icon de Lucide) ao lado do timestamp quando `triggered_by === 'cron'`, para distinguir testes automáticos dos manuais.

## Fora de escopo

- Não muda a frequência do cron `connections-health-check` (continua `*/15`).
- Não testa conexões `disabled` ou `unconfigured` (auto-test é só para `active`).
- Não adiciona controle por-conexão de "auto-test ativo/desativado" — todas as ativas são testadas (pode virar feature flag depois).
- Não muda o `webhook-dispatcher` nem o `mcp-server`.
- Não adiciona retry com backoff dentro do auto-test (1 tentativa, falha vai para `connection_test_history` e o health-check decide se notifica).

