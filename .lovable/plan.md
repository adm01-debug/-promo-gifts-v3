
## Remoção total do "Dashboard de Produtos" (BI)

Outro sistema externo cobrirá. Removo de front, back e docs.

### Investigação rápida necessária
- Confirmar rota `/bi` em `App.tsx`
- Localizar item de menu (Sidebar)
- Mapear hooks/componentes/páginas do BI
- Verificar edge functions e testes relacionados

### Frontend — deletar
- `src/pages/` página do BI Dashboard (provavelmente `BIDashboardPage.tsx` ou similar)
- `src/hooks/useBIMetrics.ts`
- Componentes em `src/components/bi/` (se existirem) — widgets de gráficos, cards de stats, novidades
- `tests/hooks/useBIMetrics.test.tsx`

### Frontend — editar
- `src/App.tsx` — remover import lazy + rota `/bi`
- `src/components/layout/SidebarReorganized.tsx` — remover item de menu "Dashboard de Produtos" / "BI"
- `src/components/search/useGlobalSearch.ts` — remover qualquer referência se houver
- Quaisquer breadcrumbs/links cruzados (`useCurrentSection.ts` se mapear `/bi`)

### Backend / Edge Functions
- Verificar se existe edge function dedicada (ex: `bi-metrics`, `product-bi-aggregator`) e deletar via `supabase--delete_edge_functions`
- Não tocar em MVs/tabelas externas (`mv_product_intelligence`) — usadas por outros módulos (ranking, supplier sales)

### Documentação
- `docs/EDGE_FUNCTIONS.md` — remover entradas se houver
- `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` — remover seção do Dashboard de Produtos
- `.lovable/memory/infrastructure/hardening-roadmap.md` — registrar remoção
- Atualizar `mem://architecture/security-and-auth-governance` se mencionar `/bi` como rota protegida

### Não tocar
- Hooks de inteligência reusados por outros módulos: `useSupplierSalesRanking`, `useCatalogRealStats`, `useSupplierTrust` (servem catálogo/reposição, não o BI)
- `src/integrations/supabase/types.ts` (auto-gerado)
- MVs externas

### Resultado
- Menu sem "Dashboard de Produtos"
- Rota `/bi` deixa de existir (404)
- Hook `useBIMetrics` e seu teste removidos
- Edge function de BI (se existir) removida do deploy
- Docs/memória consistentes
