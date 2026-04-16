
Vou criar os 5 itens faltantes do Módulo 2 (IA), um por vez, com excelência.

## Itens a implementar

**1. `src/hooks/useProductBounds.ts`** ✅ já existe (verifiquei no contexto). Pular.

Recheck: o arquivo está no contexto atual → **já implementado**. Removo da lista.

## Plano final (4 itens)

### 1. RPC `search_products_semantic` (banco local)
Função PostgreSQL com `pg_trgm` para busca por similaridade textual. Como o catálogo de produtos está no banco **externo** (Promobrind), a RPC local fará busca em uma tabela local de cache/index OU receberá produtos como parâmetro JSONB e rankeará por similaridade. Melhor abordagem: aceitar `query text` + `products jsonb[]` e retornar ranking — mantém SSOT externo.

```sql
CREATE FUNCTION search_products_semantic(
  _query text,
  _products jsonb,
  _limit int DEFAULT 20
) RETURNS TABLE(product_id text, score real, matched_field text)
```
Usa `similarity()` do pg_trgm sobre name/description/tags.

### 2. `src/components/ai/AIChat.tsx`
Chat conversacional usando edge function `expert-chat` (já existe). Componente reutilizável com:
- Lista de mensagens (user/assistant), input com Enter para enviar
- Streaming opcional via SSE, loading states, auto-scroll
- Props: `systemPrompt?`, `placeholder?`, `onProductMention?` (suporta padrão `[[PRODUTO:id:nome:imageUrl]]` da memory `flow-product-integration-spec`)
- Tokens de design (Outfit, var(--primary), `border-[1.5px]`, `rounded-xl`)

### 3. `src/components/ai/AIRecommendationsPanel.tsx`
Painel que consome `useAIRecommendations` (já existe). Recebe `client: ClientProfile` + `products: ProductForRecommendation[]`:
- Form colapsável de perfil do cliente (nome, segmento, orçamento, preferências)
- Botão "Gerar Recomendações" com loading skeleton
- Grid de cards com produto (imagem, nome, score%, motivo), animação `animate-fade-in`
- Bloco de "Insights" abaixo
- Empty/error states

### 4. `src/components/products/SmartRecommendations.tsx`
Wrapper contextual chamado de páginas de produto/catálogo:
- Props: `currentProductId`, `clientId?`, `category?`, `maxResults=4`
- Internamente carrega produtos relacionados (mesma categoria) via external-db-bridge
- Chama `useAIRecommendations` automaticamente
- Renderiza carrossel horizontal compacto com cards de produto
- Skeleton loading, fallback silencioso se IA falhar

## Ordem de execução
1. Migration: criar RPC `search_products_semantic`
2. Criar `AIChat.tsx`
3. Criar `AIRecommendationsPanel.tsx`
4. Criar `SmartRecommendations.tsx`
5. Atualizar `src/components/ai/index.ts` exportando os novos componentes
6. Atualizar memory `mem://features/ai/monitoramento-consumo-e-quotas` com referência aos novos componentes

## Notas técnicas
- Todos os componentes seguirão: Outfit font, `var(--primary)`, `border-[1.5px]`, `rounded-xl/2xl`, `animate-fade-in`, a11y (`role="button"`, `tabIndex`, `onKeyDown`)
- Sem hardcoded colors, sem `any`, type imports inline
- Sub-componentes fora do render
- `lazyWithRetry` se forem usados em rotas
