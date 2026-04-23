

# Adaptar hooks e types ao novo schema de gravação

## Contexto

A camada de adapters (`src/lib/personalization/adapters/`) já isola componentes de mudanças no payload. Falta agora alinhar os **leitores diretos** (hooks que fazem `select` cru) e os **types canônicos** (`gravacao-database.ts`, `gravacao-types.ts`) com a estrutura nova devolvida pelas edge functions / RPCs de preço (`fn_get_customization_price`, `fn_get_product_customization_options`, `external-db-bridge`).

Como o snapshot do schema real ainda não foi colado, este ciclo trabalha com as renomeações **já mapeadas** nos adapters (PT antigo → canônico) e prepara a base para acomodar novas colunas sem reescrita.

## O que será feito

### 1. Tornar os types canônicos "tolerantes"

Arquivos:
- `src/types/gravacao-database.ts`
- `src/hooks/gravacao/gravacao-types.ts`
- `src/components/admin/products/sections/engraving/types.ts`

Ações por interface (`TabelaPrecoOficial`, `FaixaPrecoOficial`, `TecnicaGravacao`, `PrintAreaTechnique`, `TecnicaGravacaoVariante`):

- Adicionar **aliases novos** como campos opcionais (ex.: `code?: string` ao lado de `codigo`, `setup_price?: number` ao lado de `custo_setup`, `handling_price?: number`, `max_colors?: number`, `charges_per_color?: boolean`, `price_by_area?: boolean`).
- Marcar campos **legados** com `/** @deprecated use <novo> */` mas mantê-los opcionais.
- Promover campos hoje obrigatórios que podem sumir para opcionais (`tipo_setup`, `quantidade_corte`, `validade_inicio/fim`).
- Garantir que `Database` (em `gravacao-database.ts`) reflita os campos opcionais nos `Insert/Update`.

### 2. Criar adapter de "row" para tabelas raw

Arquivo novo: `src/lib/personalization/adapters/raw-row.adapter.ts`

Funções:
- `adaptTecnicaRow(row)` → preenche tanto `codigo` quanto `code`, `custo_setup` quanto `setup_price` (espelhando os dois lados durante o ciclo de transição).
- `adaptTabelaPrecoRow(row)` → idem para `tabela_preco_gravacao_oficial`.
- `adaptFaixaPrecoRow(row)` → idem para faixas (`quantidade_minima` ↔ `min_quantity`, `preco_unitario` ↔ `unit_price`).
- `adaptPrintAreaTechniqueRow(row)` → consolida com o já existente `print-area.adapter.ts`.

Cada função usa o helper de schema-detection já existente para incrementar `window.__personalizationSchemaStats` quando detecta nome legado, mantendo telemetria.

Exportar tudo via `src/lib/personalization/adapters/index.ts`.

### 3. Refatorar hooks de leitura direta

Arquivos:
- `src/hooks/tecnicas/useTecnicasList.ts` — passa cada row pelo `adaptTecnicaRow`; `select` continua `*` para suportar colunas novas.
- `src/hooks/usePrintAreas.ts` — usa `adaptPrintAreaTechniqueRow` + `adaptTabelaPrecoRow` no join.
- `src/hooks/useMockupGenerator.ts` — usa `adaptTecnicaRow` e `adaptPrintAreaTechniqueRow`.
- `src/lib/fetch-print-areas.ts` — encaminha rows para `adaptPrintAreaRow` (já existe) e usa novo helper para tabelas/técnicas embutidas.
- `src/components/admin/techniques-manager/TechniqueTable.tsx` (e `useTechniquesData.ts`, se houver) — leitura via `adaptTecnicaRow`; mutations passam a aceitar **ambos** os nomes (`codigo` E `code`) no payload de update enquanto o back não decide. Helper `buildTecnicaUpdatePayload(partial)` centraliza isso.
- `src/components/products/customization/ConfigurationPanel.tsx` — onde lê linhas brutas, encaminhar via adapter (a maior parte já passa por `adaptCustomizationOptions`).

### 4. Centralizar telemetria de campos legados

Estender `src/lib/personalization/adapters/schema-detection.ts`:
- Novo balde `legacyFieldsSeen: Record<string, number>` exposto em `window.__personalizationSchemaStats.legacyFieldsSeen`.
- Helper `recordLegacyField(name)` chamado pelos novos `adaptXxxRow`.
- Aviso único por sessão (via `warnUnknownSchemaOnce` reutilizado com nova chave).

### 5. Tipo utilitário compartilhado

Arquivo novo: `src/lib/personalization/adapters/raw-row.types.ts`
- `TecnicaGravacaoCanonical`, `TabelaPrecoCanonical`, `FaixaPrecoCanonical`, `PrintAreaTechniqueCanonical` — versões "saída do adapter" com **ambos** os nomes preenchidos, evitando refator imediato dos consumidores.
- Re-exportados pelo `index.ts` da pasta `adapters/`.

### 6. Testes

Arquivos novos em `tests/lib/personalization/adapters/`:
- `raw-row.adapter.test.ts` — fixtures com payload **PT antigo**, **EN novo** e **híbrido**; verifica que `code === codigo`, `setup_price === custo_setup`, etc.
- `tecnicas-list.adapter.test.ts` — garante que array de rows passa por `adaptTecnicaRow` sem perder campos.
- Atualizar `price-response.adapter.test.ts` se algum campo cruzar com os novos aliases.

### 7. Verificação

- `npx tsc --noEmit` limpo (campos opcionais evitam quebra).
- `npx vitest run tests/lib/personalization` passando.
- Smoke manual: `/admin/tecnicas`, `/admin/produtos/:id` (aba Gravação), `/admin/external-db`, simulador wizard, mockup config.
- Em dev: `window.__personalizationSchemaStats.legacyFieldsSeen` mostra contagem dos nomes legados detectados — base para o próximo ciclo decidir o que remover.

## Arquivos tocados

**Criados (3)**:
- `src/lib/personalization/adapters/raw-row.adapter.ts`
- `src/lib/personalization/adapters/raw-row.types.ts`
- `tests/lib/personalization/adapters/raw-row.adapter.test.ts`

**Editados (~10)**:
- `src/lib/personalization/adapters/index.ts`
- `src/lib/personalization/adapters/schema-detection.ts`
- `src/types/gravacao-database.ts`
- `src/hooks/gravacao/gravacao-types.ts`
- `src/components/admin/products/sections/engraving/types.ts`
- `src/hooks/tecnicas/useTecnicasList.ts`
- `src/hooks/usePrintAreas.ts`
- `src/hooks/useMockupGenerator.ts`
- `src/lib/fetch-print-areas.ts`
- `src/components/admin/techniques-manager/TechniqueTable.tsx` (+ `useTechniquesData.ts` se existir)

## Compatibilidade

- **Zero breaking change**: campos legados continuam preenchidos pelos adapters, então consumidores não tocados seguem funcionando.
- Componentes podem migrar gradualmente para os nomes canônicos novos.
- Telemetria mostra quando o back parou de devolver os nomes antigos — gatilho para limpar deprecations no ciclo seguinte.

