

# Plano — Testes de navegação por teclado no MagicUpVariationComparator

Adiciono testes verificando que Tab atinge os elementos interativos na ordem correta e que Enter/Space ativam os handlers, sem alterar produção.

## Arquivo único alterado

`tests/components/magic-up-onda5.test.tsx` — novo bloco `describe("MagicUpVariationComparator keyboard navigation")` com 4 testes.

## Casos cobertos

1. **Tab navega entre cards e botões na ordem do DOM**
   - 3 variações → ordem esperada: card1 → "Marcar vencedora"1 → card2 → "Marcar vencedora"2 → card3 → "Marcar vencedora"3
   - Usa `userEvent.tab()` em loop e verifica `document.activeElement` a cada passo

2. **Enter no card de variação chama `onSelect` com índice correto**
   - Foca o card índice 1 via `.focus()`
   - `userEvent.keyboard("{Enter}")`
   - Assert: `onSelect` chamado com `1`, `onSelectWinner` não chamado

3. **Space no card de variação chama `onSelect`**
   - Mesmo cenário, `userEvent.keyboard(" ")`
   - Assert: `onSelect` chamado com índice correto (botões nativos respondem a Space)

4. **Enter no botão "Marcar vencedora" chama `onSelectWinner` sem disparar `onSelect`**
   - Foca o botão "Marcar vencedora" do índice 2
   - `userEvent.keyboard("{Enter}")`
   - Assert: `onSelectWinner` chamado com `2`, `onSelect` NÃO chamado (evento isolado, sem bubbling cruzado)

## Estratégia

- Usa `@testing-library/user-event` (`userEvent.setup()`) — já disponível no projeto
- Sem `fireEvent` direto — `userEvent` simula sequência completa (keydown + keypress + keyup)
- Sem timers, sem async além do `await user.tab()` / `await user.keyboard()`
- Reutiliza helper `baseVariation()` criado nos snapshot tests

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks além de `vi.fn()` para os handlers
- Sem dependência de browser

## Entregável

- 4 novos testes verdes
- Total do arquivo: 17 → 21 testes
- Cobertura: tab order + Enter + Space + isolamento de eventos entre card e botão interno

