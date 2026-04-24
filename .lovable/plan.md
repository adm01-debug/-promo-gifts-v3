

# Validar RPCs de gravação e ajustar parse

## Objetivo

Garantir que os dois RPCs centrais do fluxo de personalização — `fn_get_customization_price` e `fn_get_product_customization_options` — retornam os campos que o front espera. Onde houver divergência, ajustar o parse via adapters (sem tocar consumidores).

## Estratégia

Reaproveitar a infraestrutura já existente:
- **Adapters** (`src/lib/personalization/adapters/`) já cuidam de aliases PT ↔ EN.
- **Telemetria** (`window.__personalizationSchemaStats`) já contabiliza schema detectado e campos legados vistos.
- **Edge function** `external-db-bridge` é a porta de entrada das RPCs.

Adicionar uma **camada de validação real** que compara payload vs. contrato, registra desvios e exibe na página `/admin/external-db`.

## Passos

### 1. Definir contratos esperados (TS puro, sem Zod por ora)

Arquivo novo: `src/lib/personalization/rpc-contracts.ts`

Para cada RPC, declarar:
- `requiredFields: string[]` — campos que o parse depende.
- `optionalFields: string[]` — bônus que se vierem o front usa.
- `aliasMap: Record<string, string[]>` — chave canônica → nomes aceitos (já cobertos pelos adapters).

Contratos:
- `fn_get_customization_price` → flat: `tabela`, `nome_tabela`, `grupo_tecnica`, `quantidade`, `num_cores`, `faixa{...}`, `detalhes{...}`, `markup{...}`, `preco_unitario`, `valor_gravacao`, `setup_total`, `total_cobrado`.
- `fn_get_product_customization_options` → `product_id`, `locations[].{location_code, location_name, location_order, options[]}`; em `options[]`: `technique_id`, `codigo_tabela`, `tecnica_nome`, `grupo_tecnica`, `max_width`, `max_height`, `efetiva_largura_max`, `efetiva_altura_max`, `shape`, `is_curved`, `usa_dimensao`, `cobra_por_cor`, `max_cores`.

### 2. Validador genérico

Arquivo novo: `src/lib/personalization/rpc-validator.ts`

```ts
validateRpcPayload(contract, payload) → {
  ok: boolean;
  missing: string[];   // campos required ausentes (após resolver aliases)
  extras: string[];    // chaves no payload não previstas
  resolvedAliases: Record<string, string>; // canônico → nome efetivamente recebido
}
```

- Aceita payloads aninhados (`faixa.qtd_min`, `locations[].options[].technique_id`).
- Em **dev**: `console.warn` por desvio (deduplicado por contrato).
- Em **prod**: incrementa `window.__personalizationSchemaStats.contractMismatches[contract]++`.
- Nunca lança — só observa.

### 3. Plugar validação nos pontos de entrada (sem alterar consumidores)

- `src/hooks/useCustomizationPrice.ts`: chamar `validateRpcPayload('fn_get_customization_price', result)` antes de devolver.
- `src/hooks/simulator/useLivePricePreview.ts`: idem.
- Adapter `customization-options.adapter.ts`: validar o payload bruto antes do mapeamento.
- Adapter `price-response.adapter.ts`: validar a saída flat após mapeamento (garante que aliases cobriram tudo).

### 4. Estender adapters quando o validador detectar gaps

Após observar a telemetria (no passo 5), para cada `missing` reportado:
- Se for um alias novo (back mudou nome): adicionar ao `aliasMap` do adapter.
- Se for campo realmente removido: marcar como opcional no contrato + nota no `docs/`.
- Se for campo novo no payload (vem em `extras`) que o front quer consumir: subir para `optionalFields` e usar.

Refatorar pontos onde o parse hoje confia em campo que pode vir nulo (ex.: `result.markup` em payloads pré-v6.3): fallback explícito quando ausente.

### 5. Painel de diagnóstico

Estender `src/pages/admin/AdminExternalDbPage.tsx` com nova aba **"Validação RPC"**:
- Tabela com cada RPC, contagem de chamadas, contagem de mismatches, lista dos últimos 5 `missing` e `extras`.
- Botão "Testar agora" que dispara uma chamada real (com payload mínimo conhecido) e roda o validador, exibindo o resultado.
- Lê de `window.__personalizationSchemaStats.contractMismatches` + buffer circular dos últimos desvios.

### 6. Testes

`tests/lib/personalization/rpc-contracts.test.ts`:
- Payloads canônicos (PT atual) → `ok: true`, `missing: []`.
- Payload com aliases EN → `ok: true` (aliases resolvidos).
- Payload com campo obrigatório faltando → `ok: false`, `missing` correto.
- Payload com campo extra → `ok: true`, `extras` populado.
- Payload nested incompleto (`faixa` sem `preco`) → `missing: ['faixa.preco']`.

### 7. Verificação final

- `npx tsc --noEmit` limpo.
- `npx vitest run tests/lib/personalization` passando.
- Em `/admin/external-db` aba nova, disparar uma chamada real do simulador e confirmar `ok: true` para ambos os RPCs.
- Telemetria: `window.__personalizationSchemaStats.contractMismatches` deve permanecer vazio em payloads atuais.

## Arquivos tocados

**Criados (3)**:
- `src/lib/personalization/rpc-contracts.ts`
- `src/lib/personalization/rpc-validator.ts`
- `tests/lib/personalization/rpc-contracts.test.ts`

**Editados (~6)**:
- `src/lib/personalization/adapters/schema-detection.ts` (adiciona balde `contractMismatches` + helper `recordContractMismatch`)
- `src/lib/personalization/adapters/index.ts` (re-export)
- `src/lib/personalization/adapters/customization-options.adapter.ts` (chama validador)
- `src/lib/personalization/adapters/price-response.adapter.ts` (chama validador)
- `src/hooks/useCustomizationPrice.ts` (chama validador)
- `src/hooks/simulator/useLivePricePreview.ts` (chama validador)
- `src/pages/admin/AdminExternalDbPage.tsx` (nova aba)

## Compatibilidade

- **Zero breaking change**: validador só observa; adapters continuam fazendo o mapeamento real.
- Se o back trocar nomes amanhã, a aba "Validação RPC" mostra o desvio antes de qualquer componente quebrar — gatilho proativo para atualizar o `aliasMap`.

