
BI Fase 4: Heatmap de Sazonalidade — 6ª zona de inteligência que mostra *quando* o cliente compra ao longo do ano.

## Sprint — Sazonalidade Cliente × Setor

### 1. Migration — 2 RPCs novas
- **`get_client_seasonality(_client_id text, _months int DEFAULT 24)`** — agrega `quotes` por (year, month): `quotes_count`, `total_revenue`, `avg_ticket`. Restrita a vendedor dono / admin / manager.
- **`get_industry_seasonality(_company_ids text[], _months int DEFAULT 24)`** — média por mês entre empresas do ramo: `avg_quotes_per_company`, `avg_revenue_per_company`. Qualquer autenticado.

Ambas SECURITY DEFINER, search_path=public.

### 2. Hook `useClientSeasonality(clientId, ramo)`
Orquestra ambas RPCs e calcula:
- Distribuição percentual por mês (cliente e setor) — array de 12 posições
- **Top 3 meses do cliente** + **Top 3 do setor**
- **Próximo pico**: distância em dias até o próximo mês de pico do cliente
- **Insight textual** por regras: ex. "Cliente concentra 45% das compras em Mar-Abr-Mai. Próximo pico em 18 dias — momento ideal para prospecção."
- Empty state se < 3 meses com dados; fallback mock determinístico

### 3. Componente `ClientSeasonalityHeatmap.tsx`
- Grid 12 colunas (Jan-Dez) × 2 linhas (Cliente / Setor)
- Células com gradiente proporcional usando `bg-violet-{50→600}` por intensidade
- Tooltip ao hover (Radix): "Março: 8 pedidos · R$ 12.400 · ticket R$ 1.550"
- Highlight no mês atual (ring violeta + label "Hoje")
- Cards laterais: "Próximo pico" + "Insight"
- Badge "Dados reais (24 meses)" / "Simulado"

### 4. Posicionamento na página
Inserir como **Zona 6** em `BusinessIntelligencePage.tsx`, após `IndustryTrendingProducts` e antes de `EmpiricalRecommendations`.

### 5. Integração com Dossiê PDF
- Estender `useBIDossierExport.ts`: incluir `seasonalityQ` em `isReady` e payload
- Adicionar 5ª página em `dossierPdfGenerator.ts`: tabela 12 meses Cliente vs Setor + insight em destaque
- Atualizar tipo `DossierData` e mock fallback de sazonalidade em `mockData.ts`

### 6. Memória
Atualizar `mem://features/business-intelligence-module.md` documentando Zona 6 + 2 RPCs + integração no dossiê.

## Arquivos
- **Migration:** RPCs `get_client_seasonality`, `get_industry_seasonality`
- **Novo:** `src/hooks/bi/useClientSeasonality.ts`, `src/components/bi/ClientSeasonalityHeatmap.tsx`
- **Editar:** `src/pages/BusinessIntelligencePage.tsx`, `src/lib/bi/dossierPdfGenerator.ts`, `src/hooks/bi/useBIDossierExport.ts`, `src/lib/bi/mockData.ts`, `mem://features/business-intelligence-module.md`

## Fora de escopo (próximos sprints)
- Editor admin de `INDUSTRY_RECOMMENDATIONS`
- Compartilhar dossiê via link público assinado
- Notificações automáticas em pico sazonal
