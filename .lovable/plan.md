

# Plano — Testes de aria-pressed/aria-current após Enter/Space e cliques pós-teclado

Adiciono **2 testes** ao final do sub-describe `"ativação por Enter/Espaço nos botões"` em `tests/components/magic-up-onda5.test.tsx`, validando que `aria-pressed` e `aria-current` refletem corretamente o estado de seleção após ativação por teclado (Enter/Space) e após cliques mouse subsequentes a navegação por teclado.

## Justificativa

Cobertura existente (107 testes): keyboard trap, scroll preserva foco, Home/End, Shift+Tab reverso, modificadores em loading.

**Lacuna**: o componente expõe `aria-pressed={isActive}` e `aria-current={isActive ? "true" : undefined}` (linhas 73-74 do componente), mas nenhum teste valida que esses atributos:
1. São atualizados corretamente quando o pai re-renderiza com novo `activeIndex` após Enter/Space
2. Permanecem consistentes quando o usuário alterna entre teclado e mouse (clique após Tab)
3. Mantêm exclusividade: apenas UM card tem `aria-pressed="true"` / `aria-current="true"` por vez

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 2 testes ao final do sub-describe `"ativação por Enter/Espaço nos botões"`, usando wrapper controlado que sincroniza `activeIndex` via `onSelect` (simulando o pai real):

---

**Teste 1 — `aria-pressed` e `aria-current` atualizam após Enter/Space e mantêm exclusividade**

