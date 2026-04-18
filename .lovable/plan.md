

## Remoção total da funcionalidade "Agenda Comercial" + sistema de Follow-up Reminders

Outro sistema externo cobrirá essa função. Removo de **front, back e docs**, mantendo apenas o estritamente necessário (tabela permanece no banco para não criar migration de DROP — fica órfã sem UI/edge consumindo).

### Frontend (deletar arquivos)
- `src/pages/CommercialAgendaPage.tsx`
- `src/hooks/useCommercialAgenda.ts`
- `src/hooks/useFollowUpReminders.ts`
- `src/components/quotes/FollowUpRemindersPanel.tsx`
- `src/lib/validations/reminderSchema.ts`

### Frontend (editar)
- `src/App.tsx` — remover `lazyWithRetry` import + rota `/agenda`.
- `src/components/layout/SidebarReorganized.tsx` — remover item `{ icon: CalendarDays, label: "Agenda", href: "/agenda" }`.
- `src/lib/validations/index.ts` — remover exports `followUpReminderSchema` / `FollowUpReminderFormData`.
- `src/pages/QuoteDetailPage.tsx` — remover import + `<TabsTrigger value="reminders">` + `<TabsContent value="reminders">` + `<FollowUpRemindersPanel>`.
- `src/components/search/useGlobalSearch.ts` — remover bloco `wants("reminder")` que consulta `follow_up_reminders` (linhas ~410-…).

### Backend / Edge Functions (deletar)
- `supabase/functions/detect-stalled-quotes/` — pasta inteira (não há cron pg_cron referenciando).
- `supabase/functions/cleanup-notifications/` — **manter** (não relacionado).
- `supabase/functions/send-transactional-email/index.ts` — remover branch `case "follow_up_reminder"` e o literal do union type `EmailRequest.event_type`.
- `supabase/functions/expert-chat/index.ts` — remover interface `FollowUpData`, query em `follow_up_reminders`, variável `pendingFollowUps`, e linhas do prompt que referenciam follow-ups (~705-717 + ~812).

Após deletar pastas, chamar `supabase--delete_edge_functions(["detect-stalled-quotes"])` para remover do deploy.

### Documentação
- `docs/EDGE_FUNCTIONS.md` — remover linha de `detect-stalled-quotes`.
- `docs/DATA_DICTIONARY.md` — remover linha `follow_up_reminders`.
- `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` — remover seção "📅 12. LEMBRETES E FOLLOW-UP" e referência em "Notificações e Lembretes".
- `.lovable/memory/infrastructure/hardening-roadmap.md` — adicionar nota da remoção (Onda 6 / patch).

### Não tocar
- Migrations SQL existentes da tabela `follow_up_reminders` (histórico imutável; tabela fica sem consumidores).
- `src/integrations/supabase/types.ts` (auto-gerado).
- Categorias/regex contendo a palavra "agenda" como categoria de produto (Agendas executivas) — não é a feature.

### Resultado
- Menu lateral sem "Agenda".
- Rota `/agenda` deixa de existir (404).
- Tela de detalhe de orçamento perde aba "Lembretes".
- Edge function `detect-stalled-quotes` removida; `expert-chat` e `send-transactional-email` deixam de processar follow-ups.
- Busca global deixa de retornar lembretes.
- Documentação consistente.

