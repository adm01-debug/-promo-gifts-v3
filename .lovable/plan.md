

# Plano — Testes de roving tabindex: apenas card ativo recebe `tabIndex=0`, demais `tabIndex=-1`

Adiciono **1 teste** ao final do sub-describe `"navegação por setas/Home/End"` em `tests/components/magic-up-onda5.test.tsx`, validando o padrão **roving tabindex** (WAI-ARIA Authoring Practices): apenas o card ativo deve ter `tabIndex=0` e ser alcançável via Tab; os demais cards devem ter `tabIndex=-1` e só podem receber foco via setas/programaticamente.

## Justificativa

Cobertura atual valida foco, `aria-pressed` e classes focus-visible. Mas **não há teste** que afirme o contrato de **roving tabindex** — padrão obrigatório para composite widgets (radiogroup, listbox, toolbar):

| Lacuna | Risco |
|---|---|
| Apenas 1 card no DOM tem `tabIndex=0` (o ativo) | Bug onde todos os cards têm `tabIndex=0` faria Tab parar em cada card individualmente, quebrando UX (deveria pular o grupo inteiro) |
| Cards inativos têm `tabIndex=-1` (não `tabIndex=0`, não ausente) | `tabIndex` ausente em `<button>` permite Tab stop padrão, quebrando roving |
| Após mudança de `activeIndex`, o `tabIndex=0` migra para o novo ativo e o anterior recebe `tabIndex=-1` | Drift acumulativo: múltiplos cards com `tabIndex=0` após N navegações |
| Tab a partir de fora do grupo entra no card ativo (não no primeiro) | Regressão: Tab ignora `activeIndex` e sempre vai para card 1 |
| Tab a partir do card ativo SAI do grupo (vai para próximo focável fora) | Regressão: Tab cicla dentro do grupo (errado para roving — só setas ciclam) |

**WAI-ARIA APG (Roving Tabindex pattern)**: "Only one element in the container has `tabindex='0'`. All other focusable elements have `tabindex='-1'`." Teste declarativo trava o contrato.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar **1 teste** ao final do sub-describe `"navegação por setas/Home/End"` (após o último teste de setas ←/→/↑/↓ que está sendo adicionado, ou após o teste atual final), antes do `});` que fecha o sub-describe:

