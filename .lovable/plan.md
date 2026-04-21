

# Plano — Testes de atalhos (Ctrl+Enter, Space com repetição) bloqueados em "Marcar vencedora" desabilitado

Adiciono **2 testes** ao final do sub-describe `"ativação por Enter/Espaço nos botões"` em `tests/components/magic-up-onda5.test.tsx` validando que combinações de teclado avançadas (Ctrl+Enter, Space com auto-repeat) **não** disparam `onSelectWinner` quando o botão "Marcar vencedora" está em loading (`disabled` + `aria-busy="true"`).

## Justificativa

Cobertura existente (testes 95-99):
- Tab pula botão em loading
- Enter/Space simples não disparam em loading
- `aria-label` estável e `aria-busy` correto
- Cardinalidade isolada
- Transições loading↔habilitado preservam foco

Lacunas específicas de teclado avançado:
1. **Ctrl+Enter (e Cmd+Enter)**: combinação usada como atalho global de "submit" no projeto (ex: `KeyboardShortcuts.tsx` para gerar mockup). Validar que **não vaza** para o botão de loading mesmo se foco estiver em elemento neutro.
2. **Space com auto-repeat**: usuário segurando barra de espaço gera múltiplos `keydown` com `repeat: true`. Botão `disabled` deve ignorar **todos** os eventos repetidos, não apenas o primeiro.
3. **Modificadores combinados** (Shift/Alt/Meta + Enter/Space): nenhum deve acionar o botão em loading.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 2 testes ao final do sub-describe `"ativação por Enter/Espaço nos botões"`, reusando `navVariations`:

---

**Teste 1 — Ctrl+Enter, Cmd+Enter, Shift+Enter, Alt+Enter não disparam `onSelectWinner` em loading**

```ts
it("combinações com modificador (Ctrl/Cmd/Shift/Alt + Enter) não disparam onSelectWinner em botão 'Marcar vencedora' desabilitado", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  render(
    <div>
      <button type="button" data-testid="external-sentinel">externo</button>
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={0}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
        loadingWinnerIndex={0}
      />
    </div>
  );

  // Sanity: var-1 em loading
  const winnerBtn = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
  expect(winnerBtn).toBeDisabled();
  expect(winnerBtn).toHaveAttribute("aria-busy", "true");

  // Foco em sentinel neutro (botão disabled é unfocusable)
  screen.getByTestId("external-sentinel").focus();

  // 1) fireEvent direto no botão em loading com modificadores — nada deve vazar via onClick sintético
  fireEvent.keyDown(winnerBtn, { key: "Enter", code: "Enter", ctrlKey: true });
  fireEvent.keyUp(winnerBtn, { key: "Enter", code: "Enter", ctrlKey: true });
  fireEvent.keyDown(winnerBtn, { key: "Enter", code: "Enter", metaKey: true });
  fireEvent.keyUp(winnerBtn, { key: "Enter", code: "Enter", metaKey: true });
  fireEvent.keyDown(winnerBtn, { key: "Enter", code: "Enter", shiftKey: true });
  fireEvent.keyUp(winnerBtn, { key: "Enter", code: "Enter", shiftKey: true });
  fireEvent.keyDown(winnerBtn, { key: "Enter", code: "Enter", altKey: true });
  fireEvent.keyUp(winnerBtn, { key: "Enter", code: "Enter", altKey: true });
  fireEvent.click(winnerBtn);
  expect(onSelectWinner).not.toHaveBeenCalled();

  // 2) userEvent.keyboard com sintaxe de modificadores — emula atalho global Ctrl+Enter / Cmd+Enter
  await user.keyboard("{Control>}{Enter}{/Control}");
  await user.keyboard("{Meta>}{Enter}{/Meta}");
  await user.keyboard("{Shift>}{Enter}{/Shift}");
  await user.keyboard("{Alt>}{Enter}{/Alt}");
  expect(onSelectWinner).not.toHaveBeenCalled();

  // 3) Foco continua no sentinel — botão disabled não capturou foco
  expect(screen.getByTestId("external-sentinel")).toHaveFocus();
  expect(onSelect).not.toHaveBeenCalled();
});
```

