
## Insights da IA no módulo Inteligência de Mercado

Adicionar um card "Insights da IA" no topo do `/inteligencia-comercial`, abaixo dos KPIs, gerando narrativa acionável (resumo + o que mudou + por quê + próxima ação) com base nas mesmas métricas exibidas na página, respeitando os filtros ativos (período, categoria, fornecedor, produto).

### Backend — nova edge function `market-intelligence-insights`
Arquivo: `supabase/functions/market-intelligence-insights/index.ts`

- Auth JWT obrigatório (padrão do projeto)
- Body: `{ days, categoryId?, supplierId?, productId?, categoryName?, supplierName?, productName? }`
- Agrega dados reais de:
  - **Vendas internas** (período atual vs. anterior): `quote_items` + `order_items` filtrados → faturamento, pedidos, orçamentos, conversão, ticket médio
  - **Top produtos vendidos** (5)
  - **Top fornecedores** (5) com share %
  - **Top categorias** (5)
  - **Mercado** (via `mv_product_intelligence` quando disponível): velocidade média 7d/30d, ABC mix, depleted_30d
- Monta `summary` JSON e chama Lovable AI Gateway com `google/gemini-2.5-flash` + tool calling estruturado:
  - `summary` (1 frase)
  - `what_changed` (números específicos)
  - `why` (hipótese)
  - `next_action` (ação concreta)
  - `highlights` (array curto de 2-3 bullets opcionais)
- Tratamento de 429/402 + fallback determinístico se AI falhar ou volume insuficiente
- Inline CORS (padrão do projeto)
- `verify_jwt = true` (default — não precisa entrada no config.toml)

### Frontend — novo componente `MarketIntelligenceInsightsCard`
Arquivo: `src/components/intelligence/MarketIntelligenceInsightsCard.tsx`

- Mesma estética do `TrendsInsightsCard` (gradient violet, ícone Sparkles, botão refresh)
- Props: `{ days, categoryId, supplierId, productId, categoryName, supplierName, productName }`
- `useQuery` com chave incluindo todos os filtros — recarrega ao trocar filtro
- Exibe: resumo em destaque + 3-4 InsightRows (O que mudou / Por quê / Próxima ação / Destaques opcionais)
- Skeleton de loading + estado de erro amigável
- Toasts para 429/402
- `staleTime: 5 min`, `retry: false`
- Badge contextual mostrando filtros ativos (ex: "Categoria: Canecas · Fornecedor: ABC")

### Integração na página
Arquivo: `src/pages/CommercialIntelligencePage.tsx`

Inserir o card logo após `<IntelligenceKPICards>` e antes de `<MarketIntelligenceChart>`:

```tsx
<MarketIntelligenceInsightsCard
  days={filters.days}
  categoryId={filters.categoryId}
  supplierId={filters.supplierId}
  productId={filters.productId}
  categoryName={filters.categoryName}
  supplierName={filters.supplierName}
  productName={filters.productName}
/>
```

### Documentação
- Atualizar `mem://features/ai/monitoramento-consumo-e-quotas` adicionando `market-intelligence-insights` aos componentes/edge functions de IA monitorados

### Não tocar
- `trends-insights` (continua exclusivo do `/tendencias`)
- Hooks de dados existentes (`useSalesHistoryMacro`, `useSupplierSalesRanking`, etc.) — a edge function consulta direto o banco para evitar dependência client-side
- Mocks do módulo Tendências
