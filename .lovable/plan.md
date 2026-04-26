# Cleanup E2E de Favoritos com confirmação pós-reload

## Objetivo

No spec `e2e/flows/08-favorites.spec.ts`, transformar o passo de cleanup do teste de reload em uma **etapa de teste de verdade**: desfavorita o produto, recarrega a página e confirma que ele **sumiu** da lista (e que a contagem do header voltou ao estado inicial).

## Diagnóstico

Hoje o cleanup no final do teste "favorita um produto, recarrega e ele persiste":
1. Remove o favorito clicando no botão correspondente.
2. Verifica que `countItems` voltou a `countBefore`.

Falta:
- Aceitar eventual diálogo de confirmação do `DeleteConfirmDialog`.
- **Recarregar** `/favoritos`.
- Confirmar que o produto removido **não aparece** mais na lista após o reload (persistência da remoção, não só do estado em memória).

## Mudanças

### `e2e/flows/08-favorites.spec.ts` — bloco de cleanup (linhas ~151–168)

Substituir o bloco atual por:

1. Clicar no botão "Remover favorito" do card que casa com `productName` (fallback: primeiro botão de remover).
2. Se um `[role="alertdialog"]` ou `[role="dialog"]` aparecer com botão "Remover/Confirmar/Sim/Excluir", clicar nele.
3. `expect.poll` para `readFavoritesCount(page) === countBefore` (com timeout 10s).
4. `page.reload({ waitUntil: "domcontentloaded" })` + espera por skeletons sumirem.
5. `assertFavoritesHeader(page, countBefore, { checkCardsMatch: true })` para revalidar título, ícone, label e contagem.
6. `expect(page.getByText(productRegex)).toHaveCount(0)` — o produto removido não deve mais aparecer.

`productRegex` reaproveita o `escaped` já calculado no teste.

## Detalhes técnicos

- Diálogo de confirmação: o componente `DeleteConfirmDialog` é usado para "Limpar Tudo", mas a remoção individual via `aria-label="Remover favorito"` normalmente é direta. O `if (visible)` torna o passo defensivo sem quebrar quando não há diálogo.
- `toHaveCount(0)` é assertivo o bastante para detectar tanto o sumiço do card quanto qualquer texto residual do produto na lista.
- Mantém o `{ checkCardsMatch: true }` para garantir que `removeButtons.count() === countBefore`.

## Fora de escopo

- Não mexer nos demais testes do arquivo.
- Não alterar `src/` nem `selectors.ts` (já têm tudo que é preciso).
