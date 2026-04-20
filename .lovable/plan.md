

# Comparador de Produtos — Plano Estratégico de Excelência (Onda C)

Auditoria como **Product Designer Strategist** sobre `/comparar`. O módulo tem boa base (chave composta produto+variante, galeria sincronizada com zoom/pan, tabela com highlight best/worst, FloatingBar), mas está **operacional, não estratégico**: hoje só responde "qual é mais barato?". Falta virar **ferramenta de decisão de venda**.

## Diagnóstico atual (placar honesto)

| Dimensão | Nota | Por quê |
|---|---|---|
| Arquitetura/store | 9/10 | Composite key sólido |
| Visualização | 7/10 | Galeria + tabela OK, sem heatmap nem radar |
| Inteligência decisão | 4/10 | Só best/worst em preço/qtd mín |
| CRM/orçamento | 3/10 | Não vincula cliente, não exporta orçamento |
| Compartilhamento | 5/10 | Web Share API só com texto, sem link público |
| Persistência | 3/10 | Apenas `localStorage`, perde entre dispositivos |
| A11y | 6/10 | Falta ARIA-live, foco em modais |
| Mobile | 6/10 | Tabela faz scroll horizontal travado |
| Personalização | 2/10 | Não dá para escolher quais atributos comparar |
| Atalhos/poder | 1/10 | Sem keyboard shortcuts dedicados |

**Meta: 10/10 absoluto** com paridade aos módulos Favoritos/Coleções já em 10/10.

---

## 26 melhorias propostas — 4 ondas

### 🌊 Onda C1 — Inteligência de decisão (alto impacto)

**1. Score composto "Melhor escolha"** — algoritmo ponderado (preço 35% + estoque 20% + qtd mín 15% + cores 10% + fornecedor verificado 10% + lead time 10%). Badge `<Crown>` "Recomendado" no card vencedor + tooltip explicando os pesos. Pesos ajustáveis via popover (sliders).

**2. Radar chart comparativo** (recharts) — eixos: preço, estoque, variedade de cores, qtd mín invertida, lead time. Render acima da galeria, mostra gaps visuais instantâneos.

**3. Diff de preço com TCO (Total Cost of Ownership)** — coluna "Custo total na qtd mín" = `price × min_quantity`. Muitas vezes o "mais barato unitário" é o pior no fechamento.

**4. Highlight em mais 8 linhas da tabela** (hoje só preço/qtd mín): estoque, lead time, nº de cores, materiais, peso, dimensões, MOQ, fornecedor verificado. Cada linha escolhe `lower-is-better` ou `higher-is-better`.

**5. "Differences only" toggle** — chip que oculta linhas onde todos os produtos têm o mesmo valor. Foco no que importa para decidir.

**6. Análise IA "Qual escolher?"** — botão que chama `google/gemini-2.5-flash` via Lovable AI com payload dos produtos e devolve recomendação textual em 3 bullets ("para qtd alta", "para entrega rápida", "para premium"). Cache 30min em sessionStorage.

---

### 🌊 Onda C2 — CRM + Orçamento + Compartilhamento real

**7. `FavoritesClientPicker` no header** — vincula comparação a um cliente CRM. Persiste em nova tabela `comparisons` (id, user_id, client_id, products jsonb, created_at, share_token).

**8. CTA "Criar orçamento desta comparação"** — gera orçamento já populado com produto vencedor (ou multi-seleção) + qty mín, navegando para `/orcamentos/novo?products=...&client_id=...`.

**9. Share público `/comparar-publica/:token`** — espelho dos sistemas de Favoritos/Coleções. Cliente externo vê comparação read-only com reactions anônimas (👍 ❤️ 🔥). Edge function `comparisons-public-react` com rate limit + IP hash.

**10. Export PDF/PNG/CSV** — botão dropdown como em Coleções. PDF formato A4 paisagem com logo + tabela; PNG screenshot da galeria; CSV para Excel.

**11. Persistência cross-device** — migrar de `localStorage` para tabela `user_comparisons` com upsert no Supabase. Sync ao logar. Mantém localStorage como cache offline-first.

---

### 🌊 Onda C3 — UX/Visualização premium

**12. Modo "side-by-side" 2-colunas** — quando exatamente 2 produtos, layout especial tipo "duelo" com fotos enormes e diferenças destacadas em colunas alternadas (zebra).

**13. Galeria — sincronizar troca de variante** — ao trocar cor numa thumbnail, propaga para os outros produtos buscando cor equivalente (mesmo nome ou hex próximo). Já existe sincronização de zoom; falta de cor.

**14. Mobile-first: cards swipeable** — em <768px, abandonar tabela horizontal. Renderizar carousel vertical de "linhas" onde cada linha é um atributo e os produtos viram chips horizontais. Padrão de comparadores de e-commerce mobile.

