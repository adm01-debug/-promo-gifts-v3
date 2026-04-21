
# Execução completa da suíte Onda 5

A Onda 5 já passou nas execuções anteriores (10/10 verdes), mas o pedido agora é uma **execução completa formal** cobrindo as 4 camadas — frontend (componentes), strategy, hooks e backend function. Vou rodar tudo e apresentar relatório consolidado.

## O que será executado

### 1. Frontend (vitest)
- `tests/components/magic-up-onda5.test.tsx` — `MagicUpQualityScore`, `MagicUpQualityChecklist`, `MagicUpCurationStatus`, `MagicUpVariationComparator`
- `tests/components/magic-up-strategy-onda5.test.ts` — `buildMagicScore`, `buildQualityDiagnosis`, `CURATION_STATUSES`
- `tests/hooks/useMagicUpGeneration-onda5.test.tsx` — fluxos de geração, fallback heurístico, reanálise, curadoria, vencedora
- `tests/components/pages/MagicUp.test.tsx` — smoke test de regressão da página

Comando: `npx vitest run tests/components/magic-up-onda5.test.tsx tests/components/magic-up-strategy-onda5.test.ts tests/hooks/useMagicUpGeneration-onda5.test.tsx tests/components/pages/MagicUp.test.tsx --reporter=verbose`

### 2. Backend function `magic-up-score` (curl real)
Validação ao vivo via `supabase--curl_edge_functions`:

| Cenário | Método | Esperado |
|---|---|---|
| Pré-flight CORS | `OPTIONS` | 200/204 + headers CORS |
| Sem auth | `POST` (sem token) | 401 |
| Body vazio | `POST {}` | 400 + detalhes Zod |
| `imageUrl` curto | `POST { imageUrl: "x" }` | 400 |
| Payload válido | `POST` completo | 200 com `source: "ai"` ou erro controlado |

### 3. Logs da function
Após os curls, leitura de `magic-up-score` via `supabase--edge_function_logs` para confirmar autenticação, validação Zod e tracking de IA.

## Entregável

Relatório consolidado contendo:
- Total de testes frontend (passados / falhados / duração)
- Resultado de cada cenário curl da edge function
- Confirmação dos logs (auth, Zod, AI tracking)
- Status final da Onda 5: **aprovado**, **aprovado com ressalvas** ou **bloqueado**
- Lista de bugs encontrados (se houver) e correções recomendadas

Sem alterações de código nesta rodada — apenas execução e relatório. Caso algum teste falhe, identifico o arquivo afetado e proponho a correção numa próxima rodada.
