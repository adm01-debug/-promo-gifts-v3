
# BI 10/10 — Onda 7: Polish final do eixo CATEGORIA

Onda 6 fechada (mapa de categorias no PDF + página pública). Para chegar definitivamente em 10/10, identifico 5 lacunas finais ainda visíveis no eixo CATEGORIA:

## Itens (executar 1 a 1, sem pausas)

1. **PPTX espelhando o PDF** — `dossierPptxGenerator.ts` ainda não tem o slide "Mapa de Categorias". Adicionar slide 6 com tabela (Categoria | Cliente% | Setor% | Tendência), box de GAPs e insight, espelhando o layout do PDF.

2. **Drill-down no `ClientCategoryRadar`** — categorias hoje mostram share/trend mas não expandem. Adicionar `<Collapsible>` por linha revelando: top 3 produtos reais comprados nessa categoria + 3 sugestões da mesma categoria do setor + CTA "Abrir no Quote Builder com filtro".

3. **Filtro persistente de categoria global** — quando vendedor clica numa categoria do Radar, propagar via Context (`BICategoryFocusContext`) para destacar/filtrar `IndustryTrendingProducts`, `BundleSuggestions` e `ClientAffinityProducts`. Botão "Limpar foco" no header.

4. **Insight de categoria no `ChurnRiskBanner`** — quando churn risk alto, adicionar linha "Última categoria comprada: X (há N dias)" para dar gancho de reativação.

5. **Tooltip educativo no Radar** — pequeno `(?)` ao lado do título "Mapa de Categorias" explicando: como GAP é calculado (≥8% setor / <5% cliente), o que significa trend ↑↓ (90d vs 90-180d), origem do dado (real vs simulado).

## Detalhes técnicos
- **PPTX**: `pptx.addSlide()` + `slide.addTable()` com cabeçalho violeta consistente; reusar `buildCategorySection` já criado.
- **Drill-down**: `ClientCategoryRadar` passa a aceitar `topProductsByCategory` derivado de `useClientAffinity.data.topProducts` agrupados via `resolveBICategory`.
- **Context**: novo `src/contexts/BICategoryFocusContext.tsx` com `{ focusedSlug, setFocus, clear }`. Provider envolve só o bloco de zonas no `BusinessIntelligencePage`.
- **Churn**: `ChurnRiskBanner` lê `catAffinity.favorite` + `clientBI.lastQuoteAt`.
- **Tooltip**: Radix `<Tooltip>` com texto fixo; ícone `HelpCircle` lucide.

## Arquivos
**Criar:**
- `src/contexts/BICategoryFocusContext.tsx`

**Editar:**
- `src/lib/bi/dossierPptxGenerator.ts` (slide 6)
- `src/components/bi/ClientCategoryRadar.tsx` (drill-down + tooltip + setFocus)
- `src/components/bi/IndustryTrendingProducts.tsx` (consumir focus)
- `src/components/bi/BundleSuggestions.tsx` (consumir focus)
- `src/components/bi/ClientAffinityProducts.tsx` (consumir focus)
- `src/components/bi/ChurnRiskBanner.tsx` (linha categoria)
- `src/pages/BusinessIntelligencePage.tsx` (provider + botão limpar)

Sem schema. Sem edge function. 8 arquivos, 5 itens atômicos. Fecha 10/10 do eixo CATEGORIA.
