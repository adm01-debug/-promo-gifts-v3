
Continuação autônoma — Kit Maker rumo 10/10 (itens 6-10 restantes)

Já entregues: 1) Preview Isométrico SVG, 2) Mockup Personalização, 3) Card Saúde, 4) Modo Ocasião, 5) IA Generativa.

## Restantes a executar sequencialmente

**6. Multi-variante (P/M/G)**
- Migração: nova tabela `kit_variants` (kit_master_id, label, items_data jsonb, box_data jsonb, total_price, kit_quantity).
- Componente `KitVariantsManager.tsx` com comparativo lado-a-lado (cards de cada versão + diff de itens/preço).
- Botão "Criar variante" no header do builder; export de orçamento inclui as 3 versões.

**7. Analytics do Kit ("Kits Campeões")**
- View agregada `kit_analytics_summary` (cruza `custom_kits` + `quotes` por kit_id em metadata).
- Página `/montar-kit/analytics` com `KitAnalyticsDashboard.tsx`: top kits por taxa de aprovação, ticket médio, frequência, sazonalidade (gráfico mensal recharts).
- Card no header com link "Meus campeões".

**8. Colaboração + Comentários**
- Migração: `kit_comments` (kit_id, author_id, parent_id, body, resolved, created_at) + `kit_collaborators` (kit_id, user_id, permission).
- `KitCollaborationPanel.tsx`: lista colaboradores, convite por email, link de edição compartilhada.
- `KitCommentThread.tsx` inline em cada item (ícone bolha que abre popover).
- Realtime subscription para comentários novos.

**9. Integração Estoque Futuro**
- Hook `useKitStockForecast.ts` que consulta `variant_supplier_sources` via external-db-bridge para itens do kit.
- Componente `KitStockForecastCard.tsx`: data ideal de fechamento = max(next_entry_date dos itens em deficit) + buffer 3 dias.
- Integrado em `KitSummary` ao lado do alerta de estoque atual.

**10. Refinamentos finais 10/10**
- Onboarding tour 30s (componente `KitOnboardingTour.tsx` controlado por flag em localStorage `kit-tour-completed`).
- Micro-animações: item "voa" para a caixa ao adicionar (framer-motion `layoutId`).
- Lazy load: `KitIsometricPreview` e `KitPresentablePreview` via `lazyWithRetry`.

## Padrões aplicados
- TS strict, sem `any`, type imports inline.
- Tokens semânticos `var(--primary)`, sem hardcode.
- Componentes <300 LOC, hooks <500 LOC.
- A11y: role/tabIndex/onKeyDown em divs clicáveis.
- Migrações com RLS (kit owner + admin).
- Realtime via canais privados `user:<userId>:` (memória).
- Memórias atualizadas ao final em `mem://features/kit-builder-excellence-roadmap`.

## Estratégia
Execução sequencial 6→10 sem perguntas. Após cada item: build check + nota concisa. Migrações DB pedirão aprovação automática inline. Ao fim: resumo consolidado 10/10 + atualização do índice de memórias.

Pronto para executar.
