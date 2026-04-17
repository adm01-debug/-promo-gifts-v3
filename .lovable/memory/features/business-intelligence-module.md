---
name: Business Intelligence Module
description: Módulo /ferramentas/bi com inteligência 360° por cliente. Usa quote_items como proxy de "interesse confirmado" via RPCs get_client_top_products e get_industry_top_products; fallback mock quando volume insuficiente.
type: feature
---

# Business Intelligence (Ferramentas → BI)

**Rota:** `/ferramentas/bi` · **Sidebar:** Ferramentas → "Business Intelligence" (ícone Sparkles)

## Arquitetura
- Página: `src/pages/BusinessIntelligencePage.tsx`
- Componentes: `src/components/bi/{ClientSelector, ClientOverview360, ClientAffinityProducts, IndustryTrendingProducts, EmpiricalRecommendations, BIProductCard}.tsx`
- Hooks: `src/hooks/bi/{useClientBI, useClientAffinity, useIndustryTrends}.ts`
- Curadoria: `src/lib/bi/industryRecommendations.ts` (mapa empírico ramo→categorias/produtos)
- Mocks: `src/lib/bi/mockData.ts` (fallback quando histórico real está vazio)

## 4 Zonas de Inteligência
1. **Visão 360°** — LTV, ticket médio, última compra (badge recência) + timeline 5 últimos pedidos
2. **Afinidade** — top categorias do cliente + produtos reais sugeridos (com imagem + link `/produto/:id`)
3. **Tendência do setor** — top produtos vendidos para empresas do mesmo ramo (90 dias)
4. **Sugestão do especialista** — curadoria fixa por ramo (Seguros, Farmacêutico, Tech, Construção, Educação, Financeiro)

## Fonte de Dados (Fase 1 — entregue)
**Pivô estratégico:** `orders` ainda está vazio. Sistema usa `quote_items` + `quotes` como proxy de "interesse confirmado". Quando `orders` amadurecer, basta apontar as RPCs para `order_items`.

### RPCs ativas (SECURITY DEFINER, search_path=public)
- **`get_client_top_products(_client_id text, _limit int)`** — top produtos orçados pelo cliente. Restrito a vendedor dono / admin / manager. Filtra `status IN ('sent','viewed','approved','converted','pending_approval')`. Retorna `total_quantity, occurrences, total_revenue, avg_unit_price, last_quoted_at, product_image_url`.
- **`get_industry_top_products(_company_ids text[], _days int, _limit int)`** — top produtos vendidos para um conjunto de empresas (mesmo ramo). Visível a qualquer autenticado. IDs vêm do CRM externo (`companies.ramo_atividade`).

### Estratégia híbrida real + mock
- `useClientAffinity`: chama RPC; se ≥1 produto → `isMock: false`, agrupa em categorias derivadas do nome (regex `deriveCategoryFromName`), mostra imagem real e link para produto. Se vazio → fallback mock por categoria.
- `useIndustryTrends`: 1) `selectCrm({ ramo_atividade })` para obter company IDs; 2) RPC com array de IDs; 3) vazio → fallback mock determinístico.
- **Badges UI:** verde "Dados reais" quando `isMock: false`, âmbar "Simulado" caso contrário. Subtítulo dinâmico mostra contagem real (ex: "Baseado em 12 produtos já orçados").

## Invariantes
- Match de ramo: case-insensitive contra `ramo` + `aliases`. Fallback: recomendações genéricas universais.
- Cliente sem ramo cadastrado: Zonas 3 e 4 mostram fallback genérico, não erro.
- BIProductCard: imagem real quando `imageUrl` presente, ícone `Package` caso contrário; CTA "Ver produto" só aparece com `productId`.

## Categorização (limitação atual)
`quote_items` não tem coluna `category` — derivação heurística por regex no nome do produto. Quando catálogo externo expor mapeamento direto produto→categoria (via JOIN ou enriquecimento), substituir.

## Como evoluir para `orders` (Fase 2)
1. Criar RPCs paralelas `get_client_top_products_from_orders` e `get_industry_top_products_from_orders` apontando para `order_items` + `orders`.
2. No hook, `Promise.all([rpcOrders, rpcQuotes])` e mesclar (orders prioritário).
3. Manter mock como último fallback.

## Fora de escopo (próximos sprints)
- Comparativo "este cliente vs média do setor"
- Export PDF do dossiê do cliente
- Editor admin para `INDUSTRY_RECOMMENDATIONS`
- Coluna `category_id` em `quote_items` (eliminaria heurística)
