

# Plano — Navegação por teclado ArrowLeft/ArrowRight nos dots de paginação do `MagicUpResultPanel`

Adiciono handler `onKeyDown` nos dots de paginação para suportar navegação por setas conforme APG Tabs Pattern, espelhando o padrão já implementado no `MagicUpVariationComparator`. Enter/Space já funcionam nativamente em `<button>`, então o foco aqui é nas setas + Home/End.

## Justificativa

Os dots de paginação no `MagicUpResultPanel` já têm `role="tab"` dentro de `role="tablist"`, mas faltam handlers de seta — exigência do WAI-ARIA APG para tablists. O `MagicUpVariationComparator` já implementa esse padrão (ArrowLeft/Right/Up/Down + Home/End com `preventDefault` + foco programático no próximo tab). Replicamos a mesma lógica nos dots e nas thumbnails do `MagicUpResultPanel`.

## Arquivos alterados

1. **`src/pages/magic-up/MagicUpResultPanel.tsx`** — adiciona refs e handler de teclado nos dots e thumbnails
2. **`tests/components/magic-up-result-panel-keyboard.test.tsx`** — nova sub-suíte validando navegação por setas

## Mudanças no componente

### Refs e helper

No topo do componente:

```tsx
const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

const handleArrowKey = (
  e: React.KeyboardEvent<HTMLButtonElement>,
  currentIndex: number,
  refs: React.MutableRefObject<(HTMLButtonElement | null)[]>
) => {
  const total = m.variations.length;
  let nextIndex: number | null = null;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIndex = (currentIndex + 1) % total;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") nextIndex = (currentIndex - 1 + total) % total;
  else if (e.key === "Home") nextIndex = 0;
  else if (e.key === "End") nextIndex = total - 1;
  if (nextIndex === null) return;
  e.preventDefault();
  m.setActiveVariation(nextIndex);
  refs.current[nextIndex]?.focus();
};
```

### Aplicação nos dots e thumbnails

Adiciona `ref` e `onKeyDown` em cada `<button>` de dot e thumbnail:
- `ref={(el) => { dotRefs.current[i] = el; }}` (e equivalente para thumbs)
- `onKeyDown={(e) => handleArrowKey(e, i, dotRefs)}` (e `thumbRefs`)
- Adiciona `aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"` em ambos

**Wrap permitido aqui (ArrowRight no último → primeiro)** — APG Tabs Pattern padrão. Não conflita com a sub-suíte de boundaries existente (que valida apenas comportamento de **prev/next buttons** e ativação por click/Enter, não setas).

## Mudanças nos testes

### Nova sub-suíte: `MagicUpResultPanel — navegação por setas nos dots e thumbnails`

~10 testes:

1. **ArrowRight em dot[0] move foco para dot[1] e chama `setActiveVariation(1)`**
2. **ArrowLeft em dot[1] move foco para dot[0] e chama `setActiveVariation(0)`**
3. **ArrowRight em dot[last] faz wrap para dot[0]** (ciclo APG)
4. **ArrowLeft em dot[0] faz wrap para dot[last]** (ciclo APG)
5. **Home em dot[2] move foco para dot[0]**
6. **End em dot[0] move foco para dot[last]**
7. **ArrowDown e ArrowUp funcionam idênticos a ArrowRight/Left** (suporte a navegação vertical)
8. **`preventDefault` é chamado** — setas não causam scroll da página
9. **Mesma navegação por setas funciona em thumbnails** (3 asserções: ArrowRight, ArrowLeft, Home/End)
10. **Atributo `aria-keyshortcuts` presente em dots e thumbnails**

### Estratégia técnica dos testes

- Usa `fireEvent.keyDown(el, { key: "ArrowRight" })` — handler dispara `setActiveVariation` (mock) + `.focus()` no próximo elemento via `refs.current[nextIndex]?.focus()`
- Como `buildStubState` usa mock e não atualiza state, foco é validado via `document.activeElement === getDots()[nextIndex]` (refs são populadas no render inicial)
- `preventDefault` validado via spy: `const event = createEvent.keyDown(el, { key: "ArrowRight" }); fireEvent(el, event); expect(event.defaultPrevented).toBe(true);`

## Restrições

- Sem alterar `useMagicUpState`, snapshots, outros testes ou helpers existentes
- Sem alterar `MagicUpVariationComparator` (já implementa esse padrão corretamente)
- Mantém os 48 testes existentes intactos
- Foco visível continua garantido pelas classes `focus-visible:*` já presentes (cobertas por sub-suíte anterior)
- Cobertura WCAG: 2.1.1 (Keyboard), 2.4.3 (Focus Order), 2.4.7 (Focus Visible) + APG Tabs Pattern (roving tabindex + setas)

## Entregável

- Handler `handleArrowKey` reutilizável em `MagicUpResultPanel.tsx` aplicado em dots + thumbnails
- 2 refs (`dotRefs`, `thumbRefs`) para foco programático
- Atributo `aria-keyshortcuts` em todos os dots e thumbnails
- Nova sub-suíte com ~10 testes em `tests/components/magic-up-result-panel-keyboard.test.tsx`
- Cobertura final: 48 → 58 testes no arquivo
- Conformidade WAI-ARIA APG Tabs Pattern completa (roving tabindex + setas + Enter/Space + Home/End)

