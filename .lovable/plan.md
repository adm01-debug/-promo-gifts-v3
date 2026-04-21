

# Plano — Auditoria de foco visível e contraste de `disabled` na Onda 5

Foco em garantir que **todo elemento interativo** dos componentes Onda 5 (e dos pontos de integração) tenha anel de foco visível e que estados `disabled` mantenham contraste mínimo legível para teclado e baixa visão.

## Escopo

Componentes auditados:
- `MagicUpQualityScore.tsx`
- `MagicUpQualityChecklist.tsx`
- `MagicUpCurationStatus.tsx`
- `MagicUpVariationComparator.tsx`
- `MagicUpResultPanel.tsx` (dots, thumbnails e botões prev/next)
- `FocusModeToggle.tsx` (atalho F — verificar foco do botão e ausência de foco roubado)

Critérios:
1. **Foco visível** — todo `<button>` deve ter `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` (ou variante equivalente do design system). Botões dentro de containers com `overflow-x-auto` precisam de `focus-visible:ring-offset-background` para o anel não ser cortado.
2. **Contraste de `disabled`** — botões desabilitados não podem cair abaixo de 3:1. O default do `Button` aplica `disabled:opacity-50` que, sobre `bg-muted` ou `bg-card`, pode ficar invisível. Onde houver `disabled` em fundo claro, reforçar com `disabled:bg-muted disabled:text-muted-foreground` para preservar contraste.
3. **Estados ativos vs foco** — `aria-pressed` / `aria-current` ativos não devem mascarar o anel de foco (ex.: `MagicUpCurationStatus` usa `variant="default"` que tem `shadow-sm` — confirmar que `focus-visible:ring` se sobrepõe).
4. **Dots de paginação (`MagicUpResultPanel`)** — dots de 8px (`w-2 h-2`) com `focus-visible:ring-2` ficam praticamente invisíveis. Aumentar `ring-offset` e garantir `ring-ring` contrastante; alternativamente, expandir a área de toque com `before:absolute` mantendo o visual.
5. **Botões prev/next** — `disabled` quando no extremo. Hoje usam apenas `disabled:opacity-50` herdado. Adicionar `disabled:bg-muted/50 disabled:text-muted-foreground/70` para manter visibilidade.

## Plano de execução

1. **Audit pass** — `code--view` em cada componente listado, mapear linha a linha:
   - elementos interativos sem `focus-visible:ring-*`
   - `disabled` que dependem só de `opacity-50`
   - dots/checkbox-like minúsculos com anel cortado
2. **Correções cirúrgicas** via `code--line_replace`:
   - adicionar `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` onde faltar
   - reforçar `disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100` em botões críticos (prev/next, "Marcar vencedora", "Reanalisar Magic Score")
   - dots da paginação: trocar `focus-visible:ring-2` por `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background` e elevar `z-index` se necessário
3. **Atualização de testes** em `tests/components/magic-up-onda5.test.tsx`:
   - assert `class*="focus-visible:ring"` em cada botão crítico (sem snapshot — usa `toHaveClass` parcial via `getAttribute('class')` includes)
   - assert que botões `disabled` ainda têm classe de cor de texto (não só opacity)
4. **Re-run** dos 11 testes Onda 5 — manter 11/11 verdes
5. **Relatório final** por componente com: linha original → linha corrigida → critério atendido

## Restrições

- **Sem mudanças visuais perceptíveis** em estado normal — só foco e disabled mudam
- **Sem alteração de comportamento, handlers ou layout**
- **Sem novos tokens** — usa `ring-ring`, `bg-muted`, `text-muted-foreground` já existentes no design system
- **Sem dependência de browser** — validação por código + testes unitários

## Entregável

- Tabela por componente: 🐛 falha → ✅ correção → 🧪 teste cobrindo
- Confirmação 11/11 testes verdes
- Status: "Onda 5 keyboard/contrast compliant"

