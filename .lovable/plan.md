

# Plano — Asserts adicionais de acessibilidade no teste de empate total

Reforço o teste existente "empate total: exibe exatamente 1 badge 'Melhor score' no primeiro índice (winner determinístico)" em `tests/components/magic-up-onda5.test.tsx` adicionando asserts explícitos de aria-labels por card e contagem global de ocorrências de "melhor score" — garantindo que nenhuma duplicação acessível escape em refatorações futuras.

## Justificativa

O teste atual valida:
- Contagem de badges com `getAllByLabelText("Melhor score").length === 1`
- Presença do botão da Variação 1 com sufixo `, melhor score`
- Presença dos botões 2 e 3 sem o sufixo

Mas não trava:
1. **Contagem global da string "melhor score"** no DOM acessível (badge + aria-label do botão = 2 ocorrências esperadas, nem mais, nem menos)
2. **Ausência explícita** do sufixo `melhor score` em variações 2 e 3 via query negativa (`queryByRole` + `not.toBeInTheDocument()`)
3. **Match exato** do aria-label da badge isolada (não apenas que existe 1, mas que está corretamente rotulada)

Adicionar esses asserts protege contra regressões onde:
- Alguém acidentalmente adiciona `aria-label="melhor score"` em outro lugar (ex: tooltip, sr-only)
- A badge perde seu `aria-label` mas o botão continua com o sufixo (ou vice-versa)
- A badge é renderizada em múltiplos cards via bug de ordenação

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — estender o teste existente "empate total: exibe exatamente 1 badge 'Melhor score' no primeiro índice (winner determinístico)" com 4 asserts adicionais. Sem teste novo.

## Asserts a adicionar

```ts
// 1. Badge isolada tem aria-label exato
const badge = screen.getByLabelText("Melhor score");
expect(badge).toHaveTextContent("Melhor score");

// 2. Contagem global: total de elementos com "melhor score" no DOM acessível
//    Esperado: 1 badge (aria-label) + 1 botão (aria-label sufixo) = 2 nodes
const allMelhorScoreNodes = screen.getAllByLabelText(/melhor score/i);
expect(allMelhorScoreNodes).toHaveLength(2);

// 3. Variação 2: ausência explícita do sufixo de winner
expect(
  screen.queryByRole("button", { name: /Selecionar variação 2.*melhor score/i })
).not.toBeInTheDocument();

// 4. Variação 3: ausência explícita do sufixo de winner
expect(
  screen.queryByRole("button", { name: /Selecionar variação 3.*melhor score/i })
).not.toBeInTheDocument();
```

## Estratégia

- Estende o teste de empate total existente (não cria novo) — mantém suíte em 27 testes
- Usa `queryByRole` + `not.toBeInTheDocument()` para asserts negativos (padrão Testing Library)
- Regex case-insensitive `/melhor score/i` para o count global captura ambos os contextos (badge `aria-label="Melhor score"` + botão `aria-label="...melhor score"`)
- `toHaveTextContent` na badge confirma que o texto visível bate com o aria-label (sem dessincronização)

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos testes (só asserts adicionais no existente)
- Sem novos mocks ou imports

## Entregável

- Teste de empate total reforçado com 4 asserts adicionais
- Cobertura completa: contagem absoluta de badges + contagem global de string acessível + ausência negativa explícita por card
- Suíte continua com 27 testes, mas com bloqueio mais granular de regressões de a11y

