
Módulo BI entregue. Próximo vetor 10/10 para o BI: **substituir mocks de afinidade por dados reais agregados** + **adicionar imagens reais de produtos** nas sugestões, transformando o módulo de "didático com mocks" em "operacional com dados reais sempre que existirem".

## Sprint — BI: Real Data Layer (Fase 1)

### 1. Afinidade real do cliente via `quotes` (não orders)
Pivô estratégico: o sistema já tem **volume de orçamentos** (`quotes` + `quote_items`), enquanto `orders` ainda está vazio. Vou usar `quote_items` como proxy de "interesse confirmado" do cliente:
- Nova RPC `get_client_category_affinity(_client_id uuid, _limit int)`: agrega `quote_items` JOIN `quotes` (status IN aprovado/enviado/aceito) WHERE `client_id = _client_id`, agrupa por `category` (campo já existe em quote_items), retorna top 5 com `count`, `total_revenue`.
- Atualizar `useClientAffinity.ts`: chamar RPC; se retornar ≥1 categoria → `isMock: false`. Se vazio → fallback mock atual.

### 2. Sugestões com produtos reais do catálogo
Para cada categoria afim retornada, buscar 3 produtos via `external-db-bridge` (`products` table, filter por `main_category_id` matching). Reaproveitar lógica do `useSimilarProducts`.
- Hook novo: `useCategoryProductSuggestions(categoryName, limit=3)` → resolve `category` slug → query catálogo externo.
- `BIProductCard` ganha props opcionais `imageUrl`, `productId`, `productSlug` → quando presentes, renderiza imagem real e CTA "Ver produto" leva ao `/produto/{slug}`.

### 3. Tendência setorial real
Nova RPC `get_industry_top_products(_ramo text, _days int)`:
- JOIN `quote_items` + `quotes` + `companies` (via `crm-db-bridge`? não — `client_id` em quotes referencia companies do CRM externo. Solução: aceitar `_company_ids uuid[]` como parâmetro, resolvido client-side a partir de `useCrmCompanies({ ramo })`).
- Agrega por `product_id`/`product_name`, ordena por `units_sold DESC`, top 10.
- Atualizar `useIndustryTrends.ts`: 1) buscar IDs de companies do mesmo ramo via CRM, 2) chamar RPC com array. Vazio → fallback mock.

### 4. UX dos badges "Simulado"
- Badge agora mostra contagem real quando híbrido: ex. "3 categorias reais + 2 sugeridas".
- Quando `isMock: false` → badge verde "Dados reais · últimos 90 dias".

### 5. Memória
- Atualizar `mem://features/business-intelligence-module.md`: documentar pivô para `quotes` como fonte (orders ainda imaturo), listar RPCs novas e como evoluir para `orders` quando amadurecer.

## Arquivos
- **Migration:** RPCs `get_client_category_affinity`, `get_industry_top_products` (SECURITY DEFINER, search_path=public, validar `auth.uid()` via `quotes.user_id`).
- **Editar:** `src/hooks/bi/useClientAffinity.ts`, `src/hooks/bi/useIndustryTrends.ts`, `src/components/bi/BIProductCard.tsx` (props imagem/link), `src/components/bi/ClientAffinityProducts.tsx` (badge dinâmico), `src/components/bi/IndustryTrendingProducts.tsx` (badge dinâmico).
- **Novo:** `src/hooks/bi/useCategoryProductSuggestions.ts`.
- **Sem mudança** em página principal, seletor, overview360, recomendações empíricas.

## Fora de escopo (próximos sprints)
- Comparativo "este cliente vs média do setor".
- Export PDF do dossiê.
- Editor admin de `INDUSTRY_RECOMMENDATIONS`.
