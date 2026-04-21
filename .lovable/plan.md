

# Plano — Checagem global de cardinalidade de "Melhor score" no DOM acessível

Adiciono ao teste paramétrico (`múltiplos isWinner: true — vencedor é sempre o de menor índice...`) uma **camada de auditoria global** que conta todas as ocorrências de "Melhor score" no DOM acessível, garantindo que o componente nunca duplique o tratamento de vencedor — incluindo o header (que tem label diferente: "Melhor score entre variações: X").

## Justificativa

Os asserts atuais validam cardinalidade **dentro de cada listitem** (var-A=1, var-B=0, var-C=0). Mas não há um assert **global** que prove "no DOM inteiro existe exatamente 1 badge de vencedor", o que protege contra:

1. Badge "Melhor score" renderizada fora dos listitems (ex.: refatoração que mova a badge para o header da seção)
2. Texto "Melhor score" duplicado em tooltip, sr-only, ou aria-describedby
3. Confusão entre o **header** (`aria-label="Melhor score entre variações: 95"`) e a **badge do winner** (`aria-label="Melhor score"`) — são semanticamente distintos e devem ter contagens independentes

A checagem global separa explicitamente:
- **1 elemento** com `aria-label` exatamente igual a `"Melhor score"` (badge do winner)
- **1 elemento** com `aria-label` que começa com `"Melhor score entre variações:"` (header)
- **1 ocorrência** do texto visível `"Melhor score"` (dentro da badge — o header usa "Melhor score: 95")

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar bloco final no `it.each` existente, após a asserção 6.4 (winnerButtons), antes de fechar o callback:

```ts
// 7. Auditoria global de cardinalidade — protege contra duplicações em
//    qualquer parte do DOM acessível (header, listitems, tooltips, sr-only).

// 7.1 Badge do winner: exatamente 1 elemento com aria-label="Melhor score" exato
const exactBadgeMatches = screen.getAllByLabelText("Melhor score", { exact: true });
expect(exactBadgeMatches).toHaveLength(1);

// 7.2 Header: exatamente 1 elemento com aria-label começando por
//     "Melhor score entre variações:" (semanticamente distinto da badge)
const headerMatches = screen.getAllByLabelText(/^Melhor score entre variações:/);
expect(headerMatches).toHaveLength(1);

// 7.3 Texto visível "Melhor score" (sem dois-pontos): aparece apenas 1 vez,
//     dentro da badge do winner. O header usa "Melhor score: <valor>".
const visibleBadgeText = screen.getAllByText("Melhor score", { exact: true });
expect(visibleBadgeText).toHaveLength(1);

// 7.4 Sufixo ", melhor score" no aria-label de botões: exatamente 1 ocorrência
//     em todo o DOM (não apenas entre botões "Selecionar variação")
const allElementsWithSuffix = Array.from(
  document.querySelectorAll("[aria-label]")
).filter((el) => (el.getAttribute("aria-label") ?? "").endsWith(", melhor score"));
expect(allElementsWithSuffix).toHaveLength(1);

// 7.5 Cross-check: a badge do winner está dentro do listitem do índice 0
expect(cards[0].contains(exactBadgeMatches[0])).toBe(true);
expect(cards[0].contains(visibleBadgeText[0])).toBe(true);
```

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Reusa `cards` já no escopo do callback
- Sem novos imports (`document.querySelectorAll` é nativo do jsdom)
- Asserts em camadas: aria-label exato, regex de header, texto visível, sufixo global, cross-check de containment
- Mantém os 3 casos paramétricos existentes (77/77 → 77/77)

## Entregável

- 5 novos asserts por caso paramétrico (15 verificações adicionais no total)
- Trava a invariante: **"Melhor score" como conceito de vencedor aparece exatamente 1 vez no DOM acessível**, distinto do header informativo
- Captura regressões onde:
  - Badge é duplicada em qualquer wrapper (header, tooltip, sr-only)
  - Sufixo `", melhor score"` vaza para qualquer outro elemento focável (não apenas botões "Selecionar variação")
  - Badge é movida para fora do listitem do winner
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 77/77 verde

