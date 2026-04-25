# Corrigir card "Sem credenciais" no /admin/conexoes

## Diagnóstico

A arquitetura **já está correta** — o card lê de `integration_credentials` (a tabela que você apontou) via a edge function `secrets-manager`. O problema é um **bug de código** que quebra a função inteira:

**Arquivo:** `supabase/functions/secrets-manager/index.ts` (linhas 150‑157)

```ts
const enriched = rows.map((r) => ({...}));   // linha 150
const enriched = rows.map((r) => ({...}));   // linha 154 — REDECLARADO
```

Variável `enriched` declarada **duas vezes** no mesmo escopo → erro TypeScript em runtime → função não inicializa → frontend recebe erro → `secrets` fica array vazio → todos os campos viram "Não configurado".

Isso também explica os 503 `SUPABASE_EDGE_RUNTIME_ERROR` que aparecem no `secrets-manager` (cold start falhando).

## Correção (1 arquivo, ~3 linhas)

**`supabase/functions/secrets-manager/index.ts`**
- Remover o bloco duplicado das linhas 154‑157.
- Manter apenas a primeira declaração de `enriched`.

## Validação pós-fix

1. Abrir `/admin/conexoes`.
2. Card "Catálogo Promobrind" deve mostrar:
   - Status: **Ativo** (badge verde)
   - URL do projeto: `••••••••e.co` (40 chars)
   - Anon Key: `••••••••QvPc` (208 chars)
   - Service Role Key: `••••••••68N8` (219 chars)
3. Card "CRM Promobrind" deve mostrar os 3 campos `EXTERNAL_CRM_*` preenchidos.
4. Botão "Testar conexão" deve ficar habilitado.
5. Sem alterações em `external_connections` (essa tabela é só para metadados de teste/histórico, não para credenciais).

## Por que não preencher `external_connections`?

A separação atual é **correta por design**:
- `integration_credentials` = segredos (com RLS admin-only, mascaramento, rotation log)
- `external_connections` = metadados visuais (último teste, latência, status agregado)

Misturar os dois reduziria a segurança. A UI só precisa que o `secrets-manager` volte a funcionar.