```ts
it("aria-pressed e aria-current refletem o estado correto após ativação por Enter/Space, mantendo exclusividade entre cards", async () => {
  const user = userEvent.setup();
  const onSelectWinner = vi.fn();

  function ControlledWrapper() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    return (
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        onSelectWinner={onSelectWinner}
      />
    );
  }

  render(<ControlledWrapper />);

  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });

  // Estado inicial: card1 ativo
  expect(card1).toHaveAttribute("aria-pressed", "true");
  expect(card1).toHaveAttribute("aria-current", "true");
  expect(card2).toHaveAttribute("aria-pressed", "false");
  expect(card2).not.toHaveAttribute("aria-current");
  expect(card3).toHaveAttribute("aria-pressed", "false");
  expect(card3).not.toHaveAttribute("aria-current");

  // Foca card2 e ativa com Enter
  card2.focus();
  await user.keyboard("{Enter}");

  // Aguarda re-render (state update via onSelect)
  await screen.findByRole("button", { name: /^Selecionar variação 2/ });

  expect(card1).toHaveAttribute("aria-pressed", "false");
  expect(card1).not.toHaveAttribute("aria-current");
  expect(card2).toHaveAttribute("aria-pressed", "true");
  expect(card2).toHaveAttribute("aria-current", "true");
  expect(card3).toHaveAttribute("aria-pressed", "false");
  expect(card3).not.toHaveAttribute("aria-current");

  // Foca card3 e ativa com Space
  card3.focus();
  await user.keyboard(" ");

  expect(card1).toHaveAttribute("aria-pressed", "false");
  expect(card1).not.toHaveAttribute("aria-current");
  expect(card2).toHaveAttribute("aria-pressed", "false");
  expect(card2).not.toHaveAttribute("aria-current");
  expect(card3).toHaveAttribute("aria-pressed", "true");
  expect(card3).toHaveAttribute("aria-current", "true");

  // Volta para card1 com Home
  await user.keyboard("{Home}");

  expect(card1).toHaveAttribute("aria-pressed", "true");
  expect(card1).toHaveAttribute("aria-current", "true");
  expect(card2).toHaveAttribute("aria-pressed", "false");
  expect(card3).toHaveAttribute("aria-pressed", "false");

  // Exclusividade: contar exatamente 1 card com aria-current="true"
  const allCards = [card1, card2, card3];
  const currentCount = allCards.filter((c) => c.getAttribute("aria-current") === "true").length;
  expect(currentCount).toBe(1);

  const pressedCount = allCards.filter((c) => c.getAttribute("aria-pressed") === "true").length;
  expect(pressedCount).toBe(1);

  // onSelectWinner intocado durante toda a sequência
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

---

**Teste 2 — `aria-pressed`/`aria-current` consistentes em sequência mista teclado→clique→teclado**

```ts
it("aria-pressed e aria-current permanecem consistentes em sequência mista Tab→Enter→clique→Space, sem dessincronizar atributos", async () => {
  const user = userEvent.setup();
  const onSelectWinner = vi.fn();

  function ControlledWrapper() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    return (
      <div>
        <button type="button" data-testid="before-sentinel">antes</button>
        <MagicUpVariationComparator
          variations={navVariations}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onSelectWinner={onSelectWinner}
        />
      </div>
    );
  }

  render(<ControlledWrapper />);

  const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  const card2 = screen.getByRole("button", { name: /^Selecionar variação 2/ });
  const card3 = screen.getByRole("button", { name: /^Selecionar variação 3/ });

  // ─── Etapa 1: Tab até card2 e Enter ───
  screen.getByTestId("before-sentinel").focus();
  await user.tab(); // card1
  await user.tab(); // marcar1
  await user.tab(); // card2
  expect(card2).toHaveFocus();
  await user.keyboard("{Enter}");

  expect(card2).toHaveAttribute("aria-pressed", "true");
  expect(card2).toHaveAttribute("aria-current", "true");
  expect(card1).toHaveAttribute("aria-pressed", "false");
  expect(card3).toHaveAttribute("aria-pressed", "false");

  // ─── Etapa 2: Clique direto no card3 (mouse após teclado) ───
  await user.click(card3);

  expect(card3).toHaveAttribute("aria-pressed", "true");
  expect(card3).toHaveAttribute("aria-current", "true");
  expect(card2).toHaveAttribute("aria-pressed", "false");
  expect(card2).not.toHaveAttribute("aria-current");
  expect(card1).toHaveAttribute("aria-pressed", "false");

  // ─── Etapa 3: Volta ao teclado — Shift+Tab até card3 já está focado pelo clique; usa setas ───
  card3.focus();
  // ArrowLeft (handler usa ArrowLeft/ArrowUp para anterior) → card2
  await user.keyboard("{ArrowLeft}");
  expect(card2).toHaveFocus();
  await user.keyboard(" ");

  expect(card2).toHaveAttribute("aria-pressed", "true");
  expect(card2).toHaveAttribute("aria-current", "true");
  expect(card3).toHaveAttribute("aria-pressed", "false");
  expect(card3).not.toHaveAttribute("aria-current");

  // ─── Etapa 4: Clique em card1 (mouse novamente) ───
  await user.click(card1);

  expect(card1).toHaveAttribute("aria-pressed", "true");
  expect(card1).toHaveAttribute("aria-current", "true");
  expect(card2).toHaveAttribute("aria-pressed", "false");
  expect(card2).not.toHaveAttribute("aria-current");
  expect(card3).toHaveAttribute("aria-pressed", "false");

  // ─── Etapa 5: Validação final de exclusividade após 4 alternâncias teclado/mouse ───
  const allCards = [card1, card2, card3];
  expect(allCards.filter((c) => c.getAttribute("aria-pressed") === "true")).toHaveLength(1);
  expect(allCards.filter((c) => c.getAttribute("aria-current") === "true")).toHaveLength(1);
  expect(allCards.filter((c) => c.getAttribute("aria-pressed") === "false")).toHaveLength(2);
  expect(allCards.filter((c) => !c.hasAttribute("aria-current"))).toHaveLength(2);

  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Necessário import de `React` (provavelmente já presente; se não, usar `import * as React` ou `useState` direto). Verificação: o arquivo já usa hooks/JSX, então `React` deve estar acessível — caso contrário adicionar `import { useState } from "react"` e usar `useState` direto no wrapper
- Sem novos imports adicionais (reusa `render`, `screen`, `userEvent`, `vi`, `MagicUpVariationComparator`, `navVariations`)
- 2 testes novos (107 → 109 testes)
- Wrapper controlado simula o comportamento real do pai (sincroniza `activeIndex` via `onSelect`)

## Entregável

- 2 testes cobrindo:
  1. **Atualização e exclusividade**: após Enter no card2, card2 ganha `aria-pressed="true"` + `aria-current="true"` e os outros voltam a `aria-pressed="false"` sem `aria-current`; mesmo padrão para Space no card3 e Home retornando ao card1; contagem final confirma exatamente 1 card pressed/current
  2. **Consistência teclado↔mouse**: sequência Tab+Enter (card2) → clique mouse (card3) → ArrowLeft+Space (card2) → clique mouse (card1) mantém atributos sincronizados em cada etapa; validação final de exclusividade após 4 alternâncias
- Captura regressões onde:
  - `aria-pressed` não atualizasse após re-render (state stale)
  - `aria-current` ficasse `"true"` em múltiplos cards (perda de exclusividade)
  - `aria-current` permanecesse como string vazia ou `"false"` em vez de ausente (componente usa `undefined`)
  - Clique mouse não atualizasse atributos (handler `onClick` desconectado de `onSelect`)
  - Alternância teclado→mouse→teclado dessincronizasse `aria-pressed` e `aria-current` (ex: um atributo atualiza e outro não)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 109/109 verde

