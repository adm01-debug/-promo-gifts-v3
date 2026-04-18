
A última solicitação ("Reordenar Sidebar") foi entregue. Não há lista pendente explícita. Proponho a próxima onda autônoma focada em fechar gaps reais do módulo de Orçamentos (rota atual `/orcamentos`) e elevar pontos onde ainda há fricção operacional.

# Plano: Orçamentos — Onda Eficiência & Clareza (8 itens)

## Onda A — Lista de Orçamentos (`/orcamentos`)
1. **Filtros rápidos por status** — chips horizontais (Todos, Rascunho, Enviado, Aprovado, Recusado, Expirado) com contador, sticky abaixo do header.
2. **Busca instantânea + ordenação** — input com debounce 250ms (cliente, número, vendedor) + dropdown de ordenação (Mais recentes, Maior valor, Vencendo).
3. **KPIs no topo** — 4 cards compactos (Total no mês, Aprovados, Pipeline aberto, Taxa conversão) com sparkline mini.

## Onda B — Card/linha do orçamento
4. **Indicador "Visualizado pelo cliente"** — badge verde quando `quote_share_tokens.viewed_at` existe; mostra data no tooltip.
5. **Ações rápidas inline** — Duplicar, Compartilhar link, Enviar WhatsApp, Marcar como ganho — sem abrir o orçamento.

## Onda C — Operacional
6. **Bulk actions** — checkbox por linha + barra flutuante (Exportar CSV, Mudar status, Atribuir vendedor).
7. **Empty state contextual** — quando filtro retorna 0, mostra CTA "Limpar filtros" + sugestão "Criar novo orçamento".

## Onda D — Hardening
8. **Skeleton + loading compacto** (mesmo padrão do StockDashboard recém-refinado) + atualizar `mem://features/quote-system-master-spec` com novos filtros/KPIs.

## Arquivos esperados
- **Modificados**: `src/pages/QuotesListPage.tsx` (ou equivalente), `src/components/quotes/QuoteListItem.tsx`, `src/hooks/useQuotes.ts`.
- **Novos**: `src/components/quotes/QuotesFilters.tsx`, `src/components/quotes/QuotesKpis.tsx`, `src/components/quotes/QuoteBulkBar.tsx`.

Sem migrações novas (usa `quote_share_tokens.viewed_at` já existente). Após aprovação executo os 8 itens sequencialmente até o build TS limpo final.
