
A busca semântica já foi expandida na resposta anterior (8 entidades: produto, cliente, orçamento, pedido, coleção, kit, mockup, arquivo de arte). O usuário agora pede para garantir cobertura total + validar.

## Gaps identificados vs. registros disponíveis no banco

Faltam ainda estes tipos no `semantic-search` + `useGlobalSearch`:
1. **Templates de carrinho** (`cart_templates`)
2. **Lembretes de follow-up** (`follow_up_reminders`)
3. **Conversas com IA** (`expert_conversations` + última mensagem)
4. **Gerações Magic Up** (`magic_up_generations`) — buscar por cliente/produto/cena
5. **Categorias** (`category_icons`) — atalho para filtrar catálogo
6. **Componentes de produto** (`product_components`) — busca técnica
7. **Mídia de componentes** (`component_media`) — por título

## Plano de execução

### 1. Backend — `supabase/functions/semantic-search/index.ts`
- Adicionar 7 novos `EntityType`: `cart_template | reminder | conversation | magic_up | category | component | media`
- Atualizar prompt do Gemini com exemplos de cada intenção (PT-BR)
- Atualizar JSON schema (`entities[]` enum)
- Re-deploy via `deploy_edge_functions`

### 2. Frontend — `src/components/search/useGlobalSearch.ts`
- 7 novos blocos `if (wants("..."))` com queries Supabase paralelas (já no `Promise.all`)
- Cada bloco respeita RLS (filtrado por `auth.uid()` automaticamente)
- Mapear para `SearchResult` com label + sublabel descritivo + href correto

### 3. UI — `src/components/search/search-types.ts`
- 7 novas entradas em `typeConfig` com ícone Lucide + cor estática Tailwind:
  - `cart_template`: `ClipboardList` / `bg-cyan-500`
  - `reminder`: `Bell` / `bg-yellow-500`
  - `conversation`: `MessageSquare` / `bg-emerald-500`
  - `magic_up`: `Wand2` / `bg-purple-500`
  - `category`: `Tag` / `bg-blue-500`
  - `component`: `Puzzle` / `bg-indigo-500`
  - `media`: `Image` / `bg-rose-500`

### 4. RPC re-rank `pg_trgm` (otimização)
Para entidades de texto-rico (orçamentos, pedidos, conversas), aplicar a RPC `search_products_semantic` adaptada — criar variante `search_records_semantic(_query, _records jsonb)` para boost de relevância. **Opcional nesta fase** — se houver tempo após validação base.

### 5. Validação E2E
- `curl_edge_functions` em `/semantic-search` com 3 queries reais:
  - "lembrete do orçamento da empresa X"
  - "kits de canecas térmicas azuis"
  - "conversas sobre estampa silk"
- Browser: navegar `/`, abrir `Ctrl+K`, digitar e capturar screenshot mostrando agrupamento por tipo
- Console + network: zero erros, latência < 2s
- Atualizar `mem://features/catalog-search-and-relevance-v2` com cobertura final (15 tipos)

### Arquivos a editar
- `supabase/functions/semantic-search/index.ts`
- `src/components/search/useGlobalSearch.ts`
- `src/components/search/search-types.ts`

Sem migration (todas as tabelas já existem com RLS). Sem novos componentes (palette atual já renderiza por `typeConfig`).
