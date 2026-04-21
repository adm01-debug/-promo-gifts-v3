

# Plano — Testes de reflexo no DOM da mudança de `winnerIndex` para leitores de tela

Adiciono testes ao `tests/components/magic-up-onda5.test.tsx` que validam que mudanças no estado de "vencedora" (derivada de `isWinner` explícito ou do maior score) atualizam corretamente os elementos lidos por screen readers — `aria-label` do botão de seleção (sufixo `, melhor score`), `aria-label` da Badge interna (`"Melhor score"`) e `aria-label` do badge de resumo no header (`"Melhor score entre variações: N"`).

## Justificativa

Cobertura existente:
- Badge "Melhor score" migra após `onSelectWinner` + rerender com `isWinner: true` (cardinalidade preservada)
- ARIA `aria-pressed`/`aria-current` acompanham `activeIndex`
- Foco DOM segue `activeIndex` após setas

Lacuna específica para acessibilidade assistiva:
1. **Sufixo `", melhor score"`** no `aria-label` do `<button>` de seleção é o que o leitor de tela anuncia ("Selecionar variação 2, score 90, melhor score") — nenhum teste valida que esse sufixo é **adicionado e removido** dinamicamente quando `winnerIndex` muda
2. **Badge interna** (`<Badge aria-label="Melhor score">`) deve aparecer/desaparecer junto com o card vencedor e ter cardinalidade exata = 1
3. **Badge de header** (`aria-label="Melhor score entre variações: N"`) deve refletir o **score numérico do vencedor atual**, não apenas o maior score absoluto, quando `isWinner` explícito sobrepõe a heurística
4. **Transição empate → winner explícito**: quando dois cards têm scores iguais e um recebe `isWinner: true`, o sufixo deve ir para o explícito; ao remover `isWinner`, deve voltar para o de menor índice (comportamento de `findIndex`)

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **3 testes** ao final do sub-describe `"ativação por Enter/Espaço nos botões"` (mesmo bloco onde vivem os testes de teclado/foco/destaque), reusando `navVariations`.

---

**Teste 1 — Sufixo `", melhor score"` no aria-label do botão migra com winner**

```ts
it("aria-label do botão de seleção ganha/perde sufixo ', melhor score' conforme winnerIndex muda", () => {
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();
  const renderWith = (variations: VariationItem[]) => (
    <MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );

  // Estado 1: sem isWinner explícito → vencedor = maior score (var-3, idx 2, score 90)
  const { rerender } = render(renderWith(navVariations));
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ }).getAttribute("aria-label"))
    .not.toContain("melhor score");
  expect(screen.getByRole("button", { name: /^Selecionar variação 2/ }).getAttribute("aria-label"))
    .not.toContain("melhor score");
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ }).getAttribute("aria-label"))
    .toContain(", melhor score");

  // Estado 2: marca var-1 como isWinner explícito → sufixo migra
  rerender(renderWith([
    { ...navVariations[0], isWinner: true },
    navVariations[1],
    navVariations[2],
  ]));
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ }).getAttribute("aria-label"))
    .toContain(", melhor score");
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ }).getAttribute("aria-label"))
    .not.toContain("melhor score");

  // Estado 3: remove isWinner → sufixo volta para var-3 (maior score)
  rerender(renderWith(navVariations));
  expect(screen.getByRole("button", { name: /^Selecionar variação 1/ }).getAttribute("aria-label"))
    .not.toContain("melhor score");
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ }).getAttribute("aria-label"))
    .toContain(", melhor score");
});
```

---

**Teste 2 — Badge interna `aria-label="Melhor score"` tem cardinalidade exata = 1 e migra**

