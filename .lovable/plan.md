

# Plano — Validar suíte de testes do `MagicUpVariationComparator` no CI

Executo a suíte de testes completa do componente para confirmar que todos os 67 testes passam sem falhas, replicando exatamente o ambiente do CI (`npm run test`).

## Escopo da execução

1. **Rodar suíte focada em Magic Up:**
   ```bash
   npx vitest run tests/components/magic-up-onda5.test.tsx tests/components/magic-up-strategy-onda5.test.ts tests/a11y/onda5-a11y.test.tsx --reporter=verbose
   ```

2. **Rodar suíte completa (paridade com CI):**
   ```bash
   npm run test
   ```

3. **Rodar lint + typecheck (paridade com `.github/workflows/ci.yml`):**
   ```bash
   npx eslint . --max-warnings=500
   npx tsc --noEmit
   ```

## Critérios de aceitação

- ✅ 67/67 testes passam em `magic-up-onda5.test.tsx`
- ✅ Suíte completa (`npm run test`) sem falhas
- ✅ ESLint sem erros novos
- ✅ TypeScript sem erros de tipo
- ✅ Cobertura mantida ≥60% (threshold do `vitest.config.ts`)

## Diagnóstico em caso de falha

Se algum teste falhar:
1. Capturar mensagem completa de erro + stack trace
2. Identificar regressão (lógica vs assertiva)
3. Apresentar plano de correção pontual antes de aplicar fix

## Entregável

- Relatório de execução com contagem total de testes (passed/failed/skipped)
- Confirmação explícita de paridade com CI workflow
- Próxima ação: nenhuma se tudo verde; plano de correção se houver falha

