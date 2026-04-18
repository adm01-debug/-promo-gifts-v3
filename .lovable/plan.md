
User wants me to autonomously execute ALL remaining Kit Maker improvements from the audit, one at a time, no pauses, no questions, until 10/10. Sprint 1 + 2.2 are done. Remaining: Sprint 2 (visual), Sprint 3 (intelligence), Sprint 4 (scale).

# Roadmap de Execução Autônoma — Kit Maker rumo a 10/10

Vou executar as melhorias restantes sequencialmente, uma por vez, salvando progresso no task tracker. Sem pausas, sem perguntas.

## Sprint 2 — Visual & Apresentação
1. **Preview Isométrico SVG** — visualização 2.5D da caixa com itens dispostos em proporção real, indicador semântico de espaço (`KitIsometricPreview.tsx`).
2. **Mockup de Personalização ao Vivo** — toggle "com/sem logo" no preview, reaproveitando pipeline de mockup (`KitPersonalizationPreview.tsx`).

## Sprint 3 — Inteligência Comercial
3. **Card Saúde do Kit** — margem %, comparativo com média histórica, alerta de range competitivo (`KitHealthCard.tsx`).
4. **Modo Ocasião** — seletor opcional pré-step Caixa (Boas-vindas, Fim de ano, VIP, etc.) que filtra templates e ajusta sugestões (`KitOccasionSelector.tsx` + extensão de templates).
5. **IA Generativa de Kits** — prompt natural via Lovable AI Gateway que monta kit (edge function `kit-ai-builder` + UI `KitAIPromptDialog.tsx`).

## Sprint 4 — Escala & Diferenciação
6. **Multi-variante (P/M/G)** — versões dentro de um Kit Master com comparativo lado-a-lado (`KitVariantsManager.tsx` + nova coluna `variants` jsonb na tabela de kits).
7. **Analytics do Kit** — painel "meus kits campeões" com taxa de aprovação, ticket médio, sazonalidade (`KitAnalyticsDashboard.tsx` + view agregada).
8. **Colaboração** — link de edição compartilhada + comentários inline (tabela `kit_comments` + `KitCollaborationPanel.tsx`).
9. **Integração Estoque Futuro** — validação contra `variant_supplier_sources` com sugestão de data ideal de fechamento (`useKitStockForecast.ts`).

## Refinamentos finais 10/10
10. **Onboarding contextual** (tour 30s) + **micro-animações** (item "voa" para a caixa) + **lazy load** do preview pesado.

## Padrões aplicados a todos
- TS strict, sem `any`, type imports inline.
- Tokens `var(--primary)`, sem cores hardcoded.
- Componentes <300 LOC; hooks <500 LOC.
- A11y: `role`, `tabIndex`, `onKeyDown` em divs clicáveis.
- Edge functions com Zod + CORS inline + JWT.
- Memórias atualizadas após cada feature relevante.
- Roadmap registrado em `mem://features/kit-builder-excellence-roadmap`.

## Estratégia de execução
- Uma melhoria por vez, com task tracker marcando progresso.
- Após cada uma: build check + nota concisa do que mudou.
- Migrações DB pedirão aprovação automática (Sprint 4).
- Edge functions deployam automaticamente.
- Ao fim, resumo consolidado 10/10.

Pronto para executar do item 1 ao 10 sem interrupções assim que aprovado.
