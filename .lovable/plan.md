
# Execução autônoma — Sprints 1, 2, 3 do BI 10/10

Vou executar todas as melhorias aprovadas sequencialmente, sem pausas. Os componentes de base já foram criados na rodada anterior (`ClientHealthHero`, `ChurnRiskBanner`, `EnrichedOrdersTimeline`, `BIBriefingMode`, `BIAiCopilot`, `ConfirmQuoteSuggestionsModal`, hooks `useClientHealthScore` e `useChurnRisk`, edge function `bi-copilot`). Falta integrar tudo na página + criar peças restantes.

## Plano de execução (1 por vez)

### Bloco A — Integração Sprint 1 (narrativa executiva)
1. Substituir header passivo por `ClientHealthHero` no topo da `BusinessIntelligencePage`
2. Inserir `ChurnRiskBanner` logo abaixo (aparece só se risk médio/alto)
3. Wire do CTA do hero → abrir `ConfirmQuoteSuggestionsModal` (modal de confirmação antes do Quote Builder)
4. Adicionar botões "Briefing" e "Pergunte ao BI" no header (drawer + chat lateral)

### Bloco B — Sprint 2 (densidade & venda consultiva)
5. Substituir "Últimos pedidos" por `EnrichedOrdersTimeline` na zona Visão 360°
6. Adicionar Share-of-Wallet como 5ª métrica em `ClientVsIndustryComparison` (estimativa: LTV/(LTV+gap setor))
7. Gap analysis em `IndustryTrendingProducts`: coluna "Cliente já compra?" + filtro "Só oportunidades" + top 3 como hero cards
8. Bundle suggestions em `ClientAffinityProducts` (nova RPC `get_bundle_suggestions` já existe no DB) → seção "Compram juntos"

### Bloco C — Sprint 3 (inteligência avançada)
9. Toggle "Este trimestre vs anterior" em `ClientOverview360` (variação % com setas)
10. Sazonalidade preditiva: linha pontilhada projetada (regressão linear simples) em `ClientSeasonalityHeatmap` + card "Próxima janela de campanha"
11. Lookalikes: novo componente `ClientLookalikes` (clientes do mesmo ramo com ticket similar → produtos comprados por eles)

### Bloco D — Polish (Onda 4)
12. Sistema cromático semântico aplicado: verde=saúde, âmbar=atenção, vermelho=risco, violeta=sazonalidade
13. Skeleton states com forma das zonas (não retângulo genérico)
14. Botão "Copiar resumo executivo" (gera 3 parágrafos via `bi-copilot` ou template) + adicionar export `.pptx` ao lado do PDF

## Detalhes técnicos chave

- **Share-of-wallet**: estimativa heurística = `clienteLTV / (clienteLTV + (avgSetorLTV * 1.5))` capped 5-95%
- **Gap analysis**: cruzar `useClientAffinity` produtos com `useIndustryTrends` → marca `clientAlreadyBuys` por `productId`
- **Bundle**: chamar `supabase.rpc('get_bundle_suggestions', { _product_id })` para top produto do cliente
- **Predictive seasonality**: regressão linear sobre últimos 12 meses de `quotes_count` → projetar próximos 6
- **Lookalikes**: filtrar `selectCrm(companies)` por mesmo ramo + LTV ±30% → buscar `quote_items` agregados
- **Copy executiva**: edge function nova `bi-executive-summary` usando Lovable AI Gateway (gemini-2.5-flash) com dados das 6 zonas
- **PPTX export**: biblioteca `pptxgenjs` (cliente, sem edge function) — 5 slides espelhando o PDF

## Ordem de commits (atômicos, sem retrabalho)
Cada item acima = 1 ou 2 arquivos editados/criados. Vou executar em sequência sem perguntar, com revisão visual mental após cada bloco. Se algo quebrar tipos, corrijo no mesmo turno.

**Total estimado:** ~14 edições/criações de arquivos + 1 edge function nova. Sem mudanças de schema (todas as RPCs necessárias já existem).

Aprovado → executo agora do item 1 ao 14 sequencialmente.
