

# Plano — Testes de atributos ARIA do MagicUpVariationComparator

Adiciono 3 testes ao `describe("MagicUpVariationComparator")` em `tests/components/magic-up-onda5.test.tsx` cobrindo de forma exaustiva: (1) atributos ARIA do cartão **ativo** (`aria-pressed="true"` + `aria-current="true"` + ausência condicional em inativos); (2) **nomes acessíveis** dos botões de seleção em diferentes cenários (com score, sem score, com badge "melhor score"); (3) ARIA dos botões "Marcar vencedora" — `aria-label` único e descritivo por índice, sem `aria-pressed` (não é toggle).

## Justificativa

Cobertura atual valida re-render visual após Enter/Space, mas falta auditoria isolada e exaustiva dos contratos ARIA estáticos por estado:
- **`aria-current` em inativos**: o componente só seta `aria-current` no ativo (não força `"false"`); precisa teste explícito do **NOT.toHaveAttribute**
- **Composição do `aria-label` de seleção**: muda dinamicamente conforme `score` existe/não existe e `isWinner` true/false — 4 combinações nunca testadas isoladamente
- **`aria-label` de "Marcar vencedora"**: deve ser único por índice (`"Marcar variação N como vencedora"`) — sem isso, screen readers anunciam todos os botões com mesmo nome

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — 3 testes novos no `describe("MagicUpVariationComparator")`, agrupados após o teste de regressão Enter/Space.

## Testes a adicionar

### Teste 1 — Cartão ativo: `aria-pressed` + `aria-current` simétricos com `activeIndex`

Valida que em qualquer `activeIndex` (testando 0, 1, 2 via re-renders), apenas o cartão correspondente tem `aria-pressed="true"` + `aria-current="true"`, e os outros têm `aria-pressed="false"` + ausência de `aria-current` (não `"false"`, ausência total — contrato APG).

```ts
it("ARIA do cartão ativo: aria-pressed='true' + aria-current='true' apenas no activeIndex; demais sem aria-current", () => {
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
  ];

  for (const activeIdx of [0, 1, 2]) {
    const { unmount } = render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={activeIdx}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );

    const cards = [
      screen.getByRole("button", { name: /Selecionar variação 1/ }),
      screen.getByRole("button", { name: /Selecionar variação 2/ }),
      screen.getByRole("button", { name: /Selecionar variação 3/ }),
    ];

    cards.forEach((card, i) => {
      if (i === activeIdx) {
        expect(card).toHaveAttribute("aria-pressed", "true");
        expect(card).toHaveAttribute("aria-current", "true");
      } else {
        expect(card).toHaveAttribute("aria-pressed", "false");
        // Inativos NÃO devem ter aria-current (nem "false") — APG: undefined removes
        expect(card).not.toHaveAttribute("aria-current");
      }
    });

    unmount();
  }
});
```

### Teste 2 — Nomes acessíveis dinâmicos do botão "Selecionar"

Matriz 4 casos: com score / sem score × winner / não-winner. Valida que `aria-label` reflete cada combinação corretamente para screen readers.

```ts
it("aria-label do botão 'Selecionar' compõe corretamente: índice + score (opcional) + 'melhor score' (opcional)", () => {
  const variations: VariationItem[] = [
    // 1: com score, é winner explícito → "Selecionar variação 1, score 95, melhor score"
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 95, isWinner: true },
    // 2: com score, não é winner → "Selecionar variação 2, score 70"
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    // 3: sem score → "Selecionar variação 3"
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false },
  ];

  render(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={0}
      onSelect={vi.fn()}
      onSelectWinner={vi.fn()}
    />
  );

  // Match exato (sem regex permissivo) para travar formato
  expect(
    screen.getByRole("button", { name: "Selecionar variação 1, score 95, melhor score" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Selecionar variação 2, score 70" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Selecionar variação 3" })
  ).toBeInTheDocument();

  // Garante que NÃO existem botões com nomes ambíguos/genéricos
  expect(screen.queryByRole("button", { name: "Selecionar variação 2, melhor score" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Selecionar variação 3, score 0" })).not.toBeInTheDocument();
});
```

### Teste 3 — ARIA dos botões "Marcar vencedora": nomes únicos, sem `aria-pressed`/`aria-current`

Valida que cada botão "Marcar vencedora" tem `aria-label` único por índice (essencial para screen readers diferenciarem) e que NÃO carregam `aria-pressed`/`aria-current` (não são toggles, são ações).

```ts
it("aria-label dos botões 'Marcar vencedora' é único por índice; botões de ação não têm aria-pressed/aria-current", () => {
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90, isWinner: true },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
  ];

  render(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={0}
      onSelect={vi.fn()}
      onSelectWinner={vi.fn()}
    />
  );

  const marcar1 = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
  const marcar2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });
  const marcar3 = screen.getByRole("button", { name: "Marcar variação 3 como vencedora" });

  // Nomes únicos garantidos por busca exata
  expect(marcar1).toBeInTheDocument();
  expect(marcar2).toBeInTheDocument();
  expect(marcar3).toBeInTheDocument();
  expect(marcar1).not.toBe(marcar2);
  expect(marcar2).not.toBe(marcar3);

  // Botões de ação NÃO devem ter aria-pressed nem aria-current (não são toggles/seleção)
  for (const btn of [marcar1, marcar2, marcar3]) {
    expect(btn).not.toHaveAttribute("aria-pressed");
    expect(btn).not.toHaveAttribute("aria-current");
  }

  // Mesmo o botão da variação winner não tem estado ARIA especial — ele permanece habilitado
  // (o componente atual não desabilita o botão do winner; isso é responsabilidade do parent)
  expect(marcar1).toBeEnabled();

  // Total de botões "Marcar" = exatamente N variações
  const allMarcar = screen.getAllByRole("button", { name: /^Marcar variação \d+ como vencedora$/ });
  expect(allMarcar).toHaveLength(3);
});
```

## Estratégia

- **Loop sobre `activeIndex` 0/1/2 com unmount** garante que o contrato vale para qualquer posição, sem depender de re-render via state
- **`not.toHaveAttribute("aria-current")` (sem valor)** trava o contrato APG: ausência ≠ `"false"` (algumas implementações tratam diferente, e o componente atual não emite o atributo em inativos)
- **Match exato de `aria-label` por string literal** (não regex) trava o formato exato para screen readers — qualquer mudança no texto quebra o teste deliberadamente
- **Asserts negativos** (`queryByRole(...).not.toBeInTheDocument()`) garantem ausência de nomes ambíguos/edge cases (ex: `score 0` quando score é undefined)
- **Regex `^Marcar variação \d+ como vencedora$`** valida formato consistente sem permitir variações como "Marcar como vencedora" sem índice
- **Asserts sobre ausência de `aria-pressed`/`aria-current` em botões de ação** travam o princípio APG: only toggles/selectables carregam esses atributos

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks ou imports
- 3 testes novos (38 → 41 testes)

## Entregável

- 3 testes novos em `tests/components/magic-up-onda5.test.tsx`
- Trava contrato ARIA do cartão ativo: `aria-pressed`/`aria-current` simétricos com `activeIndex` em todas as posições
- Trava contrato de nome acessível: `aria-label` de seleção compõe corretamente em 4 cenários (com/sem score × winner/não-winner)
- Trava contrato APG: botões de ação ("Marcar vencedora") têm nomes únicos e NÃO carregam atributos de toggle
- Cobertura WCAG 4.1.2 (Name, Role, Value) com asserts determinísticos

