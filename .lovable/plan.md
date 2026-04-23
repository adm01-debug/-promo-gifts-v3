# Atualizar front para o novo schema de Gravação / Técnicas / Tamanhos

## Objetivo
Refletir no front as mudanças nas tabelas externas:
- `tabela_preco_gravacao_oficial` (técnicas)
- `tabela_preco_gravacao_oficial_faixa` (faixas de tamanho/preço)
- `print_area_techniques` (áreas por produto)
- RPCs `fn_get_product_customization_options` e `fn_get_customization_price`

Como ainda não temos clareza do que mudou (renomeações, colunas novas, RPCs alteradas, compatibilidade), o plano tem **2 fases**: inspeção via edge function temporária → migração dirigida pelo diff real.

---

## Fase 1 — Inspeção do schema atual (1 edge function descartável)

### 1.1. Criar edge function `gravacao-schema-inspector` (temporária, admin-only)
- Auth obrigatória + verificação de papel admin (`has_role`).
- Para cada tabela alvo, retornar:
  - Lista de colunas via `information_schema.columns` (nome, tipo, nullable, default).
  - 1 linha de amostra (`SELECT * LIMIT 1`).
- Para cada RPC alvo (`fn_get_product_customization_options`, `fn_get_customization_price`), retornar:
  - Assinatura via `pg_proc` / `information_schema.routines`.
  - 1 chamada de smoke com um `product_id` fornecido no body (sem efeitos colaterais — são RPCs read-only).
- Conexão: usar o mesmo banco externo Promobrind que o `external-db-bridge` já usa (ler client do segredo existente; não duplicar credencial).
- CORS inline + Zod no body.

### 1.2. Página admin descartável `/admin/diagnostico-gravacao`
- Form com input opcional `productId` (default = produto de teste).
- Botão "Inspecionar schema" → chama a function e renderiza JSON colapsável + tabela "campo antigo no front × campo no DB" para os tipos em `src/types/gravacao*.ts`.
- Botão "Copiar diff para Lovable" → copia um relatório markdown.

### 1.3. Gerar relatório `docs/gravacao-schema-diff.md`
A partir do JSON da inspeção, registrar para cada tabela/RPC:
- Colunas removidas (referências quebradas no front).
- Colunas renomeadas (mapa antigo → novo).
- Colunas novas (oportunidades para UI).
- Mudanças de tipo (string→numeric, etc.).
- Diff dos campos retornados pelas RPCs.

---

## Fase 2 — Migração do front (dirigida pelo diff)

### 2.1. Tipos (Single Source of Truth)
Atualizar para refletir o schema real:
- `src/types/gravacao-database.ts` — `TabelaPrecoOficial`, `FaixaPrecoOficial`, `TecnicaFaixaArea/Pontos`, `HotStampingFitaOpcao`, `LaserAcabamentoOpcao`, `TecnicaTipoFilme`, `TecnicaGravacaoVariante`, `FornecedorGravacao`.
- `src/types/gravacao.ts` — `TecnicaGravacao`, `AreaShape`.
- `src/types/customization.ts` — payloads das RPCs.
- `src/hooks/gravacao/gravacao-types.ts` — `TabelaPrecoOficial`, `FaixaPrecoOficial`, `CustomizationPriceV2`, `PrintAreaWithTechniques`.
- `src/types/domain/simulator-wizard.ts` — `AvailableTechnique`, `EngravingPriceCalculation`.
- `src/components/admin/products/sections/engraving/types.ts` — `ExternalTechnique`, `PrintAreaTechnique`, `EnrichedArea`.
- `src/components/pricing/simulator/types.ts` — `ProductTechnique`, `SizeOption`.
- `src/lib/fetch-print-areas.ts` — `PrintAreaFromProduct`.

Regras: usar `import type`, sem `any`, manter aliases legados só onde reduzir blast radius (marcados `@deprecated`).

