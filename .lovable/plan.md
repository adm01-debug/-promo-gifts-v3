

## Bateria de testes para todos os hooks

### Escopo
Existem ~190 hooks em `src/hooks/` e ~55 já têm testes. Faltam ~135 hooks sem cobertura. Testar todos com profundidade levaria dezenas de horas e milhares de LOC. A proposta é uma **bateria pragmática em ondas**, priorizada por risco e impacto, com smoke tests universais + testes profundos nos hooks críticos.

### Estratégia em 3 camadas

**Camada 1 — Smoke tests universais (todos os ~135 hooks sem cobertura)**
Para cada hook, um teste mínimo que:
- Importa o hook (garante que não há erro de parsing/circular import)
- Renderiza com `renderHook` + providers padrão (QueryClient, Router, Auth mock)
- Verifica que retorna sem crash e a forma do retorno é estável (object/function/array)
- Cobre o caso de input nulo/undefined quando aplicável

Output: ~135 arquivos `tests/hooks/<nome>.smoke.test.ts` curtos (~20 LOC cada).

**Camada 2 — Testes funcionais nos hooks críticos (~25 hooks)**
Cobertura profunda de fluxos, estados e erros para os hooks de maior risco:

- **Auth/Segurança:** `useRBAC`, `use2FA`, `useAccessSecurity`, `useAllowedIPs`, `useIPValidation`, `useLoginRateLimit`, `useWebAuthn`, `usePasswordBreachCheck`
- **Orçamentos:** `useQuotes`, `useQuoteBuilderState`, `useQuoteApproval`, `useQuoteApprovalToken`, `useDiscountApproval`, `useSellerDiscountLimits`
- **Catálogo/Produtos:** `useCatalogFiltering`, `useCatalogState`, `useProducts`, `useProductsLightweight`, `useDebouncedFilters`, `useUrlState`
- **Comparador:** `useComparisonScore`, `useComparisonSync`, `useComparisonWeights`
- **Kit Maker:** `useKitBuilder`, `useKitAutoSave`, `useKitUndoRedo`, `useKitStockValidation`
- **Conexões/Secrets:** `useSecretsManager` (já parcial), `useConnectionTester`, `useConsecutiveFailures`, `useRetestCooldownSetting`

Cada teste cobre: estado inicial, transições, edge cases, erros de API mockados, side effects (toasts, localStorage).

**Camada 3 — Helpers e infra de teste**
- Estender `tests/components/render-helpers.tsx` com `renderHookWithProviders()` reutilizável
- Criar `tests/hooks/_helpers/mock-supabase-builder.ts` com builder fluente para mocks de queries
- Criar `tests/hooks/_helpers/smoke-template.ts` (gerador de smoke tests parametrizado)

### Execução em ondas

| Onda | Conteúdo | Arquivos | Tempo estimado |
|------|----------|----------|----------------|
| 1 | Helpers de teste + 5 hooks críticos auth/segurança | 6 | curta |
| 2 | 8 hooks de orçamentos/desconto | 8 | média |
| 3 | 7 hooks de catálogo + comparador | 7 | média |
| 4 | 5 hooks de kit + conexões | 5 | média |
| 5 | Smoke tests universais (~135 hooks restantes em batches de 30) | ~135 | longa |

### Detalhes técnicos

- **Padrão:** `vitest` + `@testing-library/react` `renderHook`, mocks via `vi.mock` reaproveitando `tests/components/render-helpers.tsx`.
- **Mock Supabase:** usar o mock global já existente; estender com builder para `from().select().eq()...` em cadeia.
- **TanStack Query:** envolver com `QueryClientProvider` (retry off, gcTime 0).
- **Hooks com Realtime:** mockar `supabase.channel` e validar `subscribe`/`removeChannel`.
- **Cobertura alvo:** smoke ≥70% dos hooks; funcional 100% dos críticos listados.
- **Comando:** `npm test -- tests/hooks` — falhas vão acompanhadas de fix imediato (ajuste de mock ou correção real do hook se for bug).
- **Política:** preferência do usuário é execução autônoma sequencial. Vou executar onda por onda sem pausar para perguntas; ao final de cada onda faço um resumo curto e sigo direto para a próxima.

### Fora de escopo (intencional)
- Testes E2E (Playwright) — separados, não cabem nesta bateria
- Snapshot tests visuais
- Refatoração funcional de hooks (só corrijo se um teste expor bug)
- Hooks já cobertos (~55) — não duplico, no máximo complemento se identificar gap óbvio

### Entregáveis
- ~135 smoke tests novos
- ~25 test files funcionais profundos
- 3 helpers reutilizáveis
- Documentação curta em `docs/TESTING.md` sobre o padrão `renderHookWithProviders`

### Começar por
Onda 1 (helpers + auth/segurança crítica). Após aprovação, executo até concluir todas as 5 ondas sem interrupção.

