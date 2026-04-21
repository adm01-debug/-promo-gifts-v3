

# Plano — Validação literal de aria-labels completos por card no teste paramétrico

Reforço o teste paramétrico (`múltiplos isWinner: true — vencedor é sempre o de menor índice...`) com um **bloco dedicado de asserts literais** que valida o `aria-label` completo de cada um dos 3 botões (var-A vencedor, var-B controle, var-C perdedor marcado), garantindo consistência de acessibilidade em todas as permutações de score.

## Justificativa

Os asserts atuais validam aria-labels de forma fragmentada:
- var-A: validado via `getByRole({ name: ... })` (positivo)
- var-B: validado via `not.toMatch(/melhor score/)` + match literal (negativo)
- var-C: validado via `not.toMatch(/melhor score/)` + match literal (negativo)

Falta um **bloco coeso** que documente e trave o **contrato literal completo** dos 3 aria-labels lado a lado, no mesmo lugar. Isso:

1. Serve como **especificação executável** do contrato de acessibilidade (alguém lendo o teste vê os 3 labels esperados em sequência)
2. Detecta regressões de **formato** (vírgulas, espaçamento, ordem dos componentes) que asserts fragmentados podem mascarar
3. Garante que o aria-label do **vencedor** segue exatamente o padrão `Selecionar variação N, score X, melhor score` (3 componentes separados por `, `)
4. Garante que **perdedores** seguem exatamente `Selecionar variação N, score X` (2 componentes), sem sufixo, sem espaços extras

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar bloco final no `it.each` existente (`múltiplos isWinner: true — vencedor é sempre o de menor índice ($label)`), após a asserção 7.5 (containment), antes de fechar o callback:

```ts
// 8. Contrato literal de aria-labels — espec. executável dos 3 botões
//    Documenta o formato esperado lado a lado e trava regressões de formato
//    (vírgulas, espaçamento, ordem dos componentes).

// 8.1 Mapa do contrato esperado por card (índice → aria-label literal)
const expectedAriaLabels: Record<number, string> = {
  0: `Selecionar variação 1, score ${scoreA}, melhor score`, // vencedor
  1: "Selecionar variação 2, score 50",                       // controle
  2: `Selecionar variação 3, score ${scoreC}`,                // perdedor marcado
};

// 8.2 Validação literal por card — cada button deve ter EXATAMENTE o aria-label
//     definido no contrato, sem caracteres extras, sem espaços a mais.
cards.forEach((card, index) => {
  const button = within(card).getByRole("button", { name: /^Selecionar variação/ });
  const ariaLabel = button.getAttribute("aria-label");
  expect(ariaLabel).toBe(expectedAriaLabels[index]);
});

// 8.3 Validação estrutural — vencedor tem 3 componentes (separados por ", "),
//     perdedores têm 2 componentes. Trava o formato do contrato.
const winnerLabel = within(cards[0])
  .getByRole("button", { name: /^Selecionar variação/ })
  .getAttribute("aria-label");
expect(winnerLabel?.split(", ")).toHaveLength(3);
expect(winnerLabel?.split(", ")[2]).toBe("melhor score");

[cards[1], cards[2]].forEach((card) => {
  const label = within(card)
    .getByRole("button", { name: /^Selecionar variação/ })
    .getAttribute("aria-label");
  expect(label?.split(", ")).toHaveLength(2);
  expect(label).not.toMatch(/melhor score/);
});

// 8.4 Cross-check com a coleção completa — todos os 3 labels esperados
//     existem no DOM e nenhum label inesperado aparece.
const allButtonLabels = screen
  .getAllByRole("button", { name: /^Selecionar variação/ })
  .map((btn) => btn.getAttribute("aria-label"));
expect(allButtonLabels).toEqual([
  expectedAriaLabels[0],
  expectedAriaLabels[1],
  expectedAriaLabels[2],
]);
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Reusa `cards`, `scoreA`, `scoreC` já no escopo do callback
- Sem novos imports
- Asserts em camadas: mapa literal por índice, validação estrutural por componentes, ordem completa via `toEqual`
- Mantém os 3 casos paramétricos existentes (77/77 → 77/77)

## Entregável

- 4 novos blocos de assert por caso paramétrico (12 verificações adicionais no total)
- Trava 4 invariantes de contrato:
  1. Mapa literal exato dos 3 aria-labels por índice
  2. Vencedor tem exatamente 3 componentes separados por `, `
  3. Perdedores têm exatamente 2 componentes, sem sufixo `melhor score`
  4. Ordem dos botões no DOM corresponde à ordem do array de variações
- Serve como **especificação executável** legível: ao olhar o teste, dev vê os 3 aria-labels esperados lado a lado
- Captura regressões de formato (vírgulas extras, espaçamento, reordenação de componentes)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 77/77 verde

