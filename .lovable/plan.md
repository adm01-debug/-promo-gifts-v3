

# Plano — Navegação por setas (←/→ e ↑/↓) no MagicUpVariationComparator

Adiciono suporte a navegação por setas entre os cards de variação seguindo o padrão WAI-ARIA APG **Composite Widget / Roving Tabindex** simplificado, e cubro com testes determinísticos.

## Justificativa

Hoje o usuário precisa pressionar Tab repetidamente para alternar entre cards (cada card tem 2 botões: selecionar + marcar vencedora, então atravessar 3 variações exige 6 Tabs). Setas ←/→ (e ↑/↓ para grids responsivos) são o padrão APG para listas/grids selecionáveis e melhoram drasticamente a UX de teclado e leitores de tela.

## Arquivos alterados

1. **`src/components/magic-up/MagicUpVariationComparator.tsx`** — adicionar handler `onKeyDown` no botão "Selecionar" para tratar `ArrowRight`/`ArrowDown` (próximo) e `ArrowLeft`/`ArrowUp` (anterior), com wrap-around. Foco move programaticamente para o novo botão via `ref`.
2. **`tests/components/magic-up-onda5.test.tsx`** — 4 testes novos cobrindo: avanço, retrocesso, wrap-around, e teclas não-seta ignoradas.

## Mudanças no componente

### Comportamento

- **`ArrowRight`** ou **`ArrowDown`**: avança para o próximo card. No último, faz wrap para o primeiro (`(activeIndex + 1) % variations.length`).
- **`ArrowLeft`** ou **`ArrowUp`**: volta ao anterior. No primeiro, faz wrap para o último.
- **`Home`**: vai ao primeiro card.
- **`End`**: vai ao último card.
- Toda navegação por seta:
  1. Chama `onSelect(newIndex)` (atualiza estado no parent)
  2. Move foco programaticamente para o botão "Selecionar" do novo card via `ref` (array de refs)
  3. `event.preventDefault()` para evitar scroll da página
- Outras teclas (Tab, Enter, Space, letras) **não** são interceptadas — comportamento atual preservado.

### Implementação

- Criar `cardRefs = useRef<(HTMLButtonElement | null)[]>([])` no topo do componente.
- Atribuir `ref={(el) => { cardRefs.current[index] = el; }}` em cada botão "Selecionar".
- Após `onSelect(newIndex)`, usar `requestAnimationFrame` ou `setTimeout(0)` para focar o novo botão depois do re-render do parent (alternativa: `useEffect` que observa `activeIndex` — mas como o componente não controla quando focar, melhor focar imediatamente após chamar `onSelect`, confiando que o ref já existe).
- **Decisão**: focar imediatamente via `cardRefs.current[newIndex]?.focus()` dentro do handler — funciona porque o ref já está atribuído ao DOM atual; o re-render do parent virá depois mas o foco persiste no elemento.

### Snippet ilustrativo

```tsx
const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

function handleArrowKey(e: React.KeyboardEvent, currentIndex: number) {
  const total = variations.length;
  let nextIndex: number | null = null;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIndex = (currentIndex + 1) % total;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") nextIndex = (currentIndex - 1 + total) % total;
  else if (e.key === "Home") nextIndex = 0;
  else if (e.key === "End") nextIndex = total - 1;
  if (nextIndex === null) return;
  e.preventDefault();
  onSelect(nextIndex);
  cardRefs.current[nextIndex]?.focus();
}

// no <button> de seleção:
<button
  ref={(el) => { cardRefs.current[index] = el; }}
  onKeyDown={(e) => handleArrowKey(e, index)}
  // ...resto inalterado
>
```

### Atualização de aria-label dos cards

Adicionar dica de navegação no `aria-label` do card ativo: `"Selecionar variação N, score X (use setas para navegar)"`. **Decisão**: NÃO fazer — quebraria os 3 testes ARIA recém-adicionados que travam o formato exato. Em vez disso, adicionar `aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"` no botão "Selecionar" — atributo padrão WAI-ARIA, não muda nome acessível, anuncia atalhos a leitores de tela compatíveis.

## Testes a adicionar

Em `describe("MagicUpVariationComparator")`, novo sub-bloco `describe("navegação por setas (APG composite widget)")`:

### Teste 1 — ArrowRight/ArrowDown avançam e movem foco

```ts
it("ArrowRight e ArrowDown avançam activeIndex e movem foco para o próximo card", async () => {
  const user = userEvent.setup();
  const variations = [/* 3 variações */];
  function Harness() {
    const [active, setActive] = useState(0);
    return <MagicUpVariationComparator variations={variations} activeIndex={active} onSelect={setActive} onSelectWinner={vi.fn()} />;
  }
  render(<Harness />);
  const card1 = screen.getByRole("button", { name: /Selecionar variação 1/ });
  card1.focus();
  await user.keyboard("{ArrowRight}");
  const card2 = screen.getByRole("button", { name: /Selecionar variação 2/ });
  expect(card2).toHaveFocus();
  expect(card2).toHaveAttribute("aria-pressed", "true");
  await user.keyboard("{ArrowDown}");
  const card3 = screen.getByRole("button", { name: /Selecionar variação 3/ });
  expect(card3).toHaveFocus();
  expect(card3).toHaveAttribute("aria-pressed", "true");
});
```

### Teste 2 — ArrowLeft/ArrowUp retrocedem

Análogo ao Teste 1, partindo do índice 2 e voltando até 0.

### Teste 3 — Wrap-around (último → primeiro com →; primeiro → último com ←) + Home/End

```ts
it("ArrowRight no último faz wrap para o primeiro; ArrowLeft no primeiro faz wrap para o último; Home/End funcionam", async () => {
  // ...
  card3.focus();
  await user.keyboard("{ArrowRight}"); // wrap
  expect(card1).toHaveFocus();
  await user.keyboard("{ArrowLeft}"); // wrap reverso
  expect(card3).toHaveFocus();
  await user.keyboard("{Home}");
  expect(card1).toHaveFocus();
  await user.keyboard("{End}");
  expect(card3).toHaveFocus();
});
```

### Teste 4 — Teclas não-seta não interceptam (Tab e letras)

```ts
it("Tab continua funcionando normalmente; teclas alfabéticas não disparam onSelect", async () => {
  const onSelect = vi.fn();
  // render com onSelect mockado
  card1.focus();
  await user.keyboard("a");
  expect(onSelect).not.toHaveBeenCalled();
  await user.keyboard("{Tab}");
  // Foco vai para "Marcar vencedora 1", não pula via setas
  expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).toHaveFocus();
});
```

### Atualização de testes existentes

- Os 3 testes ARIA recém-adicionados continuam válidos (formato de `aria-label` inalterado).
- O teste de estabilidade do DOM continua válido (refs não criam nós novos).
- Total: 41 → 45 testes.

## Restrições

- Sem mudar layout visual nem classes existentes.
- Sem alterar `aria-label` (preserva os 3 testes ARIA novos).
- `aria-keyshortcuts` adicionado é atributo passivo (não afeta `accessible name`).
- Wrap-around é decisão deliberada (padrão APG para listboxes/grids cíclicos).

## Entregável

- `MagicUpVariationComparator.tsx`: handler `onKeyDown` com setas + Home/End + foco programático via refs + `aria-keyshortcuts`.
- `magic-up-onda5.test.tsx`: 4 testes novos (avanço, retrocesso, wrap+Home/End, não-interferência).
- Cobertura WCAG 2.1.1 (Keyboard) avançada via padrão APG composite widget; UX de teclado reduz Tabs necessários de 6 → 0 para alternar entre cards.

