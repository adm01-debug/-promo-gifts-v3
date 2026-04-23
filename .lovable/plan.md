
## Objetivo

Atualizar os hooks do simulador legado para que o cálculo de preço use a **nova estrutura oficial** (RPC `fn_get_customization_price`, que já consome `tabela_preco_gravacao_oficial`, `tabela_preco_gravacao_oficial_faixa` e `print_area_techniques`), eliminando as fórmulas heurísticas hardcoded que hoje vivem em `simulationCalculator.ts`.

Resultado esperado: o simulador antigo (`/personalization-simulator` e a tela `useSimulation`) passa a devolver o **mesmo número** que o wizard novo e que o ConfigurationPanel — uma única fonte de verdade para preço de gravação.

## Diagnóstico atual

| Caminho | Usa RPC oficial? | Status com nova estrutura |
|---|---|---|
| `useSimulatorWizard` + `useLivePricePreview` (wizard novo) | Sim (`fn_get_customization_price`) | OK |
| `ConfigurationPanel` (página de produto) | Sim | OK |
| `QuantityRangeComparison` | Sim | OK |
| **`useSimulation` + `simulationCalculator`** (legado) | **Não** — fórmulas no front por `code.includes('SILK'\|'DTF'\|...)` | **Quebrado conceitualmente**: ignora faixas, setup por cor, mínimo de faturamento, manuseio etc. |

## Mudanças propostas

### 1. Novo calculador async baseado em RPC

Criar `src/hooks/simulation/simulationPriceFetcher.ts`:

- `fetchOptionForTechnique(technique, settings, quantity, productUnitPrice, idSuffix?)` → chama `fn_get_customization_price` com `p_area_id`, `p_quantidade`, `p_num_cores`, `p_largura_cm`, `p_altura_cm`.
- Mapeia o retorno (via `mapPriceResponseToFlat` já existente em `useGravacaoPriceV2`) para a `SimulationOption` atual, preservando o shape do tipo de domínio.
- `fetchAllOptions(...)` faz `Promise.allSettled` em paralelo e devolve apenas as bem-sucedidas, com `console.warn` para as que falharem.
- Campos derivados continuam no front:
  - `totalProductCost = productUnitPrice * quantity`
  - `grandTotal = totalProductCost + total_price`
  - `grandTotalPerUnit = grandTotal / quantity`
  - `estimatedDays = production_days ?? technique.estimated_days`
  - `setupCost = cost_setup` (vindo do RPC, não mais `technique.setup_cost * positions`)

### 2. Pré-requisito: `area_id` por técnica no simulador legado

Hoje `useSimulation` carrega `personalization_techniques` (lista achatada de técnicas, sem area_id por produto). O RPC exige um `p_area_id` (ID da `print_area_techniques` específica do produto).

Solução: quando há `selectedProduct`, carregar áreas via `fetchProductPrintAreasV2(productId)` (já existe em `useGravacaoPriceV2`) e mapear `selectedTechniques` para os `area_id`s correspondentes pelo `tabela_preco_id` / nome da técnica. Adicionar este resolver em `simulationPriceFetcher.ts`.

Quando o produto não tem print area cadastrada para uma técnica selecionada, devolver a opção marcada como `unavailable` (já existe no domínio do wizard) em vez de calcular com fórmula heurística.

### 3. Refatorar `useSimulation`

- Trocar `calculateAllOptions` (síncrono, heurístico) por `fetchAllOptions` (async, RPC).
- `calculateSimulation` vira `async` e usa `setIsCalculating(true/false)`.
- O `useEffect` de auto-recálculo passa a debouncar 500ms (igual ao `useCustomizationPriceReactive`) e cancela in-flight via `AbortController`/flag de stale, espelhando `useLivePricePreview`.
- Remover dependência de `useMultipleTechniquePricing` e dos helpers `needsColorInput`/`needsSizeInput` baseados em `code.includes(...)` — passar a usar `cobra_por_cor` / `cobra_por_area` retornados pelo RPC e/ou pela `PrintAreaV2`.

### 4. Manter compatibilidade com simulações salvas

`SavedSimulation.simulation_data` já armazena `SimulationOption` com `unitCost`, `setupCost`, etc. Como o shape não muda, simulações antigas continuam abrindo. Adicionar campo opcional `priceSource: 'rpc' | 'legacy-heuristic'` em `SimulationOption` para auditar a origem.

### 5. Deprecar `simulationCalculator.ts`

- Marcar `calculateAllOptions` / `calculateOptionForTechnique` como `@deprecated` com aviso para usar `fetchAllOptions`.
- Manter o arquivo para fallback offline (e para os testes existentes), mas não invocar mais a partir de `useSimulation`.

### 6. `PersonalizationSimulator.tsx` (página standalone)

A página `src/pages/PersonalizationSimulator.tsx` é uma calculadora puramente didática (`total = setupCost + unitCost * area * colors * quantity`), sem ligação com banco. **Não tocar nesta página** — ela é assumidamente uma estimativa rápida, não um cálculo oficial. Apenas adicionar uma nota no rodapé: "Estimativa didática — para preços oficiais use o Simulador (wizard)."

### 7. Testes

- Manter os testes atuais de `simulationCalculator` (cobertura do legado deprecated).
- Adicionar smoke test para `simulationPriceFetcher` com `invokeExternalRpc` mockado retornando shape v5.9 nested + shape flat (ambos cobertos por `mapPriceResponseToFlat`).
- Atualizar `tests/hooks/useSimulation.test.*` (se existir) para mockar o novo fetcher.

## Arquivos afetados

- **Novo**: `src/hooks/simulation/simulationPriceFetcher.ts`
- **Editado**: `src/hooks/useSimulation.ts` (troca de calculador, debounce, async)
- **Editado**: `src/types/domain/simulation.ts` (campo `priceSource?` opcional em `SimulationOption`)
- **Editado**: `src/hooks/simulation/simulationCalculator.ts` (JSDoc `@deprecated`)
- **Editado**: `src/pages/PersonalizationSimulator.tsx` (apenas nota no rodapé)
- **Novo**: `tests/hooks/simulation/simulationPriceFetcher.test.ts` (smoke + funcional)

## Fora do escopo (mas alinhado com plano anterior aprovado)

- Tipos de `tabela_preco_gravacao_oficial` / `_faixa` / `print_area_techniques` em `src/types/gravacao-database.ts` **só serão atualizados depois que você rodar o "Comparar agora"** em `/admin/external-db` e colar o relatório. Esta tarefa **não** depende disso porque o RPC `fn_get_customization_price` é a abstração que isola o front das mudanças de coluna.

## Verificação pós-implementação

1. `npx tsc --noEmit` limpo.
2. Smoke tests dos hooks afetados verdes.
3. Comparar manualmente: para um produto com print area cadastrada, o `useSimulation` (tela velha) e o `useSimulatorWizard` (wizard) devem retornar **o mesmo `total_price`** para os mesmos parâmetros (qtd, cores, dimensões).
4. Confirmar no console que técnicas sem print area aparecem como "indisponível" e não como "R$ 0,00".

## Pergunta para você antes de eu codar

Topa que técnicas selecionadas no simulador legado **sem print area cadastrada para o produto** apareçam como **indisponíveis** (em vez de calcular com a fórmula heurística antiga)? É a única diferença comportamental visível para o usuário final — todo o resto fica igual ou mais preciso.
