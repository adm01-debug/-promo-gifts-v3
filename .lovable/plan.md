# Diagnóstico Completo — Relatório Priorizado

Execução concluída em paralelo: `tsc`, `eslint`, `vitest`, 5 checkers customizados, typecheck de edge functions. Linter Supabase e security scan ficam para a execução em modo build (exigem tools deferidas com aprovação).

## Resumo executivo

| Camada | Status | Métrica |
|---|---|---|
| TypeScript (`tsc --noEmit`) | ✅ Passou | 0 erros |
| Checkers customizados (4) | ✅ Passou | asChild (1012), route-error, seller-scope, route-ref |
| Vitest | 🔴 Falhou | **17 arquivos / 53 testes falhando** (270/4848 ok) |
| Edge functions typecheck | 🔴 Falhou | **19/83 funções com erros TS** |
| ESLint | 🟡 Débito | **1818 erros + 507 warnings** (muitos parsing errors em E2E/scripts) |
| Linter Supabase | ⏸️ Pendente | requer tool deferida |
| Security scan | ⏸️ Pendente | requer tool deferida |

## P0 — Bloqueadores de produção

### 1. `OptimizationQueuePanel.tsx:196` — RangeError: Invalid time value
`formatDistanceToNow(new Date(it.updated_at))` quebra quando `updated_at` é null/inválido. Causa **uncaught exception** repetida no AdminTelemetriaPage e derruba múltiplos cenários do dia-a-dia (fila de otimização vazia, item recém-criado sem timestamp, dados legados).
**Fix:** guard `it.updated_at ? new Date(it.updated_at) : null` + fallback "—".

### 2. 19 edge functions com erros de typecheck
Padrão recorrente: `'error' is of type 'unknown'` em catches (ex: `send-transactional-email:197`). Risco real: deploy pode falhar e respostas de erro vazam `undefined`.
**Fix:** `error instanceof Error ? error.message : String(error)` em todos os catches afetados. Lista completa via `node scripts/typecheck-edge-functions.mjs`.

### 3. 53 testes falhando em 17 arquivos
Além do Telemetria, há regressões pendentes das ondas anteriores (MagicUp sem `AriaLiveProvider`, TechniqueCard timeout, MockupHistoryPanel). Precisa varredura completa do output para enumerar todos.

## P1 — Alta prioridade

### 4. ESLint com parsing errors em E2E e scripts
Arquivos `.ts` em `e2e/`, `scripts/`, `tests/` não estão cobertos pelo parser TS do `eslint.config.js` → ~290 `no-undef` falsos + parsing errors mascaram problemas reais. **Fix:** estender `parserOptions.project` ou adicionar override para esses globs.

### 5. Top regras violadas (técnico, não bloqueia)
- 513 `@typescript-eslint/no-unused-vars`
- 293 `@typescript-eslint/no-non-null-assertion`
- 257 `@typescript-eslint/no-explicit-any`
- 147 `react-hooks/exhaustive-deps` ⚠️ (pode causar bugs sutis de stale closure)

## P2 — Pendente de execução (requer modo build)

### 6. Linter Supabase (`supabase--linter`)
Verifica RLS desabilitado, policies permissivas, índices ausentes em FKs. Não rodado nesta passagem.

### 7. Security scan (`security--run_security_scan`)
Detecção de exposição de dados, RLS faltante, misconfigs.

### 8. Dependency/CVE scan
`npm audit --production` + cross-check com lockfile.

## Plano de execução pós-aprovação

Após aprovar este plano, em modo build vou:

1. **Onda P0** — corrigir `OptimizationQueuePanel` + as 19 edge functions (loop nos catches) + enumerar e corrigir os 53 testes em batches por arquivo. Revalidar com `vitest run` e `typecheck-edge-functions.mjs` até verde.
2. **Onda P1** — ajustar `eslint.config.js` para cobrir e2e/scripts/tests, rodar `eslint --fix`, atacar manualmente `exhaustive-deps` (real risco de bug) deixando `any`/`non-null-assertion`/`unused-vars` como débito mensurado.
3. **Onda P2** — executar `supabase--linter` + `security--run_security_scan` + `npm audit`, abrir findings priorizados e remediar críticos.

Entrego ao final um relatório final com diff de severidade (antes/depois) e gate verde para produção.
