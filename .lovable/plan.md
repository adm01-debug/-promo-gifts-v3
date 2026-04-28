## Contexto

O card do print — **"Recomendações IA / Sugestões inteligentes para este cliente / Selecione um cliente primeiro"** — é o componente `AIRecommendationsPanel` (em `src/components/quotes/`) renderizado dentro do **Quote Builder** (`/orcamentos/novo` e `/orcamentos/editar`), na coluna do cabeçalho do orçamento, logo abaixo do bloco de frete (`QuoteBuilderPage.tsx`, linha 271).

Você está correto: essa funcionalidade **se sobrepõe ao Business Analytics** (`/ferramentas/bi`), que já entrega — de forma mais rica e baseada em dados reais (RPCs `get_client_top_products`, `get_industry_top_products`, `get_industry_benchmark_stats`, `get_client_seasonality`):

- **Zona 3 — Afinidade**: top categorias do cliente + produtos sugeridos
- **Zona 4 — Tendência do setor**: produtos mais vendidos para o ramo do cliente
- **Zona 6 — Sugestão do especialista**: curadoria por ramo (`industryRecommendations.ts`)
- **Recomendações Empíricas** (`EmpiricalRecommendations.tsx`)

O painel do Quote Builder, em comparação, faz uma chamada genérica ao LLM com uma amostra de 80 produtos do catálogo, sem usar histórico real do cliente nem benchmark setorial — ou seja, **entrega menos com mais custo**.

## Proposta

**Remover** o `AIRecommendationsPanel` do Quote Builder e **substituir por um atalho** para o Business Analytics do cliente selecionado, mantendo a inteligência centralizada em um único módulo (SSOT).

### O que muda

1. **`src/pages/QuoteBuilderPage.tsx`** — remover o bloco `<AIRecommendationsPanel ... />` (linhas 270-280) e o import (linha 24).

2. **Substituir por um CTA discreto** no mesmo lugar: card pequeno "Ver inteligência completa deste cliente" com ícone `Sparkles` + botão linkando para `/ferramentas/bi?clientId={companyId}`. Só aparece quando há cliente selecionado. Abre em nova aba (`target="_blank"`) para não perder o orçamento em edição.

3. **`src/components/quotes/AIRecommendationsPanel.tsx`** — **deletar** o arquivo (uso é exclusivo do Quote Builder, confirmado por grep).

4. **`src/hooks/useAIRecommendations.ts`** — verificar se é usado em outro lugar; se não, deletar também (e a edge function correspondente, se existir e não for usada). _Vou validar antes de remover._

5. **Nada muda** no Business Analytics — ele já faz tudo isso e melhor.

### O que NÃO muda

- O componente homônimo em `src/components/ai/AIRecommendationsPanel.tsx` (arquivo diferente, mais completo, usado em outros fluxos) — fica intacto.
- As 6 zonas do BI ficam intactas.
- Nenhuma migração de banco necessária.

### Resultado

- Quote Builder fica mais leve e focado em **montar o orçamento**.
- A inteligência de cliente fica em **um único lugar** (`/ferramentas/bi`), eliminando duplicação.
- Vendedor que quer recomendações tem 1 clique para o BI completo, com dados reais do cliente.

### Detalhes técnicos

- Remoção: 1 import + 1 bloco JSX em `QuoteBuilderPage.tsx`.
- Adição: card de 1 link com `useNavigate` ou `<a target="_blank">` apontando para `/ferramentas/bi?clientId=${s.companyInfo?.id}`.
- Cleanup: deletar `src/components/quotes/AIRecommendationsPanel.tsx` e (se órfão) `src/hooks/useAIRecommendations.ts` + edge function relacionada.
- Sem mudanças em RLS, schema, rotas ou contexts.