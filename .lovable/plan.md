

# Plano — Verificações negativas explícitas para variações `isWinner: true` perdedoras

Reforço o teste paramétrico (`múltiplos isWinner: true — vencedor é sempre o de menor índice...`) com **asserts negativos explícitos** sobre var-C (a segunda variação marcada com `isWinner: true` que perde para var-A). Hoje o teste já valida indiretamente, mas falta um bloco dedicado que prove negativamente — em camadas — que var-C não recebe nenhum tratamento de vencedor.

## Justificativa

O teste atual prova que var-A vence (positivo) e usa uma asserção agregada de cardinalidade (1 sufixo no total). Mas não tem asserts **dirigidos a var-C** que falhem com mensagens claras se uma regressão fizer var-C receber tratamento parcial de vencedor (ex.: badge sem sufixo, ou sufixo sem badge).

Cenários de regressão silenciosa que ficam descobertos:
1. Bug onde **todos os `isWinner: true`** recebem badge mas só o primeiro recebe sufixo no aria-label (ou vice-versa) — atual asserção agregada poderia mascarar
2. Bug onde a badge "Melhor score" aparece em wrapper externo ao `<button>` de var-C, escapando do teste por nome de botão
3. Refatoração que renderize badge condicionada a `variation.isWinner` direto (em vez de `index === winnerIndex`) — var-C receberia badge

Asserts negativos dirigidos detectam essas regressões com mensagem de erro precisa ("var-C não deveria ter badge") em vez de erro genérico ("esperava 1 badge, recebeu 2").

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar bloco de asserts negativos dentro do `it.each` existente (`múltiplos isWinner: true — vencedor é sempre o de menor índice ($label)`), após a asserção 5 (agregada de sufixo) e antes do fechamento do callback:

```ts
// 6. Verificações negativas dirigidas a var-C (segundo isWinner: true que perde)
//    Garantem que NENHUM tratamento de vencedor vaze para variações marcadas
//    além do menor índice.

// 6.1 var-C não tem badge "Melhor score" dentro do seu listitem
const varCCard = cards[2];
expect(within(varCCard).queryByLabelText("Melhor score")).toBeNull();
expect(within(varCCard).queryByText("Melhor score")).toBeNull();

// 6.2 Aria-label do botão de var-C NÃO contém o sufixo ", melhor score"
const varCButton = within(varCCard).getByRole("button", { name: /^Selecionar variação 3/ });
expect(varCButton.getAttribute("aria-label")).not.toMatch(/melhor score/);
expect(varCButton.getAttribute("aria-label")).toBe(`Selecionar variação 3, score ${scoreC}`);
expect(varCButton).toHaveAttribute("aria-pressed", "false");
expect(varCButton).not.toHaveAttribute("aria-current");

// 6.3 var-B (não-winner com score 50) também é negativo de controle
const varBCard = cards[1];
expect(within(varBCard).queryByLabelText("Melhor score")).toBeNull();
const varBButton = within(varBCard).getByRole("button", { name: /^Selecionar variação 2/ });
expect(varBButton.getAttribute("aria-label")).not.toMatch(/melhor score/);
expect(varBButton.getAttribute("aria-label")).toBe("Selecionar variação 2, score 50");

// 6.4 Confirmação cruzada: o ÚNICO botão com sufixo é o de var-A
const winnerButtons = screen
  .getAllByRole("button", { name: /^Selecionar variação/ })
  .filter((btn) => (btn.getAttribute("aria-label") ?? "").endsWith(", melhor score"));
expect(winnerButtons).toHaveLength(1);
expect(winnerButtons[0].getAttribute("aria-label")).toBe(
  `Selecionar variação 1, score ${scoreA}, melhor score`
);
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Reusa `cards`, `scoreA`, `scoreC` já no escopo do callback
- Sem novos imports
- Asserts em camadas (badge ausente, sufixo ausente, aria-pressed=false, aria-current ausente, match literal final) — cada um falha com mensagem específica
- Mantém os 3 casos paramétricos existentes; apenas amplia profundidade de cada um

## Entregável

- Mesmos 3 casos de teste (77 → 77, sem novos casos), mas com profundidade adicional
- Trava 4 invariantes negativas adicionais por caso:
  1. var-C não tem badge no DOM (busca por label E por texto)
  2. var-C não tem sufixo no aria-label (regex negativo + match literal)
  3. var-C não tem `aria-current` e tem `aria-pressed="false"` (estado de seleção limpo)
  4. var-B (controle) também passa pelas mesmas verificações negativas
- Detecção precisa de regressões parciais (badge sem sufixo, sufixo sem badge, vazamento de estado de seleção)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 77/77 verde

