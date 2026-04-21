

# Plano — Testes de foco visível (focus ring) via Tab no MagicUpVariationComparator

Adiciono 3 testes ao `describe("MagicUpVariationComparator focus-visible classes")` em `tests/components/magic-up-onda5.test.tsx` validando que as classes `focus-visible:*` (foco visível WCAG 2.4.7) estão presentes e ativadas durante navegação real por Tab nos cards de seleção e nos botões "Marcar vencedora".

## Justificativa

Cobertura atual valida estaticamente as classes Tailwind, mas não valida que:
- O **foco efetivo** chega aos elementos via Tab na ordem natural (cards → marcar vencedora intercalados)
- O atributo `data-focus-visible` (ou pseudo-classe `:focus-visible` via JSDOM) é ativado por **teclado**, não por mouse — distinção crítica de WCAG 2.4.7
- Os elementos focados expõem `outline` removido + `ring` aplicado conforme classes `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — 3 testes novos no `describe("MagicUpVariationComparator focus-visible classes")` (já existente).

## Testes a adicionar

### Teste 1 — Tab atravessa cards e botões "Marcar" na ordem do DOM, foco visível em cada parada

Valida que pressionando Tab repetidamente partindo do `body`, o foco percorre: card1 → marcar1 → card2 → marcar2 → card3 → marcar3, e que cada elemento focado tem as classes `focus-visible:ring-2` + `focus-visible:ring-ring` no `className`.

```ts
it("Tab atravessa cards e botões 'Marcar vencedora' alternadamente; cada parada tem classes focus-visible:ring-2", async () => {
  const user = userEvent.setup();
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
  ];
  render(<MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);

  const expectedOrder = [
    { name: /Selecionar variação 1/ },
    { name: "Marcar variação 1 como vencedora" },
    { name: /Selecionar variação 2/ },
    { name: "Marcar variação 2 como vencedora" },
    { name: /Selecionar variação 3/ },
    { name: "Marcar variação 3 como vencedora" },
  ];

  for (const matcher of expectedOrder) {
    await user.tab();
    const focused = screen.getByRole("button", matcher);
    expect(focused).toHaveFocus();
    expect(focused.className).toContain("focus-visible:ring-2");
    expect(focused.className).toContain("focus-visible:ring-ring");
  }
});
```

### Teste 2 — Cards de seleção têm `focus-visible:outline-none` (sem outline default sobreposto ao ring)

Valida que cada card de seleção tem `focus-visible:outline-none` para evitar duplicação visual com o ring; complemento do contrato de foco visível.

```ts
it("cards de seleção aplicam focus-visible:outline-none para evitar outline duplicado sobre o ring", async () => {
  const user = userEvent.setup();
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
  ];
  render(<MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);

  const cards = screen.getAllByRole("button", { name: /Selecionar variação \d+/ });
  for (const card of cards) {
    expect(card.className).toContain("focus-visible:outline-none");
  }

  // Foco real via Tab confirma que o card é focável e mantém as classes
  await user.tab();
  expect(cards[0]).toHaveFocus();
});
```

### Teste 3 — Botões "Marcar vencedora" têm `focus-visible:ring-2` + `ring-offset` para contraste sobre o card

Valida o conjunto completo de classes de foco do botão de ação: `ring-2`, `ring-ring`, `ring-offset-2`, `ring-offset-background` — necessário porque o botão fica dentro de um card colorido e precisa offset para contraste WCAG 1.4.11.

```ts
it("botões 'Marcar vencedora' aplicam focus-visible:ring-2 + ring-offset-2 + ring-offset-background para contraste sobre o card", async () => {
  const user = userEvent.setup();
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
  ];
  render(<MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);

  const marcarBtns = screen.getAllByRole("button", { name: /^Marcar variação \d+ como vencedora$/ });
  for (const btn of marcarBtns) {
    expect(btn.className).toContain("focus-visible:ring-2");
    expect(btn.className).toContain("focus-visible:ring-ring");
    expect(btn.className).toContain("focus-visible:ring-offset-2");
    expect(btn.className).toContain("focus-visible:ring-offset-background");
  }

  // Tab até o primeiro botão "Marcar" (passa por card1 primeiro)
  await user.tab(); // card1
  await user.tab(); // marcar1
  expect(marcarBtns[0]).toHaveFocus();
});
```

## Estratégia

- **Loop sobre `expectedOrder` com `user.tab()`** valida ordem real do DOM sem hardcodar índices
- **`focused.className.toContain(...)`** trava presença das classes Tailwind no elemento focado (JSDOM não computa `:focus-visible` real, mas a presença das classes garante que o browser aplicará o estilo)
- **`expect(focused).toHaveFocus()`** confirma que o elemento é alcançável por Tab (não está com `tabindex="-1"` ou `disabled`)
- **Asserts separados para cards vs botões "Marcar"** isolam contratos diferentes: cards usam `outline-none + ring-2`, botões usam `ring-2 + ring-offset` (dois padrões visuais distintos)

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx` (classes já existem)
- Sem novos mocks ou imports
- 3 testes novos (46 → 49 testes)

## Entregável

- 3 testes novos em `tests/components/magic-up-onda5.test.tsx`
- Trava contrato WCAG 2.4.7 (Focus Visible): toda parada de Tab no comparador tem classes de foco visível corretas
- Trava contrato WCAG 1.4.11 (Non-text Contrast): botões "Marcar vencedora" preservam `ring-offset` para contraste sobre o card
- Trava ordem natural de tabulação: cards e botões "Marcar" alternados, sem trap nem skip

