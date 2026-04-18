
A última onda (Compartilhamento & Hardening) foi entregue 8/8. Sem nova lista pendente, proponho a próxima onda autônoma para fechar gaps reais que ainda separam o Kit Maker de um produto polido para clientes finais e equipes.

# Plano: Kit Maker — Onda Cliente-Facing & Operacional (8 itens)

## Onda A — Experiência do cliente no link público
1. **Página pública `/kit/:token` (`PublicKitViewPage`)** — consome edge `kit-public-view` (já existe), renderiza hero com cor da identidade, lista de items sem custo, dados do vendedor + organização, CTA "Solicitar orçamento via WhatsApp". Rota registrada em `App.tsx` fora do `AuthLayout`.
2. **PageSEO + OG dinâmica no link público** — `<title>` = "Kit {nome} – {organização}", `og:image` gerada via canvas com cor de identidade + nome do kit (data URL).
3. **Gerenciar links ativos** — aba "Links" no `KitShareLinkDialog` listando tokens do kit (status, criado em, expira em, visualizado em) com botão revogar via `revokeShareLink`.

## Onda B — Colaboração interna real
4. **Migrações `kit_collaborators` + `kit_comments`** — RLS via `is_kit_owner`/`is_kit_collaborator` (já existem); Realtime ADD TABLE; trigger `validate_status_fields` no comments (resolved/open).
5. **`KitCollaborationPanel` + hook `useKitComments`** — painel sticky no sidebar do Builder: convidar por email, lista de comentários em tempo real (subscribe `postgres_changes`), marcar como resolvido.

## Onda C — Operacional & métricas
6. **Indicador "Visualizado pelo cliente"** — badge verde no `KitCard` quando `kit_share_tokens.viewed_at` existe; tooltip mostra data; query agregada no `useCustomKits`.
7. **Heatmap admin: kits compartilhados vs visualizados** — extensão de `KitTemplatesMetricsPage` com tabela "Conversão de compartilhamentos" (gerados / visualizados / taxa).

## Onda D — Hardening final
8. **`useKitShare` listKitTokens + revokeShareLink batch + Zod no `kit-public-view`** — validação final TS limpa, atualizar `mem://features/kit-library-system` com fluxo cliente-facing completo.

## Migrações esperadas
- `kit_collaborators (id, kit_id, user_id, invited_email, permission, status, invited_by, created_at)`
- `kit_comments (id, kit_id, author_id, body, resolved, resolved_by, resolved_at, created_at, updated_at)`
- RLS + Realtime ADD TABLE em ambas + trigger validação status.

## Arquivos novos esperados
`src/pages/PublicKitViewPage.tsx`, `src/hooks/useKitCollaboration.ts`, `src/components/kit-builder/KitCollaborationPanel.tsx`, helper `src/lib/kit-og-image.ts`.

## Modificados
`App.tsx` (rota `/kit/:token`), `src/components/kit-builder/KitShareLinkDialog.tsx` (aba Links + listKitTokens), `src/hooks/useKitShare.ts` (listKitTokens), `src/pages/KitBuilderPage.tsx` (collab panel), `src/components/kit-library/KitCard.tsx` (badge visualizado), `src/pages/admin/KitTemplatesMetricsPage.tsx` (conversão), `supabase/functions/kit-public-view/index.ts` (já tem Zod, revisar).

Após aprovação executo os 8 itens sequencialmente sem pausas até o build TS limpo final.
