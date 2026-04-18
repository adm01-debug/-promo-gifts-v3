
A última onda (Orçamentos — Eficiência & Clareza) foi entregue 5/5. Sem nova lista pendente, proponho a próxima onda autônoma para fechar gaps reais no fluxo pós-aprovação (orçamento → pedido) e na visão analítica do funil de vendas.

# Plano: Orçamentos — Onda Pós-Aprovação & Funil (8 itens)

## Onda A — Conversão orçamento → pedido
1. **Botão "Converter em Pedido"** no detalhe do orçamento aprovado, com diálogo de confirmação (data prevista, observações).
2. **Indicador de pedido vinculado** — quando `orders.quote_id` existe, badge clicável no card/lista que leva ao pedido (PED-YY-XXXX).
3. **Bloqueio de edição pós-conversão** — orçamento convertido vira read-only com banner "Convertido em pedido #XXX em DD/MM".

## Onda B — Funil & analytics
4. **FunnelChart na lista** — mini-visualização Rascunho → Enviado → Visualizado → Aprovado → Convertido com taxas de conversão entre etapas.
5. **Tempo médio por etapa** — KPI "Ciclo médio de venda" calculado de `created_at` até `approved_at`.
6. **Heatmap de envios** — quando o cliente costuma abrir links (dia/hora), baseado em `quote_approval_tokens.viewed_at`.

## Onda C — Operacional
7. **Lembretes automáticos** — agendar follow-up X dias após envio se sem visualização (workspace_notifications + pg_cron).
8. **Atualizar memória** `quote-system-master-spec` com fluxo de conversão + funil + lembretes.

## Arquivos esperados
- **Novos**: `src/components/quotes/ConvertToOrderDialog.tsx`, `src/components/quotes/QuotesFunnelChart.tsx`, `src/components/quotes/QuoteOrderBadge.tsx`, `src/hooks/useQuoteFunnel.ts`, `supabase/functions/quote-followup-reminders/index.ts`.
- **Modificados**: `src/pages/QuoteDetailPage.tsx`, `src/pages/QuotesListPage.tsx`, `src/components/quotes/QuotesConfigurableList.tsx`.

Migração necessária: cron job para `quote-followup-reminders` (1x/dia) + verificação que `orders.quote_id` já existe (memória confirma que sim). Após aprovação executo os 8 itens sequencialmente até o build TS limpo final.
