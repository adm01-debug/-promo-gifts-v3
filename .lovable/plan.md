

# Plano — Refatorar queries do teste para usar `aria-label` específicos

Substituo no teste `badge fica no menor índice quando 2 cards têm isWinner: true...` as queries genéricas (`getByLabelText("Melhor score")`, `getByRole("button", { name: /^Selecionar variação/ })`) por queries direcionadas pelo **aria-label completo e exato** de cada botão. Isso elimina dependência da estrutura DOM (`role="listitem"` + `within`) e torna o teste robusto contra refatorações de wrapper/markup.

## Justificativa

Queries atuais dependem de:
1. `role="listitem"` no wrapper externo — quebra se o componente trocar `<div role="listitem">` por `<li>` ou outro container
2. `within(cards[i])` para escopar busca — acopla o teste à hierarquia DOM
3. Regex genérica `/^Selecionar variação/` — não distingue entre os 3 botões individualmente

Queries por `aria-label` exato:
- Localizam diretamente o botão alvo sem navegar pela árvore
- Falham com mensagem clara se o `aria-label` mudar de formato (regressão real)
- Passam mesmo se o wrapper mudar de tag/role (resiliente a refactor visual)
- Servem como **especificação executável** dos labels esperados

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Refatorar **apenas** o helper `assertBadgeOnFirstWinner` e os 4 cliques dentro do teste `badge fica no menor índice quando 2 cards têm isWinner: true e usuário clica no empatado de maior índice`. Demais testes ficam inalterados.

**Constantes locais no início do teste** (após declarar `variations`):

```ts
// aria-labels exatos esperados — fonte única de verdade do teste
const ARIA_LABEL_VAR_A_WINNER = "Selecionar variação 1, score 70, melhor score";
const ARIA_LABEL_VAR_B = "Selecionar variação 2, score 99";
const ARIA_LABEL_VAR_C = "Selecionar variação 3, score 70";
```

**Helper `assertBadgeOnFirstWinner` refatorado**:

```ts
const assertBadgeOnFirstWinner = (currentActive: number) => {
  // 1. Cardinalidade global da badge = 1
  expect(screen.getAllByLabelText("Melhor score", { exact: true })).toHaveLength(1);
  expect(screen.getAllByText("Melhor score", { exact: true })).toHaveLength(1);

  // 2. Botões localizados diretamente por aria-label exato
  const buttonA = screen.getByRole("button", { name: ARIA_LABEL_VAR_A_WINNER });
  const buttonB = screen.getByRole("button", { name: ARIA_LABEL_VAR_B });
  const buttonC = screen.getByRole("button", { name: ARIA_LABEL_VAR_C });

  // 3. aria-pressed reflete activeIndex; badge é independente
  const buttons = [buttonA, buttonB, buttonC];
  buttons.forEach((btn, idx) => {
    expect(btn).toHaveAttribute("aria-pressed", idx === currentActive ? "true" : "false");
  });

  // 4. Sufixo ", melhor score" presente APENAS no aria-label do winner
  expect(buttonA.getAttribute("aria-label")).toContain(", melhor score");
  expect(buttonB.getAttribute("aria-label")).not.toContain("melhor score");
  expect(buttonC.getAttribute("aria-label")).not.toContain("melhor score");
};
```

**Cliques refatorados** (cada `user.click` localiza o botão direto pelo aria-label):

```ts
// CLIQUE 1: var-C
await user.click(screen.getByRole("button", { name: ARIA_LABEL_VAR_C }));
expect(onSelect).toHaveBeenLastCalledWith(2);
rerender(renderWithActive(2));
assertBadgeOnFirstWinner(2);

// CLIQUE 2: var-C novamente
await user.click(screen.getByRole("button", { name: ARIA_LABEL_VAR_C }));
expect(onSelect).toHaveBeenLastCalledWith(2);
rerender(renderWithActive(2));
assertBadgeOnFirstWinner(2);

// CLIQUE 3: var-B
await user.click(screen.getByRole("button", { name: ARIA_LABEL_VAR_B }));
expect(onSelect).toHaveBeenLastCalledWith(1);
rerender(renderWithActive(1));
assertBadgeOnFirstWinner(1);

// CLIQUE 4: var-C
await user.click(screen.getByRole("button", { name: ARIA_LABEL_VAR_C }));
expect(onSelect).toHaveBeenLastCalledWith(2);
rerender(renderWithActive(2));
assertBadgeOnFirstWinner(2);
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem alteração nos demais 79 testes (queries antigas com `within`/`listitem` permanecem onde já validam estrutura listada explicitamente)
- Sem novos imports (`screen`, `user`, `expect` já disponíveis; `within` deixa de ser usado dentro deste teste mas continua importado para os outros)
- Mantém todas as 4 invariantes originais (cardinalidade, presença, ausência, aria-pressed) — só muda como o teste **localiza** os elementos
- Volume de asserts: aumenta ligeiramente (3 asserts de sufixo + 3 de `aria-pressed` por estado vs. 2 anteriores)

## Entregável

- Teste refatorado com queries 100% baseadas em `aria-label` exato
- 3 constantes locais (`ARIA_LABEL_VAR_A_WINNER`, `ARIA_LABEL_VAR_B`, `ARIA_LABEL_VAR_C`) servem como contrato visual do teste
- Resiliência aumentada: teste passa mesmo se o wrapper mudar de `<div role="listitem">` para `<li>`, `<article>`, ou estrutura aninhada diferente
- Mensagens de falha mais claras: erro aponta diretamente "botão com aria-label X não encontrado" em vez de "índice 2 do listitem array"
- Captura regressões mais precisas:
  - Mudança de formato do aria-label (vírgula extra, espaçamento, ordem)
  - Sufixo `, melhor score` aplicado a card errado
  - Sufixo ausente do card winner
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 80/80 verde