```ts
it("badge interna 'Melhor score' aparece exatamente uma vez no DOM e migra para o card winner correto", () => {
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();
  const renderWith = (variations: VariationItem[]) => (
    <MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );

  const { rerender } = render(renderWith(navVariations));

  // Cardinalidade inicial: exatamente 1 badge "Melhor score"
  expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);

  // Badge está dentro do botão de var-3 (winner por score)
  const winnerBadge1 = screen.getByLabelText("Melhor score");
  const winnerBtn1 = screen.getByRole("button", { name: /^Selecionar variação 3/ });
  expect(winnerBtn1.contains(winnerBadge1)).toBe(true);

  // Migra para var-1 com isWinner explícito
  rerender(renderWith([
    { ...navVariations[0], isWinner: true },
    navVariations[1],
    navVariations[2],
  ]));
  expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
  const winnerBadge2 = screen.getByLabelText("Melhor score");
  const winnerBtn2 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  expect(winnerBtn2.contains(winnerBadge2)).toBe(true);

  // Migra para var-2 com isWinner explícito (substitui var-1)
  rerender(renderWith([
    navVariations[0],
    { ...navVariations[1], isWinner: true },
    navVariations[2],
  ]));
  expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
  const winnerBadge3 = screen.getByLabelText("Melhor score");
  const winnerBtn3 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  expect(winnerBtn3.contains(winnerBadge3)).toBe(true);
});
```

---

**Teste 3 — Header badge `aria-label="Melhor score entre variações: N"` reflete o maior score numérico**

```ts
it("badge de header anuncia o maior score numérico via aria-label e atualiza após mudanças de variations", () => {
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();
  const renderWith = (variations: VariationItem[]) => (
    <MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={onSelect} onSelectWinner={onSelectWinner} />
  );

  // Estado 1: scores 80/70/90 → header anuncia 90
  const { rerender } = render(renderWith(navVariations));
  expect(screen.getByLabelText("Melhor score entre variações: 90")).toBeInTheDocument();

  // Estado 2: scores 50/60/40 → header anuncia 60
  rerender(renderWith([
    { ...navVariations[0], qualityScore: 50 },
    { ...navVariations[1], qualityScore: 60 },
    { ...navVariations[2], qualityScore: 40 },
  ]));
  expect(screen.getByLabelText("Melhor score entre variações: 60")).toBeInTheDocument();
  expect(screen.queryByLabelText("Melhor score entre variações: 90")).not.toBeInTheDocument();

  // Estado 3: todos sem score (qualityScore undefined e sem qualityDiagnosis) → header anuncia "indisponível"
  rerender(renderWith([
    { id: "var-1", imageUrl: "https://example.com/1.png" } as VariationItem,
    { id: "var-2", imageUrl: "https://example.com/2.png" } as VariationItem,
  ]));
  expect(screen.getByLabelText("Melhor score entre variações: indisponível")).toBeInTheDocument();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `rerender`, `screen`, `vi`, `VariationItem`, `MagicUpVariationComparator`, `navVariations`)
- 3 testes novos (90 → 93 testes)
- Testes 1 e 2 não usam `userEvent` (apenas `rerender` simulando mudança externa de estado)
- Queries por `aria-label` exato/regex seguem padrão estabelecido
- Teste 3 cobre o branch `bestScore !== null ? bestScore : "indisponível"` da linha 49 do componente (label da Badge do header)

## Entregável

- 3 testes cobrindo a perspectiva de **leitor de tela** sobre mudanças de winner:
  1. Sufixo `", melhor score"` no `aria-label` do botão de seleção é adicionado/removido dinamicamente conforme `isWinner` explícito ou heurística de maior score
  2. Badge interna `<Badge aria-label="Melhor score">` mantém cardinalidade exata = 1 e está sempre dentro do `<button>` correto (verificado via `winnerBtn.contains(badge)`)
  3. Badge de header com `aria-label="Melhor score entre variações: N"` reflete o maior score numérico real e cai para `"indisponível"` quando nenhuma variação tem score
- Captura regressões onde:
  - Sufixo `", melhor score"` fosse aplicado ao card errado (ex: trocar `index === winnerIndex` por outra condição)
  - Badge interna duplicasse (regressão da `findIndex` para algo como `forEach`)
  - Badge de header anunciasse `0` em vez de `"indisponível"` para `bestScore === null`
  - Sufixo persistisse após remoção de `isWinner` (cache stale)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 93/93 verde

