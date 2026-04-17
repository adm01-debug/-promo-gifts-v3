---
name: Business Intelligence Module
description: Módulo /ferramentas/bi com inteligência 360° por cliente. Usa quote_items como proxy de "interesse confirmado" via RPCs get_client_top_products, get_industry_top_products e get_industry_benchmark_stats; fallback mock quando volume insuficiente. Inclui benchmarking Cliente × Setor e exportação de Dossiê PDF (4 páginas).
type: feature
---

# Business Intelligence (Ferramentas → BI)

**Rota:** `/ferramentas/bi` · **Sidebar:** Ferramentas → "Business Intelligence" (ícone Sparkles)

## Arquitetura
- Página: `src/pages/BusinessIntelligencePage.tsx` (header inclui `<ExportDossierButton>` quando cliente selecionado)
- Componentes: `src/components/bi/{ClientSelector, ClientOverview360, ClientVsIndustryComparison, ClientAffinityProducts, IndustryTrendingProducts, EmpiricalRecommendations, BIProductCard, ExportDossierButton}.tsx`
- Hooks: `src/hooks/bi/{useClientBI, useClientVsIndustry, useClientAffinity, useIndustryTrends, useBIDossierExport}.ts`
- Curadoria: `src/lib/bi/industryRecommendations.ts` (mapa empírico ramo→categorias/produtos)
- Mocks: `src/lib/bi/mockData.ts` (fallback quando histórico real está vazio)
- Gerador PDF: `src/lib/bi/dossierPdfGenerator.ts` (função pura `generateBIDossierPDF(data) → Blob`, jspdf + jspdf-autotable, 4 páginas: Capa · Visão 360° · Cliente×Setor · Recomendações)

## 5 Zonas de Inteligência
1. **Visão 360°** — LTV, ticket médio, última compra (badge recência) + timeline 5 últimos pedidos
2. **Cliente × Setor** (Fase 2) — benchmark de 4 métricas (LTV, ticket, frequência, itens/orçamento) contra a média de empresas do mesmo ramo, com classificação ±15%, barras horizontais e insight textual gerado.
3. **Afinidade** — top categorias do cliente + produtos reais sugeridos (com imagem + link `/produto/:id`)
4. **Tendência do setor** — top produtos vendidos para empresas do mesmo ramo (90 dias)
5. **Sugestão do especialista** — curadoria fixa por ramo (Seguros, Farmacêutico, Tech, Construção, Educação, Financeiro)

## Fonte de Dados (Fase 1+2 — entregue)
**Pivô estratégico:** `orders` ainda está vazio. Sistema usa `quote_items` + `quotes` como proxy de "interesse confirmado". Quando `orders` amadurecer, basta apontar as RPCs para `order_items`.

### RPCs ativas (SECURITY DEFINER, search_path=public)
- **`get_client_top_products(_client_id text, _limit int)`** — top produtos orçados pelo cliente. Restrito a vendedor dono / admin / manager.
- **`get_industry_top_products(_company_ids text[], _days int, _limit int)`** — top produtos vendidos para um conjunto de empresas (mesmo ramo). Visível a qualquer autenticado.
- **`get_industry_benchmark_stats(_company_ids text[], _days int DEFAULT 180)`** — agrega LTV médio, ticket médio, quotes/cliente, itens/orçamento, top produto, total revenue. Usado por Zona 2.

### Estratégia híbrida real + mock
- `useClientAffinity` / `useIndustryTrends`: chamam RPC; se ≥1 produto → `isMock: false`. Vazio → fallback mock.
- `useClientVsIndustry(clientId, ramo)`: 1) `selectCrm({ ramo_atividade })` → IDs (exclui o próprio cliente); 2) RPC benchmark; 3) calcula deltas % e classifica `above|on_par|below` com threshold ±15%; 4) gera insight textual baseado em regras simples. **Empty state** se `total_clients_sampled < 3`.

## Invariantes
- Match de ramo: case-insensitive contra `ramo` + `aliases`. Fallback: recomendações genéricas universais.
- Cliente sem ramo cadastrado: Zonas 2, 4 e 5 mostram fallback genérico ou ocultam, não erro.
- BIProductCard: imagem real quando `imageUrl` presente, ícone `Package` caso contrário; CTA "Ver produto" só aparece com `productId`.
- Comparativo Cliente × Setor: thresholds em `useClientVsIndustry.ts` (THRESHOLD=15, MIN_SAMPLE=3, DAYS_WINDOW=180).
- Dossiê PDF só fica habilitado quando todos os hooks BI terminaram de carregar (`isReady`); botão exibe spinner enquanto `isExporting`.

## Categorização (limitação atual)
`quote_items` não tem coluna `category` — derivação heurística por regex no nome do produto. Quando catálogo externo expor mapeamento direto produto→categoria (via JOIN ou enriquecimento), substituir.

## Dossiê PDF (Fase 3 — entregue)
`useBIDossierExport(clientId)` aguarda todos os hooks (`useClientBI`, `useClientVsIndustry`, `useClientAffinity`, `useIndustryTrends`, `useCrmCompany`) resolverem antes de chamar `generateBIDossierPDF`. Botão `ExportDossierButton` no header da página (visível só com cliente selecionado), estado loading com spinner. Estrutura: capa violeta com logo + cliente + vendedor + data; página 360° com 4 KPI boxes + tabela de pedidos; página benchmark Cliente×Setor com tabela de métricas + insight em destaque; página recomendações com 3 tabelas (afinidade, tendência setor, especialista). Rodapé fixo "Confidencial · uso interno comercial · gerado em {data}" + paginação. File name: `dossie-bi-{slug-cliente}-{YYYY-MM-DD}.pdf`.

## Como evoluir para `orders` (Fase 4)
1. Criar RPCs paralelas para `order_items` + `orders`.
2. No hook, `Promise.all([rpcOrders, rpcQuotes])` e mesclar (orders prioritário).
3. Manter mock como último fallback.

## Fora de escopo (próximos sprints)
- Editor admin para `INDUSTRY_RECOMMENDATIONS`
- Heatmap de sazonalidade (compras por mês)
- Compartilhar dossiê via link público assinado
- Coluna `category_id` em `quote_items` (eliminaria heurística)
