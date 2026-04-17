---
name: Business Intelligence Module
description: Módulo /ferramentas/bi — central de inteligência comercial 360° por cliente para vendedores
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
2. **Afinidade** — top categorias do cliente + produtos similares sugeridos
3. **Tendência do setor** — top produtos vendidos por TODOS vendedores para o mesmo ramo (90 dias)
4. **Sugestão do especialista** — curadoria fixa por ramo (Seguros, Farmacêutico, Tech, Construção, Educação, Financeiro)

## Fonte de Dados
- **Cliente:** `useCrmCompany` (CRM externo, filtro `is_customer: true`)
- **Histórico real:** `useClientOrdersHistory` (orders local). Quando vazio → mock automático com badge "Dados simulados".
- **Tendências/Afinidade:** ainda mock (depende de orders amadurecer + order_items.category)

## Invariantes
- Match de ramo: case-insensitive contra `ramo` + `aliases`. Fallback: recomendações genéricas universais.
- Toda zona com mock exibe badge "Simulado" com ícone Sparkles para transparência.
- CTA padrão de cada produto: "Adicionar a Orçamento" → `/orcamentos/novo?clientId=X`.

## Como evoluir (futuro)
- Quando `order_items` tiver `category` populada → trocar mock de afinidade por agregação real.
- Quando volume de `orders` crescer → habilitar agregação cross-vendedor por `companies.ramo_atividade`.
- Editor admin para `INDUSTRY_RECOMMENDATIONS` (hoje hardcoded).
