
User wants autonomous execution of "all listed improvements" but no list was provided in this message. Need to check chat history for the pending improvements list, OR assume they refer to the Kit Maker biblioteca that was just delivered + remaining 10/10 polish.

Looking at recent context: just finished Kit Library implementation. The user preference says "execute autonomously, one at a time, no pauses". They likely want continuous Kit Maker polish to reach 10/10.

Since no explicit list exists in current window, I'll propose a focused 10/10 roadmap for the new Kit Library + Kit Maker identity feature (the most recent delivery), executing each sequentially without further questions.

# Plano: Kit Library 10/10 — Polimento Sequencial Autônomo

Executarei as melhorias abaixo **uma de cada vez**, sem pausas, até concluir todas:

## Onda 1 — Funcionalidade essencial faltante
1. **Carregar identidade ao abrir kit existente** — `loadKit()` em `useKitBuilder` precisa popular `identity` (cor/ícone/tag/descrição/favorito) a partir do banco. Hoje só carrega box/items/personalization.
2. **Tipar `custom_kits.color/icon/tag/...`** corretamente nos selects e remover `as unknown as` da `KitLibraryPage` (criar helper tipado).

## Onda 2 — UX da Biblioteca
3. **Filtros visuais** na Biblioteca: chips por tag e por cor (derivados dos kits do usuário), além da busca textual.
4. **Ordenação**: dropdown "Mais recentes / Maior valor / Nome A-Z / Mais usados (templates)".
5. **Skeleton cards** durante carregamento (substituir spinner por 8 skeletons no padrão `loading-and-skeleton-standard`).
6. **Contador de itens correto**: hoje soma `quantity` mas alguns templates podem ter items com estrutura diferente — normalizar.

## Onda 3 — Identidade visual aplicada no Kit Maker
7. **Header do Kit Builder reflete a identidade**: stripe colorida no topo + ícone ao lado do nome do kit (não só no popover).
8. **Card "Meus Kits" no /montar-kit**: botão "Abrir biblioteca" no header levando direto à aba certa.

## Onda 4 — Templates avançados
9. **Painel Admin de Templates** (`/admin/kit-templates`): CRUD de `kit_templates` para administradores popularem o banco com kits reais (box+items+personalização) — protegido por `AdminRoute`.
10. **Badge "Popular"** em templates com `usage_count >= 5`.
11. **Preview rico** do template antes de clonar (modal mostrando itens, caixa, preço).

## Onda 5 — Polimento final 10/10
12. **Animações** `animate-fade-in` escalonadas nos grids da biblioteca.
13. **Empty states ilustrados** com CTA secundário (ex: "Ver templates sugeridos" no estado vazio de Meus Kits).
14. **PageSEO** com OG image e descrição SEO-friendly.
15. **Memory update**: registrar `mem://features/kit-library-system` documentando a arquitetura dos 2 bancos.
16. **Validação final**: TS check + lint + smoke test mental do fluxo completo (criar → salvar com identidade → reabrir → clonar template → favoritar → excluir).

## Arquivos esperados
- **Modificar**: `useKitBuilder.ts`, `useCustomKitPersistence.ts`, `KitLibraryPage.tsx`, `KitBuilderHeader.tsx`, `KitCard.tsx`, `App.tsx`.
- **Criar**: `src/pages/admin/KitTemplatesAdminPage.tsx`, `src/hooks/useAdminKitTemplates.ts`, `src/components/kit-library/KitLibraryFilters.tsx`, `src/components/kit-library/KitTemplatePreviewDialog.tsx`, `src/components/kit-library/KitCardSkeleton.tsx`, memória.

Após aprovação, executo as 16 melhorias sequencialmente sem novas perguntas até o build TS limpo final.
