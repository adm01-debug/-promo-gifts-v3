## Mudança única e cirúrgica

Em `src/lib/external-db/invoke.ts`, tornar o prefixo de contexto **obrigatório** na regex de detecção de HTTP determinístico, para eliminar falsos positivos em IDs com hífens.

### Antes
```ts
const NON_RETRYABLE_HTTP_RE = /\b(?:returned\s+|status[: ]|http[:/ ])?(400|401|403)\b/i;
```
O `?` torna o prefixo opcional → `\b401\b` casa em `abc-401-xyz` (hífen é word boundary).

### Depois
```ts
const NON_RETRYABLE_HTTP_RE = /(?:returned\s+|status[: ]\s*|http[:/ ])(400|401|403)\b/i;
```
Prefixo obrigatório (`returned `, `status:`, `status `, `http/`, `http:`, `http `). Mensagens reais da edge function (`"Edge function returned 400"`, `"status: 401"`, `"http/403"`) continuam sendo fail-fast; IDs/UUIDs/slugs com `400/401/403` deixam de disparar o classifier.

## Impacto

- 503 e cold-start → continuam retentáveis (regra já vencia tudo).
- HTTP 400/401/403 vindos da plataforma → continuam fail-fast (todos os formatos reais têm prefixo).
- IDs como `abc-401-xyz` ou UUIDs `400e1234-...` → não são mais classificados como non-retryable falso.

## Atualização de teste

Em `tests/lib/external-db-invoke.test.ts`, fortalecer o caso `"Dígitos colados em palavra"` para também cobrir o cenário com hífen (`abc-401-xyz`), confirmando que **agora** segue o fluxo normal sem fail-fast falso.

## Validação

Rodar `bunx vitest run tests/lib/external-db-invoke.test.ts tests/lib/external-db-immutable-cache.test.ts` e confirmar 33/33 passando (0 regressão).