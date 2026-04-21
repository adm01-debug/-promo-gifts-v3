

# Plano — Testes de Shift+Tab reverso e Enter/Space consistente

Adiciono 2 testes ao `describe("MagicUpVariationComparator")` em `tests/components/magic-up-onda5.test.tsx` cobrindo: (1) ordem completa de Shift+Tab partindo do último botão até o primeiro, validando travessia reversa simétrica; (2) consistência de Enter e Space disparando os handlers corretos (`onSelect` no card, `onSelectWinner` no botão "Marcar vencedora") em qualquer posição da ordem de tab — incluindo após navegação reversa.

## Justificativa

Os testes atuais cobrem Tab forward completo (6 paradas) e Shift+Tab parcial (2 voltas). Faltam:
- **Travessia reversa completa** partindo do último focável: garante que não há "trap" no fim e que a ordem inversa é simétrica à direta
- **Enter/Space simétricos** em ambos os tipos de botão (card de seleção + marcar vencedora): o teste de teclado anterior valida tab order mas não dispara ativação; outros testes disparam ativação só via `fireEvent.click`

Sem esses testes, refatorações que adicionem `onKeyDown` customizado ou `preventDefault` indevido podem quebrar ativação por teclado sem detecção.

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — 2 testes novos no `describe("MagicUpVariationComparator")`, após o último teste de Tab/disabled.

## Testes a adicionar

### Teste 1 — Shift+Tab reverso completo (último → primeiro)

```ts
it("Shift+Tab navega em ordem reversa completa: marcar-3 → select-3 → marcar-2 → select-2 → marcar-1 → select-1", async () => {
  const user = userEvent.setup();
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
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

  // Foca diretamente no último botão (marcar vencedora 3) para iniciar travessia reversa
  const marcar3 = screen.getByRole("button", { name: "Marcar variação 3 como vencedora" });
  marcar3.focus();
  expect(marcar3).toHaveFocus();

  // Shift+Tab → select-3
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "Selecionar variação 3, score 50" })).toHaveFocus();

  // Shift+Tab → marcar-2
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "Marcar variação 2 como vencedora" })).toHaveFocus();

  // Shift+Tab → select-2
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "Selecionar variação 2, score 70" })).toHaveFocus();

  // Shift+Tab → marcar-1
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).toHaveFocus();

  // Shift+Tab → select-1 (primeiro focável)
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: /Selecionar variação 1, score 90, melhor score/i })).toHaveFocus();

  // Sanity: Tab forward a partir do início devolve para marcar-1 (simetria perfeita)
  await user.tab();
  expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).toHaveFocus();
});
```

### Teste 2 — Enter e Space disparam handlers consistentes em ambos tipos de botão

```ts
it("Enter e Space ativam onSelect (cards) e onSelectWinner (marcar) consistentemente, inclusive após Shift+Tab", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
  ];
  render(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={0}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
    />
  );

  const select1 = screen.getByRole("button", { name: /Selecionar variação 1, score 90/i });
  const marcar1 = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
  const select2 = screen.getByRole("button", { name: "Selecionar variação 2, score 70" });
  const marcar2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });

  // Tab até marcar-2 (último), depois Enter
  await user.tab(); // select-1
  await user.tab(); // marcar-1
  await user.tab(); // select-2
  await user.tab(); // marcar-2
  expect(marcar2).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onSelectWinner).toHaveBeenCalledWith(1);
  expect(onSelectWinner).toHaveBeenCalledTimes(1);

  // Shift+Tab → select-2, depois Space
  await user.tab({ shift: true });
  expect(select2).toHaveFocus();
  await user.keyboard(" ");
  expect(onSelect).toHaveBeenCalledWith(1);
  expect(onSelect).toHaveBeenCalledTimes(1);

  // Shift+Tab → marcar-1, depois Space (consistente com Enter)
  await user.tab({ shift: true });
  expect(marcar1).toHaveFocus();
  await user.keyboard(" ");
  expect(onSelectWinner).toHaveBeenCalledWith(0);
  expect(onSelectWinner).toHaveBeenCalledTimes(2);

  // Shift+Tab → select-1, depois Enter (consistente com Space)
  await user.tab({ shift: true });
  expect(select1).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith(0);
  expect(onSelect).toHaveBeenCalledTimes(2);

  // Sanity final: contagens totais batem com o número de ativações
  expect(onSelect).toHaveBeenCalledTimes(2);
  expect(onSelectWinner).toHaveBeenCalledTimes(2);
});
```

## Estratégia

- **Travessia reversa completa** partindo de `marcar3.focus()` programático garante cobertura simétrica (anteriormente só havia 2 voltas a partir do meio)
- **Sanity Tab forward final** no teste 1 confirma que a ordem é genuinamente bidirecional, não um caso especial do Shift+Tab
- **Matriz Enter/Space × select/marcar (2×2 = 4 combinações)** no teste 2 trava que ambas teclas funcionam em ambos tipos de botão
- **Ativações intercaladas com Shift+Tab** garantem que navegação reversa não deixa estado quebrado para ativação
- **Contagens finais** (`toHaveBeenCalledTimes(2)` em ambos handlers) detectam disparos duplicados ou perdidos

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks ou imports
- 2 testes novos (33 → 35 testes)

## Entregável

- 2 testes novos em `tests/components/magic-up-onda5.test.tsx`
- Trava contrato WCAG 2.1.1 (Keyboard) bidirecional: Tab e Shift+Tab simétricos sem trap
- Trava contrato WCAG 4.1.2 de ativação: Enter e Space funcionam em todos os botões interativos do comparador