**15. Sticky comparison header** ao rolar — header com thumbnails miniatura + nome fixo no topo enquanto rola a tabela longa.

**16. Preview hover de variantes** — hover sobre o swatch de cor na linha "Cores" troca a imagem do header (sem navegar). Volta ao default ao tirar mouse.

**17. Animação de entrada/saída** — `framer-motion` `AnimatePresence` para colunas (slide+fade) ao adicionar/remover produto. Hoje é troca seca.

---

### 🌊 Onda C4 — Inteligência comercial avançada

**18. Histórico de preço inline** (sparkline 30 dias) — usar `price_history` (se existir; senão criar tabela). Mostra mini-gráfico ao lado do preço, badge "↓12% no mês".

**19. Alerta "Concorrentes do mesmo fornecedor"** — integra `useSupplierComparison` já existente: linha extra "Outros fornecedores deste produto" expansível, mostrando se há alternativa mais barata fora da comparação atual.

**20. "Risco de estoque" combinado** — usa intelligence de `useFutureStock`: badge vermelho se algum dos comparados tem ruptura prevista nos próximos 30d. Crítico para venda B2B.

**21. Sugestão "Compare também com…"** — bottom rail com 4-6 produtos similares (mesma categoria, faixa de preço próxima) com botão "+ Adicionar à comparação". Aumenta retenção e descoberta.

**22. Modo apresentação fullscreen para cliente** — espelho de `CollectionPresentationLauncher`. Slide deck com cada produto em tela cheia + slide final "tabela comparativa". Atalhos ←/→/F.

---

### 🌊 Onda C5 — Polimento, A11y e poder

**23. Atalhos globais dedicados** — `G X` navega para `/comparar`, `Shift+X` limpa, `1-4` foca produto N, `D` toggle "differences only", `R` abre radar.

**24. ARIA-live region** — anúncios de "Produto X removido", "Produto Y adicionado", "Comparação limpa".

**25. Empty state inteligente** — quando 0 ou 1 produto, mostra top 6 produtos da semana + CTA "Adicionar à comparação" direto (não obriga voltar ao catálogo).

**26. Histórico de comparações recentes** — sidebar "Suas últimas 5 comparações" recarregáveis em 1 clique, derivado da nova tabela `user_comparisons`.

---

## Sequenciamento recomendado

```text
C1 (Inteligência decisão)  →  C2 (CRM + Share + Persist)  →  
C3 (UX premium)  →  C4 (Inteligência comercial)  →  C5 (Polimento)
```

**Execução autônoma:** uma melhoria por vez, sem pausas, conforme `mem://~user`. Cada onda entrega tudo (migração + edge function + componente + integração + memória) antes da próxima.

## Arquivos/recursos previstos

**Modificados:** `ComparePage.tsx`, `CompareTableView.tsx`, `FloatingCompareBar.tsx`, `SyncedZoomGallery.tsx`, `useComparisonStore.ts`

**Criados:**
- `src/components/compare/ComparisonScoreCard.tsx` (#1)
- `src/components/compare/ComparisonRadarChart.tsx` (#2)
- `src/components/compare/AIComparisonAdvisor.tsx` (#6)
- `src/components/compare/ShareComparisonDialog.tsx` (#9)
- `src/components/compare/ExportComparisonButton.tsx` (#10)
- `src/components/compare/ComparisonDuelView.tsx` (#12)
- `src/components/compare/ComparisonMobileView.tsx` (#14)
- `src/components/compare/ComparisonPresentationLauncher.tsx` (#22)
- `src/components/compare/RecentComparisonsSidebar.tsx` (#26)
- `src/hooks/useComparisonScore.ts` (#1)
- `src/hooks/useComparisonShortcuts.ts` (#23)
- `supabase/functions/comparisons-public-react/index.ts` (#9)
- `supabase/functions/comparison-ai-advisor/index.ts` (#6)

**Migrações DB:**
- Tabela `user_comparisons` (id, user_id, client_id, items jsonb, share_token, is_public, created_at) com RLS
- Tabela `comparison_reactions` (mesmo padrão de favorites)
- RPC `cleanup_expired_public_comparisons()` + cron diário 03:30 BR

**Memórias:**
- Atualizar `mem://features/catalog/comparison-system-spec` com 26 melhorias
- Atualizar `mem://features/keyboard-shortcuts-registry` com novos atalhos
- Criar `mem://features/comparison-public-share-system`

## Resultado esperado
Comparador 10/10 — deixa de ser "tabela" e vira **co-piloto de decisão de venda B2B** com IA, score composto, radar visual, share público com cliente, persistência cross-device e paridade total com os módulos Favoritos/Coleções já em 10/10.