### 2.2. Queries do `external-db-bridge`
- `src/hooks/tecnicas/useTecnicasList.ts` — atualizar `select`, mapeamento legacy e filtros de `tecnica_gravacao`/`tabela_preco_gravacao_oficial`.
- `src/hooks/useMockupGenerator.ts` — atualizar a busca de catálogo de técnicas (linha ~228).
- `src/lib/fetch-print-areas.ts` — atualizar lookup de técnica por id e mapeamento para `PrintAreaFromProduct` (incluir colunas novas relevantes — ex.: `serv_code`, `area_cm2`, etc., se mudaram).
- `src/components/admin/products/sections/engraving/useEngravingWizard.ts` — atualizar CRUD de `print_area_techniques` (insert/update/delete payloads) e select de `tecnica_gravacao`.
- `src/components/products/customization/ConfigurationPanel.tsx` — atualizar select de `tabela_preco_gravacao_oficial_faixa` (campos `largura_min/max`, `altura_min/max` e quaisquer renomeações).

### 2.3. Hooks de RPC
- `src/hooks/useCustomizationPrice.ts` — atualizar `CalculatePriceParamsV6` e `CustomizationPriceResponseV6` para refletir o novo retorno de `fn_get_customization_price` (campos podem ter sido removidos/renomeados como `tier_*`, `cost_*`, `subtotal_pecas`).
- `src/hooks/useProductCustomizationOptions.ts` + `src/hooks/simulator/useSimulatorWizard.ts` — atualizar `CustomizationOptionsResponse` e o mapper `mapV6LocationsToWizard` para o novo shape de `fn_get_product_customization_options`.
- `src/components/simulator/wizard/QuantityRangeComparison.tsx` — alinhar com o novo retorno do RPC.

### 2.4. Allowlist do bridge
`supabase/functions/_shared/external-db-config.ts`:
- Garantir que tabelas/colunas/RPCs novas estejam liberadas.
- Remover entradas obsoletas do allowlist (`tecnicas_gravacao` se virou view, etc.).
- Atualizar `ALLOWED_RPCS` se houver nova versão (ex.: `fn_get_customization_price_v7`).

### 2.5. UI que consome os dados
Para cada componente abaixo, conferir labels/colunas exibidas vs. campos novos:
- `src/components/products/customization/ConfigurationPanel.tsx` (seleção de técnica + tamanho + cores).
- `src/components/products/customization/TechniqueCard.tsx`.
- `src/components/admin/products/sections/engraving/*` (wizard, lista de áreas, detalhes).
- `src/components/simulator/wizard/*` + `src/components/pricing/simulator/*`.
- `src/hooks/useMockupGenerator.ts` + `src/components/mockup/*` (lista de técnicas no mockup, prompts).

### 2.6. Testes (smoke + funcional)
- Adicionar/atualizar smoke tests dos hooks afetados em `tests/hooks/`:
  - `useTecnicasList`, `useCustomizationPrice`, `useProductCustomizationOptions`, `useEngravingWizard`, `useMockupGenerator` (já existe), `useSimulatorWizard`.
- Mock do `external-db-bridge` retornando o novo shape (capturado da inspeção).
- Rodar `npx vitest run tests/hooks/` e `npx tsc --noEmit` para garantir tipagem.

### 2.7. Limpeza
- Apagar a edge function `gravacao-schema-inspector` e a página `/admin/diagnostico-gravacao`.
- Atualizar memória (`mem://features/...`) com o novo shape canônico.

---

## Fora de escopo
- Mudanças no banco externo (é só consumo).
- Refatoração visual das telas (segue o protocolo `mem://constraints/ui-redesign-protocol`).
- Migrar o `useGravacaoPriceV2` (já marcado como legado e não usa mais `tecnica_variante_id`).

---

## Critério de aceite
- `npx tsc --noEmit` zero erros em todos os arquivos listados em 2.1–2.5.
- Smoke tests dos hooks de gravação verdes.
- Telas Configurar Personalização, Wizard de Gravação (admin), Simulador e Mockup carregam sem erros de console e exibem técnicas + tamanhos + preços corretos.
- `docs/gravacao-schema-diff.md` commitado como referência da migração.
- Edge function de inspeção e rota admin temporária removidas.
