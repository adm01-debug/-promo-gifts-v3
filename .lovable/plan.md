

# Plano — Snapshot do `MagicUpVariationComparator` em empate triplo

Adiciono teste de **snapshot estrutural** focado em capturar o DOM renderizado no cenário canônico de empate triplo, servindo como guarda visual contra regressões que afetem layout, estrutura ou cardinalidade de elementos críticos (badges, botões, scores).

## Justificativa

Os 72 testes atuais validam comportamento via assertions semânticas (cardinalidade, aria-labels, posições). **Gap:** não há um teste que **congele a estrutura completa do DOM** em empate triplo. Snapshots detectam regressões silenciosas que assertions explícitas podem deixar passar:

1. Adição acidental de elementos visuais (badge duplicada em wrapper diferente)
2. Mudança de hierarquia DOM que quebre scrapers/testes E2E
3. Alteração de classes CSS que afete layout sem quebrar semântica
4. Reordenação de atributos críticos (data-*, aria-*)

## Estratégia: snapshot inline + assertions complementares

Uso **`toMatchInlineSnapshot()`** em vez de snapshot externo para:
- Manter o snapshot **versionado junto ao teste** (revisão de PR mais clara)
- Evitar arquivos `.snap` órfãos
- Forçar revisão consciente em qualquer mudança estrutural

Combino com 2 assertions defensivas que validam invariantes mesmo se o snapshot for atualizado descuidadamente (defesa em profundidade).

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

Adicionar 1 teste ao final da sub-suíte de empate:

```ts
it("snapshot estrutural: empate triplo renderiza DOM estável com exatamente 1 badge 'Melhor score'", () => {
  const variations = [
    buildVariation({ id: "var-snap-1", qualityScore: 80 }, 0),
    buildVariation({ id: "var-snap-2", qualityScore: 80 }, 1),
    buildVariation({ id: "var-snap-3", qualityScore: 80 }, 2),
  ];
  const { container } = renderTied(variations);

  // 1. Assertions defensivas (independentes do snapshot)
  const badges = screen.getAllByLabelText("Melhor score");
  expect(badges).toHaveLength(1);
  const listItems = screen.getAllByRole("listitem");
  expect(listItems).toHaveLength(3);

  // 2. Snapshot estrutural focado: extrai apenas a região de badges + scores
  //    Filtra ruído (URLs de imagens com timestamp, classes utilitárias longas)
  //    e congela a estrutura crítica que define cardinalidade visual.
  const comparatorSection = container.querySelector('[aria-label="Comparador de variações"]');
  expect(comparatorSection).not.toBeNull();

  // Extrai estrutura crítica: badges + spans de score por listitem
  const structuralSummary = Array.from(listItems).map((item, idx) => {
    const badge = item.querySelector('[aria-label="Melhor score"]');
    const scoreSpan = item.querySelector('[aria-label^="Score"]');
    return {
      index: idx,
      hasBadge: badge !== null,
      badgeText: badge?.textContent?.trim() ?? null,
      scoreLabel: scoreSpan?.getAttribute("aria-label") ?? null,
      ariaPressed: item.querySelector('button[aria-pressed]')?.getAttribute("aria-pressed") ?? null,
    };
  });

  expect(structuralSummary).toMatchInlineSnapshot(`
    [
      {
        "ariaPressed": "true",
        "badgeText": "Melhor score",
        "hasBadge": true,
        "index": 0,
        "scoreLabel": "Score 80 de 100",
      },
      {
        "ariaPressed": "false",
        "badgeText": null,
        "hasBadge": false,
        "index": 1,
        "scoreLabel": "Score 80 de 100",
      },
      {
        "ariaPressed": "false",
        "badgeText": null,
        "hasBadge": false,
        "index": 2,
        "scoreLabel": "Score 80 de 100",
      },
    ]
  `);

  // 3. Snapshot do header (bestScore badge) — região independente
  const header = container.querySelector('[aria-label^="Melhor score entre variações"]');
  expect(header?.getAttribute("aria-label")).toMatchInlineSnapshot(
    `"Melhor score entre variações: 80"`
  );
});
```

## Por que snapshot **estruturado** em vez de HTML completo

Snapshot de HTML cru (`container.innerHTML`) seria frágil: quebra a cada mudança de classe Tailwind, ordem de atributos, ou URL de imagem. O snapshot **estruturado** (objeto extraído) captura apenas as invariantes que importam:

- Cardinalidade de badges (`hasBadge` boolean)
- Conteúdo textual da badge
- Score formatado (aria-label)
- Estado de seleção (`aria-pressed`)

Resultado: teste **estável** contra refatorações cosméticas, **rigoroso** contra regressões funcionais.

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Reusa `buildVariation`, `renderTied`, `screen` já presentes
- Sem novos imports (usa `container` já retornado por `renderTied`/`render`)
- Snapshot **inline** versionado no próprio arquivo
- Defesa em profundidade: 2 assertions diretas + 2 snapshots focados

## Pré-requisito de validação

Confirmar que `renderTied` retorna `{ container }` (padrão do `render()` do Testing Library). Caso já desestruture só `unmount`, ajustar para incluir `container`. Se `renderTied` for um wrapper que não exponha `container`, usar `screen` + `document.body` como fallback no snapshot.

## Entregável

- 1 novo teste no grupo de empate (72 → 73 testes)
- Trava 5 invariantes:
  1. Cardinalidade de listitem (=3)
  2. Cardinalidade de badge (=1)
  3. Posição do winner (índice 0)
  4. Score formatado correto em todos os cards
  5. Estado de seleção inicial (`aria-pressed=true` apenas no índice 0)
- Snapshot inline força revisão consciente em qualquer mudança estrutural
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 73/73 verde

