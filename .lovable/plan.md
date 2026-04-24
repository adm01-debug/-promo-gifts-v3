

# Aviso visual de fallback de cálculo no simulador

Hoje, quando o RPC `fn_get_customization_price` falha, o simulador já cai no `buildLegacyFallbackOption` e dispara um `toast.warning` em `useSimulation`. Mas o aviso é efêmero: assim que o toast some, o vendedor não tem como saber que aquele preço é estimado. Esta tarefa torna o aviso **persistente e visível** no card de cada opção que veio do fallback, e mostra a data/hora do último cálculo bem-sucedido vs. estimado.

## 1. Enriquecer o tipo `SimulationOption`

Arquivo: `src/types/domain/simulation.ts`

- Já existem `priceSource` e `fallbackReason`. Adicionar:
  - `calculatedAt: string` (ISO, sempre preenchido — momento em que o resultado foi gerado).
  - `rpcAvailable: boolean` (false quando o RPC falhou e o fallback foi usado).

## 2. Preencher os novos campos no fetcher

Arquivo: `src/hooks/simulation/simulationPriceFetcher.ts`

- `fetchOptionForTechnique`: preencher `calculatedAt: new Date().toISOString()` e `rpcAvailable: true` no caminho de sucesso.
- `buildLegacyFallbackOption`: preencher `calculatedAt: new Date().toISOString()` e `rpcAvailable: false`.

## 3. Novo componente `SimulationPriceSourceBadge`

Novo arquivo: `src/components/simulation/SimulationPriceSourceBadge.tsx`

- Props: `priceSource`, `fallbackReason`, `calculatedAt`.
- Quando `priceSource === 'rpc'` (oficial):
  - Pílula sutil verde: `✓ Cálculo oficial · atualizado às HH:mm`.
- Quando `priceSource === 'legacy-fallback'`:
  - Bloco âmbar destacado (mesmo padrão visual do `PriceFreshnessBadge variant="pdp"` para `stale`):
    - Linha 1 (negrito): "Estimativa — cálculo oficial indisponível"
    - Linha 2: "Calculado às HH:mm de DD/MM/AAAA"
    - Linha 3 (sutil): motivo (`fallbackReason`) + "Confirme o valor antes de fechar o orçamento"
  - Cores: `amber-100` / `amber-300` / `amber-900` (claro) e `amber-500/15` / `amber-500/60` / `amber-200` (dark), ícone `AlertTriangle`.
- A11y: `role="status"`, tooltip Radix com texto longo, classes via `cn()`.

## 4. Renderizar o badge no card de opção do simulador

Investigar e atualizar o(s) componente(s) que renderizam cada `SimulationOption` (provavelmente `src/components/simulation/SimulationOptionCard.tsx` ou similar dentro de `src/components/simulation/`). O badge fica logo abaixo do preço final da opção, antes do breakdown por área/técnica/tamanho.

Quando `priceSource === 'rpc'`, exibir versão compacta (verde discreto). Quando `legacy-fallback`, exibir bloco âmbar completo, garantindo que o vendedor não perca a informação.

## 5. Suavizar o toast de fallback

Arquivo: `src/hooks/useSimulation.ts`

- Manter o `toast.warning` mas reduzir para um único disparo por sessão de simulação (evitar spam quando várias opções caem no fallback). O badge persistente no card passa a ser a fonte de verdade visual; o toast vira só um sinal inicial.

## 6. Testes

- `tests/components/SimulationPriceSourceBadge.test.tsx` (novo): cobre os 2 estados (rpc / legacy-fallback) — formatação de data/hora, classes amber/emerald, presença de `role="status"` e do motivo.
- `tests/hooks/simulation/simulationPriceFetcher.test.ts` (estender, se existir; senão criar): garantir que `calculatedAt` e `rpcAvailable` estão preenchidos corretamente em sucesso e em falha do RPC.

## Arquivos tocados

**Criados (2)**:
- `src/components/simulation/SimulationPriceSourceBadge.tsx`
- `tests/components/SimulationPriceSourceBadge.test.tsx`

**Editados (4)**:
- `src/types/domain/simulation.ts` (2 campos novos)
- `src/hooks/simulation/simulationPriceFetcher.ts` (preencher os campos)
- `src/hooks/useSimulation.ts` (toast 1x por sessão)
- 1 componente de card de opção do simulador (a confirmar nome exato em `src/components/simulation/`)

**Estendido (1, opcional se existir)**:
- `tests/hooks/simulation/simulationPriceFetcher.test.ts`

## Compatibilidade

- Zero breaking change: `calculatedAt` e `rpcAvailable` são novos campos opcionais; consumidores existentes que ignoram metadados continuam funcionando.
- Reusa o vocabulário visual já estabelecido pelo `PriceFreshnessBadge` (amber/emerald + pílula + ícone), mantendo coerência com o padrão de "preço pode estar defasado".
- Não muda a lógica de cálculo nem o fallback — só torna o estado visível.

