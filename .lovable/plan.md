
A onda anterior (Inteligência & Colaboração) foi entregue 8/8. Próxima onda autônoma foca em fechar gaps reais: ativar de fato a sugestão IA no Builder, materializar o compartilhamento público + colaboração interna mencionados na memória mas ainda sem código visível, e adicionar guardrails de produção.

# Plano: Kit Maker — Onda Compartilhamento & Hardening (8 itens)

## Onda A — Ativar inteligência já criada
1. **Plug `IdentitySuggestionButton` no `KitBuilderHeader`** — botão visível só quando `identity` está vazia, ao lado do `KitIdentityPicker`; aplica `tag/color/icon` direto no estado.
2. **Integrar `SimilarKitsWidget` na sidebar do Builder** — abaixo do `KitHealthCard`, recebendo SKUs atuais.

## Onda B — Compartilhamento público real
3. **Migração `kit_share_tokens`** — `(id, kit_id, token unique, created_by, expires_at, view_count, status, created_at)` + trigger `generate_secure_token` + `validate_status_fields` (já existe no enum).
4. **RPC `get_kit_by_token(_token)`** SECURITY DEFINER — devolve kit + items mascarando `cost_*`, incrementa `view_count`, valida `expires_at` e `status='active'`.
5. **Hook `useKitShare` + `KitShareLinkDialog`** — gera token via insert, copia URL `/kit/:token`, lista tokens ativos com revogação.
6. **Página pública `/kit/:token` (`PublicKitViewPage`)** — usa edge `kit-public-view` (Zod + rate limit) que chama a RPC; PageSEO dinâmico com cor de identidade; sem custos.

## Onda C — Colaboração interna
7. **Migrações `kit_collaborators` + `kit_comments` + Realtime** — RLS via `is_kit_owner`/`is_kit_collaborator` (funções já existem); painel `KitCollaborationPanel` no sidebar do Builder com lista de comentários em tempo real.

## Onda D — Hardening
8. **Rate limit + Zod nas edges novas** (`kit-public-view`, `kit-identity-suggest`) usando `check_rate_limit`; validação final TS; atualizar `mem://features/kit-library-system` com fluxo público + colaboração.

## Migrações esperadas
- `kit_share_tokens`, `kit_collaborators`, `kit_comments` + RLS + Realtime ADD TABLE.
- RPCs: `get_kit_by_token`, helpers de revoke.

## Arquivos novos esperados
`useKitShare.ts`, `KitShareLinkDialog.tsx`, `PublicKitViewPage.tsx`, `KitCollaborationPanel.tsx`, `useKitComments.ts`, edge `kit-public-view/index.ts`.

## Modificados
`KitBuilderHeader.tsx` (botão IA + share), `KitBuilderPage.tsx` (sidebar widgets + collab panel), `App.tsx` (rota `/kit/:token`), `kit-identity-suggest/index.ts` (Zod + rate limit).

Após aprovação executo os 8 itens sequencialmente sem pausas até o build TS limpo final.
