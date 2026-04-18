
Continuação da Onda pós-10/10 do Kit Library — itens pendentes da sessão anterior. Executarei sequencialmente sem pausas até o build limpo.

# Plano: Kit Library — Finalizar Onda Pós-10/10

## Pendências (8 itens)

1. **Atalho global `G+K`** — adicionar em `useGlobalShortcuts` para abrir `/meus-kits` de qualquer lugar; documentar em `keyboard-shortcuts-registry`.
2. **Spotlight: entradas dinâmicas** — `Ctrl+K` com "Ir para biblioteca de kits" + entradas para cada kit favoritado/fixado do usuário.
3. **Identidade no PDF** — header do `kitPdfGenerator` mostra cor (faixa) + ícone + tag do kit.
4. **`kit_metadata` no orçamento** — `useKitBuilderQuote` envia `{color, icon, tag}` junto ao item criado para referência visual futura.
5. **Botão admin "Salvar como template do sistema"** no `KitBuilderHeader` — usa `useTemplateSnapshot` (já criado), visível só para admin.
6. **Modo `?template=ID` no `KitBuilderPage`** — carrega de `kit_templates`, mostra banner "Editando template do sistema", e ao salvar persiste de volta em `kit_templates` (não em `custom_kits`).
7. **`bumpLastUsed` no load** — `KitBuilderPage` chama `bumpLastUsed(kitId)` quando abre kit existente para alimentar ordenação "Usados recentemente".
8. **Realtime opcional em `custom_kits`** — subscrever canal `user:<uid>:custom-kits` (com fallback no polling) para refletir mudanças cross-tab; invalida query no evento.

## Validação final
- TS check (`tsc --noEmit`).
- Smoke mental: admin cria template via snapshot → vendedor abre `/meus-kits` via `G+K` → clona → edita identidade → fixa → orçamento sai com `kit_metadata` → PDF mostra identidade → admin reabre via `?template=ID` e salva.
- Atualizar memória `mem://features/kit-library-system` com fluxo final.

## Arquivos
- **Modificar**: `useGlobalShortcuts.ts`, `EnhancedSpotlight.tsx` (ou `SpotlightItems.ts`), `kitPdfGenerator.ts`, `useKitBuilderQuote.ts`, `KitBuilderHeader.tsx`, `KitBuilderPage.tsx`.
- **Criar**: `useCustomKitsRealtime.ts` (hook leve de subscribe).
- **Memória**: atualizar `kit-library-system` + `keyboard-shortcuts-registry`.
