

# Plano — Teste de Tab inicial vinda de elemento externo

Adiciono **1 teste** ao sub-describe `"ativação por Enter/Espaço nos botões"` em `tests/components/magic-up-onda5.test.tsx` validando que, partindo de um elemento externo focado fora do `MagicUpVariationComparator`, a primeira `Tab` chega no **primeiro botão de seleção** (`"Selecionar variação 1"`) do componente — confirmando ordem natural de tab e ausência de skips/traps.

## Justificativa

Cobertura existente:
- Foco programático via setas (`cardRefs.current[i].focus()`)
- Ativação por Enter/Espaço em botões já focados
- ARIA e destaque visual sincronizados

Lacuna:
- Nenhum teste valida o **tab order natural de entrada** no componente. Se um botão antes do primeiro card receber `tabIndex={-1}` indevidamente, ou se a ordem DOM mudar (ex: badge do header virar focável), a primeira Tab vinda de fora pode pular o primeiro card ou cair em elemento errado — sem regressão de ARIA/foco programático.

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final do sub-describe atual, reusando `navVariations`:

```ts
it("Tab a partir de elemento externo move foco para o primeiro botão 'Selecionar variação 1' na ordem DOM correta", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onSelectWinner = vi.fn();

  render(
    <>
      <button type="button" data-testid="external-anchor">Âncora externa</button>
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={0}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
      />
    </>
  );

  // Foca explicitamente o elemento externo (ponto de partida controlado)
  const anchor = screen.getByTestId("external-anchor");
  anchor.focus();
  expect(anchor).toHaveFocus();

  // Primeira Tab → deve cair no primeiro botão de seleção do componente
  await user.tab();
  const firstSelectBtn = screen.getByRole("button", { name: /^Selecionar variação 1/ });
  expect(firstSelectBtn).toHaveFocus();

  // Sanity: nenhum dos botões posteriores recebeu foco "por engano"
  expect(screen.getByRole("button", { name: /^Selecionar variação 2/ })).not.toHaveFocus();
  expect(screen.getByRole("button", { name: /^Selecionar variação 3/ })).not.toHaveFocus();
  expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).not.toHaveFocus();

  // Próxima Tab continua no fluxo natural: cai no botão "Marcar variação 1 como vencedora"
  // (mesma posição DOM dentro do card 1, antes de avançar para o card 2)
  await user.tab();
  expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).toHaveFocus();

  // Nenhum callback foi disparado apenas por navegar com Tab
  expect(onSelect).not.toHaveBeenCalled();
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (reusa `render`, `screen`, `userEvent`, `vi`, `MagicUpVariationComparator`, `navVariations`)
- 1 teste novo (93 → 94 testes)
- `data-testid="external-anchor"` isolado ao escopo do teste — sem colisão com outros testes
- Não força `keyboard("{Tab}")` direto: usa `user.tab()` (API oficial do `@testing-library/user-event` que respeita tab order do DOM)

## Entregável

- 1 teste validando:
  1. Foco inicial em elemento externo (`<button data-testid="external-anchor">`) confirmado via `toHaveFocus()`
  2. Primeira `user.tab()` chega exatamente no botão `"Selecionar variação 1"` (primeiro elemento focável do componente)
  3. Demais botões do componente **não** recebem foco prematuramente (sanity de cardinalidade de foco = 1)
  4. Segunda `user.tab()` segue ordem DOM esperada → `"Marcar variação 1 como vencedora"` (validando que não há reordenação ou trap)
  5. Tab por si só não dispara `onSelect`/`onSelectWinner`
- Captura regressões onde:
  - Primeiro card recebesse `tabIndex={-1}` indevidamente (Tab pularia para card 2 ou para o botão "marcar vencedora")
  - Botão de "marcar vencedora" fosse reordenado para antes do botão de seleção no DOM
  - Algum elemento focável invisível fosse adicionado entre o ponto externo e o componente
  - Wrapper `<div role="listitem">` recebesse `tabIndex` acidentalmente
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 94/94 verde

