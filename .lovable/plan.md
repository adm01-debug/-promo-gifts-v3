
# Fix urgente do build + Foco em CATEGORIAS no BI

## Problema 1 — Build quebrado
`BusinessIntelligencePage.tsx` tem **JSX duplicado** (linhas 282-291) após o fechamento correto do `MainLayout`. Causa: edição anterior duplicou bloco de zonas. **Fix:** remover linhas 282-291.

## Problema 2 — Foco estratégico em categorias
Hoje o módulo BI mostra **produtos individuais** como ponto central (afinidade, tendência, lookalikes, bundles). O usuário pede que o **eixo principal seja a CATEGORIA** que o cliente / ramo costuma comprar — produtos viram desdobramento, não protagonista.

A estrutura `ramo_atividade` + `ramo_atividade_filhos` (segmentos) já existe, mas não está conectada ao BI. A categorização atual usa heurística regex sobre nome do produto (`deriveCategory`) — fraca e dispersa entre 3 hooks.

## Solução

### A. Hotfix (1 edit)
Remover bloco JSX duplicado em `BusinessIntelligencePage.tsx` linhas 282-291.

### B. Novo eixo "Categoria" no BI

**1. Hook unificado `useClientCategoryAffinity`** (novo)
- Agrega `quote_items` por categoria (usando `category_id` real quando disponível em `products`, fallback para regex)
- Retorna: ranking de categorias do cliente (qty, revenue, occurrences, % do total, tendência 90d vs 90d anteriores, top produtos da categoria)
- Mesma estratégia dual real/mock já usada

**2. Hook `useIndustryCategoryTrends`** (novo)
- Agrega top produtos do ramo por categoria
- Retorna: categorias mais compradas no setor + share-of-category dentro do ramo

**3. Componente novo `ClientCategoryRadar`** — Zona protagonista (substitui posição de destaque)
   - **Topo:** "O que [Cliente] compra" — bar chart horizontal das top 5 categorias do cliente (% receita)
   - **Direita:** "O que o setor compra" — mesmo formato para o ramo
   - **Diff insight:** "Cliente compra 3x mais Garrafas que a média do setor · Não compra Eletrônicos (40% do setor faz)"
   - Cada categoria expansível → revela top 3 produtos reais já comprados + 3 sugestões da mesma categoria
   - Badge real/mock + drill-down para Quote Builder pré-filtrado por categoria

**4. Refactor de componentes existentes para gravitar em torno de categoria:**
   - `ClientAffinityProducts`: já agrupa por categoria — promover título "Categorias preferidas do cliente" e dar mais peso visual a `cat.count` e `cat.revenue`
   - `IndustryTrendingProducts`: adicionar agrupador por categoria no topo (chips clicáveis com contagem); produtos viram resultado do filtro
   - `BundleSuggestions`: contextualizar "Produtos que combinam com a categoria favorita ([Categoria])"
   - `ClientLookalikes`: adicionar coluna "Categorias em comum" no card de lookalike

**5. Integração no `ClientHealthHero`**
   - Adicionar linha "Categoria favorita: **Garrafas** (43% das compras)" abaixo do score
   - "Categoria oportunidade (compra no setor, não em você): **Eletrônicos**" — link direto para nova zona

### C. Reposição na página
Nova ordem das zonas (todas dentro do bloco existente):
1. ClientHealthHero (com info de categoria)
2. ChurnRiskBanner
3. **ClientCategoryRadar** ← NOVO protagonista
4. ClientOverview360 + EnrichedOrdersTimeline
5. ClientVsIndustryComparison
6. ClientAffinityProducts (renomeado para "Produtos das categorias favoritas")
7. BundleSuggestions
8. IndustryTrendingProducts (com chips de categoria no topo)
9. ClientSeasonalityHeatmap
10. ClientLookalikes
11. EmpiricalRecommendations

### D. Categorização mais confiável
Hoje 3 lugares têm `deriveCategory` por regex. Centralizar em `src/lib/bi/categoryResolver.ts`:
- 1ª tentativa: `category_id` real do produto via `products.category_id` → `categories.name`
- 2ª: heurística regex unificada (mesma lógica)
- 3ª: "Outros"

## Arquivos
**Editar:**
- `src/pages/BusinessIntelligencePage.tsx` (remover duplicação + integrar ClientCategoryRadar + reordenar)
- `src/hooks/bi/useClientAffinity.ts` (usar resolver central)
- `src/hooks/bi/useIndustryTrends.ts` (idem)
- `src/components/bi/ClientHealthHero.tsx` (linha de categoria favorita/oportunidade)
- `src/components/bi/IndustryTrendingProducts.tsx` (chips de categoria no topo)
- `src/components/bi/ClientAffinityProducts.tsx` (peso visual em categoria)
- `src/components/bi/ClientLookalikes.tsx` (categorias em comum)

**Criar:**
- `src/lib/bi/categoryResolver.ts`
- `src/hooks/bi/useClientCategoryAffinity.ts`
- `src/hooks/bi/useIndustryCategoryTrends.ts`
- `src/components/bi/ClientCategoryRadar.tsx`

Sem mudanças de schema. Sem novas edge functions. Build volta a passar com o item A; itens B-D entregam o foco em categoria pedido.

Aprovado → executo: (1) hotfix do build, (2) resolver central + 2 hooks novos, (3) ClientCategoryRadar, (4) integrações nos componentes existentes, (5) integração no Hero, (6) reordenação da página.
