
BI Fase 3 (Dossiê PDF) entregue. Próximo vetor 10/10: **Heatmap de Sazonalidade** — 6ª zona de inteligência que mostra ao vendedor *quando* o cliente compra ao longo do ano, identificando picos sazonais para timing perfeito de abordagem.

## Sprint — BI Fase 4: Heatmap de Sazonalidade

### 1. Nova RPC `get_client_seasonality(_client_id text, _months int)`
Agrega `quotes` aprovados/convertidos por mês nos últimos 24 meses:
- Retorna: `month` (1-12), `year`, `quotes_count`, `total_revenue`, `avg_ticket`
- SECURITY DEFINER, search_path=public, restrita a vendedor dono / admin / manager
- GROUP BY ano+mês, ORDER BY ano DESC, mês ASC

### 2. Nova RPC `get_industry_seasonality(_company_ids text[], _months int)`
Mesma estrutura, mas agregada por ramo (média por mês entre todas as empresas):
- Retorna: `month`, `avg_quotes_per_company`, `avg_revenue_per_company`
- Permite comparar pico do cliente vs pico do setor

### 3. Hook `useClientSeasonality(clientId, ramo)`
Orquestra ambas as RPCs e calcula:
- **Top 3 meses do cliente** (maior volume histórico)
- **Top 3 meses do setor** (sazonalidade da indústria)
- **Mês atual** + próximos 2 meses (highlight de oportunidade)
- **Insight gerado**: ex. "Cliente concentra 45% das compras em Mar-Abr-Mai. Estamos a 15 dias do próximo pico — momento ideal para prospecção."
- Fallback mock quando histórico < 3 meses de dados

### 4. Componente `ClientSeasonalityHeatmap.tsx`
Visual: grid 12 colunas (meses) × 2 linhas (Cliente / Setor):
- Células com gradiente de cor (cinza claro → violet-600) proporcional ao volume
- Tooltip ao hover: "Março: 8 pedidos · R$ 12.400 · ticket médio R$ 1.550"
- Highlight no mês atual (borda violeta + label "Hoje")
- Cards laterais: "Próximo pico: Maio (18 dias)" + "Insight" textual
- Legenda: gradient bar com escala
- Badge "Dados reais (24 meses)" / "Simulado"

### 5. Posicionamento na página
Inserir como **Zona 6** (após Tendência do setor, antes de Sugestão do especialista). É a "ferramenta de timing" — completa a tríade Quem/O quê/Quando.

### 6. Integração com Dossiê PDF
Adicionar 5ª página ao dossiê:
- Tabela 12 meses × Cliente vs Setor (volumes + receita)
- Insight de sazonalidade em destaque
- Atualizar `dossierPdfGenerator.ts` + `useBIDossierExport.ts` para incluir os novos dados

### 7. Memória
Atualizar `mem://features/business-intelligence-module.md` documentando Zona 6 + 2 novas RPCs + integração no Dossiê.

## Arquivos
- **Migration:** RPCs `get_client_seasonality`, `get_industry_seasonality`
- **Novo:** `src/hooks/bi/useClientSeasonality.ts`, `src/components/bi/ClientSeasonalityHeatmap.tsx`
- **Editar:** `src/pages/BusinessIntelligencePage.tsx` (Zona 6), `src/lib/bi/dossierPdfGenerator.ts` (5ª página), `src/hooks/bi/useBIDossierExport.ts` (passar seasonality), `src/lib/bi/mockData.ts` (mock de sazonalidade)
- **Sem mudanças** em hooks/zonas existentes

## Fora de escopo (próximos sprints)
- Editor admin de `INDUSTRY_RECOMMENDATIONS`
- Compartilhar dossiê via link público assinado
- Notificações automáticas quando cliente entrar em pico sazonal