```ts
it("roving tabindex: apenas card ativo tem tabIndex=0; demais cards tabIndex=-1; ativo migra ao mudar activeIndex", async () => {
  const user = userEvent.setup();

  function ControlledWrapper() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    return (
      <>
        <button type="button" data-testid="before">Antes</button>
        <MagicUpVariationComparator
          variations={navVariations}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onSelectWinner={vi.fn()}
        />
        <button type="button" data-testid="after">Depois</button>
      </>
    );
  }

  render(<ControlledWrapper />);
  const total = navVariations.length;

  // Helper: retorna array de tabIndex dos cards na ordem 1..N
  const getCardTabIndices = (): number[] => {
    return Array.from({ length: total }, (_, i) => {
      const card = screen.getByRole("button", {
        name: new RegExp(`^Selecionar variação ${i + 1}`),
      });
      return card.tabIndex;
    });
  };

  // Helper: valida invariante — exatamente 1 card com tabIndex=0 (no índice esperado), demais -1
  const expectRovingState = (oneBasedActiveIndex: number) => {
    const tabIndices = getCardTabIndices();
    const zeros = tabIndices.filter((t) => t === 0);
    expect(zeros).toHaveLength(1); // INVARIANTE: exatamente 1 ativo
    expect(tabIndices[oneBasedActiveIndex - 1]).toBe(0);
    // Todos os demais devem ser -1 (não ausente, não 0)
    tabIndices.forEach((t, i) => {
      if (i !== oneBasedActiveIndex - 1) {
        expect(t).toBe(-1);
      }
    });
  };

  // ── Estado inicial: card 1 ativo ──
  expectRovingState(1);

  // ── Tab a partir do botão "before" entra no card ATIVO (não necessariamente o card 1) ──
  const beforeBtn = screen.getByTestId("before");
  beforeBtn.focus();
  expect(beforeBtn).toHaveFocus();
  await user.tab();
  // Foco deve estar no card ativo (card 1)
  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  expect(card1).toHaveFocus();

  // ── Tab a partir do card ativo SAI do grupo (não cicla para card 2) ──
  // Pode haver botões intermediários (vencedora). Validamos que eventualmente chega em "after"
  // sem voltar para outro card de seleção.
  await user.tab();
  // Foco NÃO pode estar em outro card "Selecionar variação N" (deveria sair do roving)
  const cardsAfterTab = screen.getAllByRole("button", { name: /^Selecionar variação/ });
  cardsAfterTab.forEach((c) => {
    expect(c).not.toHaveFocus();
  });

  // ── ArrowRight: card 1 → card 2; tabIndex migra ──
  card1.focus();
  await user.keyboard("{ArrowRight}");
  expectRovingState(2);

  // ── ArrowRight: card 2 → card 3; tabIndex migra ──
  await user.keyboard("{ArrowRight}");
  expectRovingState(3);

  // ── End: → último; tabIndex no último ──
  await user.keyboard("{End}");
  expectRovingState(total);

  // ── Home: → primeiro; tabIndex no primeiro ──
  await user.keyboard("{Home}");
  expectRovingState(1);

  // ── Após Home, Tab a partir de "before" deve entrar no card 1 (ativo) ──
  beforeBtn.focus();
  await user.tab();
  expect(card1).toHaveFocus();

  // ── Mude activeIndex para 2 via setas e valide novamente ──
  await user.keyboard("{ArrowRight}");
  expectRovingState(2);
  beforeBtn.focus();
  await user.tab();
  // Agora Tab deve entrar no card 2 (novo ativo)
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  expect(card2).toHaveFocus();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `React`, `render`, `screen`, `userEvent`, `vi`, `navVariations`, `MagicUpVariationComparator`)
- 1 teste novo (122 → 123 testes)
- Helper `expectRovingState` valida 3 invariantes em 1 chamada: contagem exata (1), índice correto (0 no ativo), demais (-1)
- Botões "before"/"after" externos validam entrada/saída do grupo via Tab (contrato de roving)
- `tabIndex` é lido como propriedade DOM (`element.tabIndex`), garantindo que JSDOM resolva valores numéricos consistentes
- Cobre 3 transições de `activeIndex` (1→2→3, End, Home, ArrowRight pós-Home) — drift seria detectado

## Risco do teste

Este teste pode **falhar na primeira execução** se o componente atual NÃO implementa roving tabindex (ou seja, todos os cards têm `tabIndex=0` ou `tabIndex` ausente). Nesse caso há 2 caminhos:

1. **Componente já implementa roving** → teste passa, contrato fica travado.
2. **Componente NÃO implementa roving** → teste falha, e o usuário precisa decidir:
   - **(a) Implementar roving no componente** (mudança em `MagicUpVariationComparator.tsx`: adicionar `tabIndex={isActive ? 0 : -1}` em cada card)
   - **(b) Ajustar o teste para refletir o comportamento atual** (e perder o contrato)

Recomendação: rodar o teste primeiro. Se falhar, abrir novo plano para implementar roving tabindex no componente (alinhado com WAI-ARIA APG).

## Entregável

- 1 teste cobrindo:
  1. **Invariante de exclusividade**: exatamente 1 card com `tabIndex=0` em qualquer momento
  2. **`tabIndex=-1` (não ausente)** nos demais cards
  3. **Migração correta** de `tabIndex=0` ao mudar `activeIndex` via setas/Home/End
  4. **Tab entra no card ativo** (não no primeiro card sempre)
  5. **Tab sai do grupo** a partir do card ativo (não cicla internamente)
  6. **Persistência da entrada via Tab** após mudança de `activeIndex`
- Captura regressões onde:
  - Refator esqueça `tabIndex={isActive ? 0 : -1}` em cards
  - Todos os cards ganhem `tabIndex=0` (Tab para em cada um, UX quebrada)
  - `tabIndex=-1` vire `tabIndex={undefined}` (cards inativos viram Tab stops)
  - `activeIndex` mude mas `tabIndex` não migre (drift)
- Sem impacto nos 122 testes existentes: novo teste é isolado em `ControlledWrapper` próprio com botões externos
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 123/123 verde (ou abrir plano de implementação de roving caso falhe)

