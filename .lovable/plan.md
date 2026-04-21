

# Plano — Testes de Shift+Tab navega ordem inversa entre cards e botões "Marcar vencedora" com focus-visible correto

Adiciono **1 teste** ao final do sub-describe `"navegação por setas/Home/End"` em `tests/components/magic-up-onda5.test.tsx`, validando que **Shift+Tab** percorre os elementos focáveis (cards de seleção + botões "Marcar vencedora") na ordem inversa do DOM, e que cada parada exibe as classes `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` exigidas pelo guideline `docs/MAGIC_UP_ONDA5_A11Y.md`.

## Justificativa

Cobertura atual valida Tab forward (ordem natural) e classes focus-visible em cards isolados. Mas **não há teste** que afirme:

| Lacuna | Risco |
|---|---|
| Shift+Tab a partir do último elemento focável volta na ordem inversa exata | Refator que mude `tabIndex` em qualquer card ou botão "vencedora" inverteria/quebraria a ordem silenciosamente |
| Cada parada do Shift+Tab tem as 4 classes `focus-visible:*` obrigatórias | Remoção acidental de `focus-visible:ring-offset-background` em refator visual passaria sem detecção |
| Ordem reversa intercala cards e botões "vencedora" coerentemente (não pula nenhum) | Se botão vencedora ganhar `tabIndex={-1}`, Shift+Tab pula card→card sem passar pela ação |
| `focus-visible` não é confundido com `:focus` (mouse vs teclado) | Classes `focus:` sem `-visible` quebrariam contraste WCAG 2.4.7 |

**WCAG 2.4.3 (Focus Order)** + **2.4.7 (Focus Visible)**: ordem reversa via Shift+Tab deve ser previsível e cada parada deve ter indicador visível. Teste declarativo trava ambos contratos juntos.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **1 teste** ao final do sub-describe `"navegação por setas/Home/End"` (após o teste `"aria-pressed permanece exclusivo..."`, antes do `});` que fecha o sub-describe):

```ts
it("Shift+Tab navega na ordem inversa entre cards e botões 'Marcar vencedora' mantendo focus-visible", async () => {
  const user = userEvent.setup();

  render(
    <MagicUpVariationComparator
      variations={navVariations}
      activeIndex={0}
      onSelect={vi.fn()}
      onSelectWinner={vi.fn()}
    />
  );

  const REQUIRED_FOCUS_CLASSES = [
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-ring",
    "focus-visible:ring-offset-2",
    "focus-visible:ring-offset-background",
  ];

  // Coleta ordem natural do DOM (forward Tab order)
  const allFocusables = [
    ...screen.getAllByRole("button", { name: /^Selecionar variação/ }),
    ...screen.getAllByRole("button", { name: /vencedora/i }),
  ].sort((a, b) => {
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  expect(allFocusables.length).toBeGreaterThanOrEqual(2);

  // Foca o último elemento da ordem natural
  const last = allFocusables[allFocusables.length - 1];
  last.focus();
  expect(last).toHaveFocus();

  // Valida focus-visible no último
  REQUIRED_FOCUS_CLASSES.forEach((cls) => {
    expect(last.className).toContain(cls);
  });

  // Shift+Tab percorre do penúltimo até o primeiro, validando ordem e classes
  for (let i = allFocusables.length - 2; i >= 0; i--) {
    await user.tab({ shift: true });
    const expected = allFocusables[i];
    expect(expected).toHaveFocus();

    // Cada parada deve ter as 5 classes focus-visible obrigatórias
    REQUIRED_FOCUS_CLASSES.forEach((cls) => {
      expect(expected.className).toContain(cls);
    });

    // Garante que NENHUMA classe `focus:` (sem -visible) está sozinha quebrando contraste
    expect(expected.className).not.toMatch(/(?<!focus-visible:)focus:ring-/);
  }

  // Sanity: Shift+Tab a partir do primeiro deveria sair do componente (não loop)
  // Não validamos foco fora do componente, apenas que o primeiro elemento foi alcançado
  expect(allFocusables[0]).toHaveFocus();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `screen`, `userEvent`, `vi`, `navVariations`, `MagicUpVariationComparator`)
- 1 teste novo (120 → 121 testes)
- Helper `compareDocumentPosition` garante ordem real do DOM (não depende de `getAllByRole` retornar em ordem)
- Loop de Shift+Tab cobre **todas** as paradas (cards + botões vencedora intercalados)
- Asserção de classes em **cada parada** — não só na primeira/última
- Negative lookbehind `(?<!focus-visible:)focus:ring-` garante que classes `focus:` puras não substituam `focus-visible:` (regressão silenciosa de WCAG 2.4.7)

## Entregável

- 1 teste cobrindo:
  1. **Ordem reversa Shift+Tab**: percorre todos os focáveis (cards + botões vencedora) do último ao primeiro respeitando ordem do DOM
  2. **Classes focus-visible obrigatórias**: 5 classes (`outline-none`, `ring-2`, `ring-ring`, `ring-offset-2`, `ring-offset-background`) em cada parada
  3. **Sem regressão para `focus:` puro**: regex bloqueia `focus:ring-*` sem prefixo `focus-visible:`
  4. **Cobertura intercalada**: cards e botões "vencedora" no mesmo ciclo, garantindo que nenhum tipo é pulado
- Captura regressões onde:
  - `tabIndex={-1}` em cards ou botões vencedora pule paradas no Shift+Tab
  - Refator troque `focus-visible:ring-2` por `focus:ring-2` (quebra navegação por mouse com indicador residual)
  - Remoção de `focus-visible:ring-offset-background` reduza contraste do anel
  - Reordenação de DOM mude foco lógico sem refletir nos testes
- Sem impacto nos 120 testes existentes: novo teste é isolado (instância própria, sem mocks compartilhados)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 121/121 verde

