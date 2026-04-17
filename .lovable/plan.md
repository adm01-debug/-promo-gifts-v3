
BI Fase 2 entregue (Cliente × Setor). Próximo vetor 10/10: **Export PDF do Dossiê BI** — transforma o módulo de "tela operacional" em "ferramenta de pitch": vendedor gera um relatório profissional do cliente para levar a reuniões, anexar em propostas ou compartilhar internamente.

## Sprint — BI Fase 3: Dossiê PDF do Cliente

### 1. Botão "Exportar Dossiê" no header da página
- Posicionado ao lado do título da página, visível só quando cliente selecionado.
- Ícone `FileDown`, label "Exportar Dossiê PDF".
- Estado loading enquanto gera (spinner + "Gerando...").

### 2. Gerador PDF client-side com `jspdf` + `jspdf-autotable`
Bibliotecas já estão no projeto (usadas em export de orçamentos). Reaproveitar utilitários existentes (`src/lib/pdf/*` se houver).

### 3. Estrutura do Dossiê (4 páginas máx)
- **Capa:** logo Promo Gifts, "Dossiê Comercial · {Cliente}", ramo, CNPJ, cidade, data de emissão, vendedor responsável.
- **Página 1 — Visão 360°:** KPIs (LTV, ticket médio, última compra), timeline de pedidos recentes em tabela.
- **Página 2 — Cliente × Setor:** tabela das 4 métricas com cliente vs média + delta % + classificação textual + insight gerado.
- **Página 3 — Recomendações:** top 5 produtos de afinidade + top 5 tendências do setor + 3-5 sugestões empíricas (em tabelas com nome + categoria).
- **Rodapé fixo:** "Confidencial · uso interno comercial · gerado em {data}".

### 4. Hook orquestrador `useBIDossierExport(clientId, ramoAtividade)`
- Reusa `useClientBI`, `useClientVsIndustry`, `useClientAffinity`, `useIndustryTrends`, `resolveIndustryRecommendation` + `useCrmCompany`.
- Espera todos os hooks resolverem antes de gerar (nada de PDF parcial).
- Retorna `{ exportPDF: () => Promise<void>, isReady: boolean }`.

### 5. Componente `ExportDossierButton.tsx`
- Encapsula botão + lógica de loading + toast de sucesso/erro.
- Desabilitado se cliente não pronto ou export em curso.

### 6. Memória
- Atualizar `mem://features/business-intelligence-module.md`: documentar Fase 3 + novo botão + estrutura do dossiê.

## Arquivos
- **Novo:** `src/lib/bi/dossierPdfGenerator.ts` (função pura `generateBIDossierPDF(data) → Blob`), `src/hooks/bi/useBIDossierExport.ts`, `src/components/bi/ExportDossierButton.tsx`.
- **Editar:** `src/pages/BusinessIntelligencePage.tsx` (adicionar botão no header), `mem://features/business-intelligence-module.md`.
- **Sem migration**, sem mudanças em hooks/zonas existentes, sem novas dependências.

## Fora de escopo (próximos sprints)
- Heatmap de sazonalidade (compras por mês).
- Editor admin de `INDUSTRY_RECOMMENDATIONS`.
- Compartilhar dossiê via link público assinado.
