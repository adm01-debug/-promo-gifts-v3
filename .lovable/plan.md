
The previous Kit Library 10/10 roadmap was just completed (16 melhorias entregues). Sem nova lista explícita, proponho a próxima onda — **Kit Library 11/10: Dados reais + UX avançada** — para continuar a evolução autônoma rumo à perfeição.

# Plano: Kit Library — Onda Pós-10/10 (Dados Reais + UX Avançada)

Executarei tudo sequencialmente, sem pausas, até o build TS limpo final.

## Onda A — Templates com dados reais (gap crítico)
1. **Admin: snapshot do kit atual como template** — botão no Kit Builder "Salvar como template do sistema" (admin only) que captura `box_data + items_data + personalization_data + total_price` do estado atual e cria/atualiza um `kit_templates`.
2. **Admin: editor de template carrega kit completo** — no `/admin/kit-templates`, botão "Editar conteúdo" abre o template no Kit Builder em modo template (URL `?template=ID`); ao salvar, persiste de volta em `kit_templates`, não em `custom_kits`.
3. **Clone real funcional** — `cloneTemplate` já copia JSONB; validar que o kit clonado abre corretamente no Builder com box+items+personalização restaurados (smoke test mental + ajuste se faltar campo).

## Onda B — Identidade visual end-to-end
4. **Identidade no PDF do kit** — header do PDF exportado mostra cor + ícone + tag do kit (hoje é genérico).
5. **Identidade no Orçamento** — quando "Criar Orçamento" é acionado, levar `color/tag/icon` para um campo `kit_metadata` no quote item para futura referência visual.
6. **Identidade no compartilhamento WhatsApp** — incluir tag no texto (`*Kit VIP — Cliente Premium*`).

## Onda C — Biblioteca: descoberta e produtividade
7. **"Usado recentemente"** — ordenar Meus Kits por `last_used_at` (novo campo); incrementar quando o kit é aberto via `/montar-kit?kit=ID`.
8. **Pin/destacar kit** — além de favoritar, permitir "fixar" 1 kit que aparece em destaque no topo de Meus Kits (campo `is_pinned`).
9. **Atalho de teclado** `G + K` para abrir biblioteca de qualquer lugar; documentar em `keyboard-shortcuts-registry`.
10. **Comando rápido no Spotlight** (`Ctrl+K`) — entrada "Ir para biblioteca de kits" + entradas dinâmicas para cada kit favoritado.

## Onda D — Templates inteligentes
11. **Categorias dinâmicas** — chips de categoria na aba Sugeridos (Tecnologia, Bem-estar, Premium, Onboarding, Eco) derivados de `kit_templates.category` distinct.
12. **"Quem usou também usou"** — sob cada template, mostrar 2-3 templates da mesma categoria.
13. **Métrica de adoção visível só p/ admin** — badge com `usage_count` no card de template quando `has_role(uid,'admin')`.

## Onda E — Polimento técnico
14. **Tipagem `CustomKitRow` exportada** + remover `as never` no insert de `KitLibraryPage` (criar helper `buildCustomKitInsert`).
15. **Realtime opcional** — subscrever `custom_kits` (canal `user:<uid>:custom-kits`) para refletir mudanças cross-tab; fallback no polling atual.
16. **Validação final** — TS check + smoke mental: criar template (admin) → vendedor clona → edita identidade → fixa → orçamento sai com tag → admin vê adoção subir.

## Arquivos esperados
- **Migrações**: 1 (`custom_kits.last_used_at timestamptz`, `custom_kits.is_pinned boolean default false`).
- **Modificar**: `KitBuilderPage.tsx`, `KitBuilderHeader.tsx`, `KitLibraryPage.tsx`, `useKitTemplates.ts`, `useAdminKitTemplates.ts`, `KitTemplatesAdminPage.tsx`, `useCustomKitPersistence.ts`, `Spotlight.tsx`, kit PDF export, WhatsApp text composer.
- **Criar**: `useTemplateSnapshot.ts`, `KitCategoryChips.tsx`, `RelatedTemplates.tsx`, helper `buildCustomKitInsert.ts`, memória atualizada.
