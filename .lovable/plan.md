
BI Fase 1 entregue (dados reais via RPC + imagens + badges). Próximo vetor 10/10: **Comparativo "Cliente vs Setor"** — transforma o BI em ferramenta de pitch consultivo, mostrando ao vendedor como o cliente performa frente à média do ramo.

## Sprint — BI Fase 2: Benchmarking Cliente × Setor

### 1. Nova RPC `get_industry_benchmark_stats`
Agrega métricas médias para um conjunto de empresas (mesmo ramo):
- `avg_ltv` (LTV médio por cliente do ramo)
- `avg_ticket` (ticket médio do ramo)
- `avg_orders_per_client` (frequência média)
- `avg_items_per_quote` (tamanho médio do orçamento)
- `top_category` (categoria mais comum)
- `total_clients_sampled` (quantos clientes entraram na média)

Parâmetros: `_company_ids text[]`, `_days int DEFAULT 180`. SECURITY DEFINER, search_path=public, qualquer autenticado.

### 2. Hook `useClientVsIndustry(clientId, ramoAtividade)`
Orquestra:
- `useClientBI(clientId)` → métricas do cliente
- RPC benchmark do setor (resolvendo company IDs via `selectCrm` por ramo, excluindo o próprio cliente)
- Calcula deltas % e classificação ("Acima da média", "Na média", "Abaixo da média") com threshold ±15%

Fallback mock quando ramo vazio ou benchmark vazio.

### 3. Nova Zona 5 — `ClientVsIndustryComparison.tsx`
Card visual com 4 métricas comparadas lado-a-lado:
- LTV: cliente vs média ramo + barra horizontal proporcional + delta % colorido
- Ticket médio: idem
- Frequência (pedidos/ano): idem
- Tamanho do orçamento (itens): idem

Visual: barras horizontais empilhadas com cores semânticas (emerald acima, amber neutro, red abaixo). Legenda discreta "Comparado a N empresas do mesmo ramo · 180 dias".

Inclui um insight textual gerado: ex. "Este cliente compra **35% mais por pedido** que a média do setor — bom alvo para upsell premium." (regras simples baseadas nos deltas).

### 4. Posicionamento na página
Inserir entre Zona 1 (Visão 360°) e Zona 2 (Afinidade). É a "ponte" natural: depois de ver o cliente, ver como ele se compara, depois ver o que oferecer.

### 5. Badges e empty states
- Badge "Dados reais" / "Simulado" coerente com outras zonas.
- Empty state se `companiesInRamo < 3`: "Amostra do ramo ainda insuficiente para comparação" (não exibe card).

### 6. Memória
- Atualizar `mem://features/business-intelligence-module.md` adicionando Zona 5 e nova RPC.

## Arquivos
- **Migration:** RPC `get_industry_benchmark_stats(_company_ids text[], _days int)`.
- **Novo:** `src/hooks/bi/useClientVsIndustry.ts`, `src/components/bi/ClientVsIndustryComparison.tsx`.
- **Editar:** `src/pages/BusinessIntelligencePage.tsx` (inserir Zona 5), `mem://features/business-intelligence-module.md`.
- **Sem mudanças** em hooks/zonas existentes.

## Fora de escopo (próximo sprint)
- Export PDF do dossiê completo (cliente + comparativo + sugestões).
- Editor admin de `INDUSTRY_RECOMMENDATIONS`.
- Heatmap de sazonalidade (compras por mês).
