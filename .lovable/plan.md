

# Atualizar nomes e colunas no front (Técnicas / Áreas / Faixas) com base no schema real

## Contexto

A página `/admin/external-db` já compara o schema esperado pelo front (`engraving-schema-diff.ts`) com o schema real retornado pela edge function `external-db-inspect`. Este plano usa esse diff como **fonte da verdade** para alinhar os tipos TS, hooks e adapters do front com os nomes/colunas que de fato existem no banco hoje.

A camada de adapters criada no ciclo anterior (`src/lib/personalization/adapters/`) **isola** os componentes — então a maior parte da mudança fica concentrada em 3 lugares: tipos canônicos, schema esperado e os adapters/hooks de leitura direta.

## Passos

### 1. Capturar o snapshot real do banco

Rodar o painel de diff em `/admin/external-db` e exportar o markdown para `docs/engraving-schema-snapshot-<data>.md`. Esse arquivo vira referência permanente do schema atual e entrada das próximas etapas. Também salvar a lista bruta de colunas reais por tabela em `src/lib/personalization/contracts/__fixtures__/` (JSON) para alimentar testes.

### 2. Atualizar o **expected schema** do front

Arquivo: `src/pages/admin/engraving-schema-diff.ts`

- Para cada uma das 4 tabelas (`tabela_preco_gravacao_oficial`, `tabela_preco_gravacao_oficial_faixa`, `print_area_techniques`, `tecnica_gravacao`), substituir `expectedColumns` pela lista **real** retornada pela edge function.
- Remover colunas que sumiram (entram em `missingInDb`).
- Adicionar colunas novas que o front passa a consumir (sai de `newInDb` → `expectedColumns`).
- Atualizar `consumers` se algum arquivo deixou de usar.

### 3. Atualizar tipos canônicos do front

Arquivos:
- `src/types/customization.ts`
- `src/types/gravacao-database.ts` (interfaces `TabelaPrecoOficial`, `FaixaPrecoOficial`, `TecnicaGravacao`, `PrintAreaTechnique`)
- `src/hooks/gravacao/gravacao-types.ts` (mesmas interfaces espelhadas)
- `src/components/admin/products/sections/engraving/types.ts`

Para cada coluna renomeada no banco:
- Adicionar o **novo nome** como campo canônico.
- Manter o **nome antigo** como `@deprecated` opcional por 1 ciclo (compatibilidade).
- Para colunas removidas: marcar como `@deprecated`, remover apenas se nenhum consumidor usa.
- Para colunas novas relevantes (ex.: novas flags de precificação, campos de validade): incluir no tipo.

### 4. Estender os adapters para mapear aliases

Arquivos:
- `src/lib/personalization/adapters/customization-options.adapter.ts`
- `src/lib/personalization/adapters/price-response.adapter.ts`
- `src/lib/personalization/adapters/print-area.adapter.ts`

- Ampliar a tabela de aliases (PT antigo → canônico novo) com as renomeações descobertas no diff.
- Garantir que se o banco devolver o nome antigo OU o novo, a saída canônica seja idêntica.
- Adicionar log único por sessão quando um campo legado for detectado (telemetria já existe via `window.__personalizationSchemaStats`).

### 5. Atualizar leitores diretos (sem adapter)

Arquivos que ainda fazem `select` cru e leem colunas:
- `src/hooks/usePrintAreas.ts` (lê `print_area_techniques` e `tabela_preco_gravacao_oficial`)
- `src/hooks/useMockupGenerator.ts`
- `src/hooks/tecnicas/useTecnicasList.ts`
- `src/lib/fetch-print-areas.ts`
- `src/components/admin/techniques-manager/TechniqueTable.tsx`
- `src/components/admin/techniques-manager/useTechniquesData.ts` (se existir o mapeamento `TecnicaRow`)
- `src/components/products/customization/ConfigurationPanel.tsx`

Para cada um:
- Trocar leituras de colunas renomeadas pelo nome novo.
- Quando viável, **rotear via adapter** em vez de ler colunas direto, eliminando dívida de manutenção.
- Atualizar `select: '...'` (quando explícito) para listar as colunas novas.

### 6. Sincronizar contratos Zod (preparação para o próximo ciclo)

Arquivo: o ciclo anterior previa `src/lib/personalization/contracts/`. Caso já exista, ajustar os schemas com as novas colunas e gerar fixtures a partir do JSON salvo no passo 1, garantindo que `safeValidate` continue passando contra o payload real.

### 7. Componentes admin de técnicas

Arquivo: `src/components/admin/techniques-manager/TechniqueTable.tsx` e suas mutations.

- Atualizar payloads de `onUpdate` para usar os nomes novos das colunas (`code`, `setup_price`, `handling_price`, etc., conforme o diff).
- Conferir badges (`precoPorCor`, `precoPorArea`, `precoPorPontos`) se as flags base mudaram de nome.

### 8. Testes

- Atualizar fixtures em `tests/lib/personalization/adapters/*.test.ts` com payloads no schema **novo** (mantendo um teste com payload **antigo** para garantir backward compat).
- Adicionar teste de regressão: rodar o diff `engraving-schema-diff.ts` contra o JSON salvo e exigir `missingInDb.length === 0`.

### 9. Verificação final

- `npx tsc --noEmit`
- `npx vitest run tests/lib/personalization`
- Smoke manual: `/admin/external-db` (sem campos vermelhos), simulador wizard, mockup config panel, admin techniques manager.

## Arquivos tocados (estimativa)

**Editados (~14)**:
- `src/pages/admin/engraving-schema-diff.ts`
- `src/types/customization.ts`
- `src/types/gravacao-database.ts`
- `src/hooks/gravacao/gravacao-types.ts`
- `src/components/admin/products/sections/engraving/types.ts`
- `src/lib/personalization/adapters/{customization-options,price-response,print-area}.adapter.ts`
- `src/hooks/usePrintAreas.ts`
- `src/hooks/useMockupGenerator.ts`
- `src/hooks/tecnicas/useTecnicasList.ts`
- `src/lib/fetch-print-areas.ts`
- `src/components/admin/techniques-manager/TechniqueTable.tsx`
- `src/components/products/customization/ConfigurationPanel.tsx`
- `tests/lib/personalization/adapters/*.test.ts`

**Criados (~3)**:
- `docs/engraving-schema-snapshot-<data>.md`
- `src/lib/personalization/contracts/__fixtures__/{techniques,areas,tiers}.json`
- (se necessário) novo teste `tests/lib/personalization/schema-sync.test.ts`

## Riscos e mitigação

- **Risco**: deprecar coluna antiga e quebrar consumidor esquecido. **Mitigação**: manter `@deprecated` opcional por 1 ciclo + grep por nome antigo antes do merge.
- **Risco**: edge function `external-db-inspect` devolver colunas que o usuário ainda não quer expor no front. **Mitigação**: adicionar somente colunas que o front realmente precisa consumir; as demais ficam como "newInDb" no painel.
- **Risco**: payload real diferir entre ambientes. **Mitigação**: snapshot é versionado em `docs/` por data, e fixtures de teste viram referência única.

