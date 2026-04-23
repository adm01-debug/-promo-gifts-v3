## Objetivo

Trazer o painel de configuração do mockup à paridade com a nova estrutura de gravação (mesma fonte usada pelo simulador novo): exibir corretamente **áreas reais do produto**, **técnicas filtradas com seus limites efetivos**, **variações/tamanhos** e os atributos novos (`max_cores`, `cobra_por_cor`, `usa_dimensao`, `is_curved`, `custo_setup`, `variacao_label`).

A boa notícia: `useMockupTechniques` já consome o RPC oficial `fn_get_product_customization_options` e já recebe os campos novos. O gap é **na UI** — vários campos chegam do RPC e nunca são mostrados, e o `MultiAreaManager`/`AreaCard` não refletem os limites/atributos da área ativa.

## O que muda

### 1. `useMockupTechniques.ts` — propagar atributos novos
- Estender `TechniqueWithLimits` com:
  - `maxColors: number | null` (de `option.max_cores`)
  - `chargesPerColor: boolean` (de `option.cobra_por_cor`)
  - `usesDimension: boolean` (de `option.usa_dimensao`)
  - `isCurved: boolean` (de `option.is_curved`)
  - `setupCost: number | null` (de `option.custo_setup`)
  - `variationLabel: string | null` (de `option.variacao_label`)
  - `groupCode: string | null` (de `option.grupo_tecnica`)
  - `shape: string | null` (de `option.shape`)
- Quando deduplica técnica entre locations, manter os atributos da maior área (já é o que faz hoje, só estender o objeto).
- Quando o produto não tem locations configuradas, manter os campos novos como `null` (degrade limpo).

### 2. `MockupConfigPanel.tsx` — enriquecer o select de técnica
- Estender a interface local `Technique` com os campos novos (re-exportar de `useMockupTechniques`).
- No `SelectItem` de cada técnica: adicionar uma segunda linha pequena com:
  - `variationLabel` (ex.: "Fiber Laser | Plana") quando existir
  - badges compactos: `{maxColors} cor(es)`, `Curvo` se `isCurved`, `Por área` se `usesDimension`
- No item já selecionado, mostrar abaixo do select um `<p className="text-[11px] text-muted-foreground">` com: `Local: {locationName} · Máx {maxWidth}×{maxHeight}cm · {maxColors} cor(es){chargesPerColor ? ' (cobra por cor)' : ''}`.
- Manter o `TechniqueTooltip` (passar os novos campos para ele exibir setup, grupo, etc.).

### 3. `TechniqueTooltip.tsx` — exibir atributos novos
- Adicionar linhas para: Grupo (`groupCode`), Variação (`variationLabel`), Máx cores, Setup (R$ se `setupCost`), Suporta curvo (`isCurved`).

### 4. `MultiAreaManager.tsx` + `AreaCard.tsx` — mostrar limites da área
- Estender `PersonalizationArea` com campos opcionais de metadata da área (vindos do RPC):
  - `maxWidthCm: number | null`
  - `maxHeightCm: number | null`
  - `maxColors: number | null`
  - `isCurved: boolean`
  - `techniquesAvailable: number` (quantas técnicas a área aceita)
- Em `useMockupGenerator`, quando popular `personalizationAreas` a partir de `productLocations`, agregar esses metadados (max_width/height = max entre options da location; techniquesAvailable = `location.options.length`).
- Em `AreaCard`, abaixo do nome da área (quando `isReadOnly`, que é o modo do mockup), mostrar uma linha sutil:  
  `text-[10px] text-muted-foreground` com `{maxWidthCm}×{maxHeightCm}cm · {techniquesAvailable} técnicas` quando disponíveis.
- Em `MultiAreaManager`, no header, quando todas as áreas vierem do produto, mudar a `CardDescription` de _"X locais configurados"_ para _"X áreas oficiais do produto"_ para deixar claro que vem do banco novo.

### 5. `useMockupGenerator.ts` — passar metadata para as áreas
- No `useEffect` que constrói `newAreas` a partir de `productLocations`, computar para cada location:
  - `maxWidthCm = Math.max(...options.map(o => o.efetiva_largura_max || o.max_width))`
  - `maxHeightCm` análogo
  - `maxColors = Math.max(...options.map(o => o.max_cores || 0)) || null`
  - `isCurved = options.some(o => o.is_curved)`
  - `techniquesAvailable = options.length`
- Atualizar `productLocations` derivado para também expor esses campos (precisamos passá-los para o `MultiAreaManager`).
- Expandir clamp em `useEffect` que limita `logoWidth/logoHeight` à técnica para também respeitar o limite da área ativa (usar o menor entre técnica e área).

### 6. Tipos
- Atualizar `MockupDraftData.personalizationAreas` (em `useMockupDraft.ts`) para aceitar (mas não exigir) os novos campos opcionais — backward-compatible com drafts antigos.

## Não escopo (fora desta entrega)

- Não vamos editar o RPC nem o `external-db-bridge` (já trazem os campos certos).
- Não vamos mexer no editor de logo (`LogoPositionEditor`) — a única mudança é o clamp de tamanho citado acima.
- Não vamos adicionar UI nova de "tamanho" como um seletor separado: as áreas oficiais já são o seletor de tamanho (cada area = um max_width×max_height). Se no futuro o backend expor _faixas dimensionais por técnica dentro da mesma área_ (`usa_dimensao=true`), aí sim adicionamos um `SizeSelector` novo. Hoje isso é um vazio nos dados e não há tabela de "tamanho de gravação" separada que a UI precise consumir.

## Validação

- `npx tsc --noEmit` (esperado: sem erros novos; pré-existentes do projeto continuam).
- Smoke manual no preview (`/mockup`):
  - Selecionar produto que tem áreas oficiais → conferir nº de áreas, max W×H em cada card, contador de técnicas.
  - Selecionar produto sem áreas → cair no fallback de "todas as técnicas com dims do tabela_preco_gravacao_oficial_faixa" (já existente).
  - Trocar técnica → ver variação, grupo, max cores no tooltip e na linha abaixo do select.
- Sem novos testes obrigatórios (fluxo é UI-only); manter os existentes em `useMockupGenerator.test.ts` verdes.

## Arquivos tocados

```text
src/hooks/useMockupTechniques.ts          # estender TechniqueWithLimits
src/hooks/useMockupGenerator.ts            # propagar metadata p/ áreas + clamp
src/hooks/useMockupDraft.ts                # tipos opcionais p/ backward-compat
src/components/mockup/MockupConfigPanel.tsx# select enriquecido + linha de detalhe
src/components/mockup/TechniqueTooltip.tsx # exibir grupo/variação/setup/cores
src/components/mockup/MultiAreaManager.tsx # propagar metadata, copy do header
src/components/mockup/AreaCard.tsx         # linha de limites quando isReadOnly
```
