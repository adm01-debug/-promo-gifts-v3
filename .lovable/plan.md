
# BI 10/10 — Item 6 final: Mapa de Categorias no Dossiê

Resta apenas o item 6 da Onda 6: incluir a seção "Mapa de Categorias" no export do dossiê (PDF + PPTX) e na página pública.

## O que será feito

1. **`src/lib/bi/executive-summary.ts`** — nova função `buildCategorySection(catAffinity, catIndustry)` que retorna estrutura com:
   - Top 5 categorias do cliente (label, share %, trend ↑↓, deltaPct)
   - Top 5 categorias do setor
   - GAPs prioritários (categorias fortes no setor que o cliente não compra, share ≥ 8%)
   - Insight textual ("Cliente tem afinidade forte em X. Oportunidade clara: Y.")

2. **`src/lib/bi/dossierPdfGenerator.ts`** — nova página 6 "Mapa de Categorias":
   - Tabela autoTable: Categoria | Cliente % | Setor % | Tendência
   - Box destaque "Oportunidades GAP" com bullets
   - Insight no rodapé da página

3. **`src/lib/bi/dossierPptxGenerator.ts`** — novo slide 6 espelhando PDF (pptxgenjs table + text boxes).

4. **`src/hooks/bi/useBIDossierExport.ts`** — incluir `useClientCategoryAffinity` + `useIndustryCategoryTrends` nos hooks aguardados; passar dados para os geradores.

5. **`src/pages/PublicDossierPage.tsx`** — adicionar `<ClientCategoryRadar>` entre Overview360 e VsIndustry para refletir o mesmo mapa.

## Arquivos
**Editar:** `executive-summary.ts`, `dossierPdfGenerator.ts`, `dossierPptxGenerator.ts`, `useBIDossierExport.ts`, `PublicDossierPage.tsx`.

Sem schema, sem edge function. 5 arquivos. Fecha 100% do plano da Onda 6 e finaliza o eixo CATEGORIA no BI.