---

**Teste 2 — Space com auto-repeat (`repeat: true`) e múltiplos Space sequenciais não disparam `onSelectWinner` em loading**

```ts
it("Space com auto-repeat e múltiplas pressões sequenciais não disparam onSelectWinner em botão 'Marcar vencedora' desabilitado", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  render(
    <div>
      <button type="button" data-testid="external-sentinel">externo</button>
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={0}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
        loadingWinnerIndex={1}
      />
    </div>
  );

  // Sanity: var-2 em loading
  const winnerBtn = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });
  expect(winnerBtn).toBeDisabled();
  expect(winnerBtn).toHaveAttribute("aria-busy", "true");

  screen.getByTestId("external-sentinel").focus();

  // 1) Auto-repeat de Space: 10 keyDowns com repeat:true seguidos de keyUp único
  // Simula usuário segurando a barra de espaço (browser dispara keydown repetido)
  for (let i = 0; i < 10; i++) {
    fireEvent.keyDown(winnerBtn, { key: " ", code: "Space", repeat: i > 0 });
  }
  fireEvent.keyUp(winnerBtn, { key: " ", code: "Space" });
  fireEvent.click(winnerBtn);
  expect(onSelectWinner).not.toHaveBeenCalled();

  // 2) 5 pressões Space sequenciais (sem repeat) via userEvent
  for (let i = 0; i < 5; i++) {
    await user.keyboard(" ");
  }
  expect(onSelectWinner).not.toHaveBeenCalled();

  // 3) Combinação Space + modificadores
  fireEvent.keyDown(winnerBtn, { key: " ", code: "Space", ctrlKey: true });
  fireEvent.keyUp(winnerBtn, { key: " ", code: "Space", ctrlKey: true });
  await user.keyboard("{Control>} {/Control}");
  await user.keyboard("{Meta>} {/Meta}");
  expect(onSelectWinner).not.toHaveBeenCalled();

  // 4) Sanity reverso: removendo loading, Space simples volta a disparar normalmente
  // (garante que os eventos anteriores não envenenaram listeners)
  // Não usamos rerender aqui — apenas confirmamos que outros botões não-loading respondem
  const winnerBtn1 = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
  expect(winnerBtn1).not.toBeDisabled();
  winnerBtn1.focus();
  await user.keyboard(" ");
  expect(onSelectWinner).toHaveBeenCalledTimes(1);
  expect(onSelectWinner).toHaveBeenCalledWith(0);

  // onSelect (cards de seleção) intocado durante toda a sequência
  expect(onSelect).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `screen`, `fireEvent`, `userEvent`, `vi`, `MagicUpVariationComparator`, `navVariations`)
- 2 testes novos (99 → 101 testes)
- Sentinel externo `data-testid="external-sentinel"` neutraliza foco, evitando que `user.keyboard` ative outros botões reais
- `for` loop simula auto-repeat realista (browsers reais disparam dezenas de `keydown` por segundo com `repeat: true`)
- Sanity reverso no teste 2 garante que botões habilitados continuam funcionais — captura regressões de "envenenamento" de listeners

## Entregável

- 2 testes cobrindo combinações de teclado avançadas em estado de loading:
  1. **Modificadores + Enter** (Ctrl/Cmd/Shift/Alt) via `fireEvent` direto no botão e via `user.keyboard` com sintaxe `{Control>}…{/Control}` — todos bloqueados
  2. **Space com auto-repeat** (10× `keydown` com `repeat: true`) + 5× Space sequenciais + Space com modificadores — todos bloqueados; sanity reverso confirma que botão habilitado vizinho responde normalmente a Space simples
- Captura regressões onde:
  - Handler customizado de `onKeyDown` no botão ignorasse o atributo `disabled` e disparasse `onSelectWinner`
  - Combinação com modificador (Ctrl+Enter como atalho global) acidentalmente fosse roteada para botões em loading
  - Auto-repeat de Space gerasse múltiplas chamadas indevidas se a guarda de `disabled` fosse aplicada apenas no primeiro evento
  - Listeners ficassem "envenenados" após sequência longa de eventos bloqueados
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 101/101 verde

