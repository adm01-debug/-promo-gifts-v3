

# Plano — Refatorar `magic-up-onda5.test.tsx` extraindo helpers de render, fixtures e seletores

Reduzir duplicação massiva no arquivo de testes (1385 linhas) extraindo 4 helpers reutilizáveis no topo do arquivo, sem alterar nenhuma asserção, descrição ou comportamento dos 49 testes.

## Justificativa

Auditoria do arquivo revela duplicação em 4 padrões:
1. **`MagicUpVariationComparator variations={…} activeIndex={…} onSelect={…} onSelectWinner={…}`** repetido ~50× — sempre com `vi.fn()` em pelo menos 2 das 4 props
2. **Arrays inline `const variations: VariationItem[] = [...]`** com 3 variações triviais (id v1/v2/v3, scores variados) repetidos ~13× (apenas 1 helper `buildVariations` existe, isolado em 1 describe)
3. **`userEvent.setup()`** chamado em ~30 testes
4. **`screen.getByRole("button", { name: /Selecionar variação N/ })`** e `screen.getByRole("button", { name: "Marcar variação N como vencedora" })` repetidos ~80× — strings/regex copiadas literalmente

Manter cada teste autocontido prejudica leitura e faz refactors do componente (ex: mudar o formato do `aria-label`) cascatearem em ~80 ocorrências.

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` apenas — sem mudar componentes, snapshots, nem outros testes.

## Helpers a adicionar (no topo, após imports e antes do primeiro `describe`)

```ts
// ───────── Helpers de teste ─────────

/** Fixture padrão: 3 variações com scores [90, 70, 50] — cobre maioria dos testes de comparator/keyboard/focus */
function buildVariations(overrides: Partial<VariationItem>[] = []): VariationItem[] {
  const base: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
  ];
  return base.map((v, i) => ({ ...v, ...(overrides[i] ?? {}) }));
}

/** Render do comparador com defaults vi.fn() para handlers; retorna spies + utilitários */
function renderComparator(props: {
  variations?: VariationItem[];
  activeIndex?: number;
  onSelect?: (i: number) => void;
  onSelectWinner?: (i: number) => void;
} = {}) {
  const onSelect = props.onSelect ?? vi.fn();
  const onSelectWinner = props.onSelectWinner ?? vi.fn();
  const utils = render(
    <MagicUpVariationComparator
      variations={props.variations ?? buildVariations()}
      activeIndex={props.activeIndex ?? 0}
      onSelect={onSelect}
      onSelectWinner={onSelectWinner}
    />
  );
  return { ...utils, onSelect, onSelectWinner, user: userEvent.setup() };
}

/** Seletores ARIA estáveis para elementos do comparador */
const select = {
  card: (n: number) => screen.getByRole("button", { name: new RegExp(`^Selecionar variação ${n}(,|$)`) }),
  cardExact: (name: string) => screen.getByRole("button", { name }),
  marcar: (n: number) => screen.getByRole("button", { name: `Marcar variação ${n} como vencedora` }),
  allCards: () => screen.getAllByRole("button", { name: /^Selecionar variação \d+/ }),
  allMarcar: () => screen.getAllByRole("button", { name: /^Marcar variação \d+ como vencedora$/ }),
};
```

## Refactors aplicados aos testes existentes

Para cada teste do comparator (≈40 dos 49):

- **Substituir** array inline `[{ id: "1"…}, …]` por `buildVariations()` quando o teste só precisa do default; usar `buildVariations([{}, { qualityScore: 92 }, …])` para sobrescrever campos específicos; manter array literal apenas onde a estrutura é genuinamente diferente (ex: empate triplo, scores ausentes, isWinner explícito — ~8 testes)
- **Substituir** chamada `render(<MagicUpVariationComparator … vi.fn() … />)` por `const { onSelect, onSelectWinner, user } = renderComparator({ … })`
- **Substituir** `screen.getByRole("button", { name: /Selecionar variação 2/ })` por `select.card(2)` quando match parcial; manter `select.cardExact("Selecionar variação 2, score 80, melhor score")` para asserts de formato exato
- **Substituir** `screen.getByRole("button", { name: "Marcar variação 3 como vencedora" })` por `select.marcar(3)`
- **Substituir** loop manual de coleta por `select.allCards()` / `select.allMarcar()`

### O que NÃO mudar

- Strings de descrição dos testes (`it("...")`) — preservadas integralmente
- Asserts (`expect(...).toBeInTheDocument()`, `toHaveAttribute`, etc.) — preservados
- Snapshots existentes (`MagicUpVariationComparator snapshots` describe) — testes lá usam variações com IDs/imagens específicas para snapshot determinístico; manter inline para não alterar snapshot files
- Testes que assertam aria-labels exatos com formato dinâmico (matriz com/sem score, com/sem winner) — manter `cardExact` para travar formato
- Testes dos outros componentes (`MagicUpQualityScore`, `MagicUpQualityChecklist`, `MagicUpCurationStatus`) — sem refactor; helpers são específicos do comparator
- `buildVariations` local existente em `MagicUpVariationComparator keyboard navigation` (linha 447) — remover e usar o global

## Estratégia

- **Helpers adicionados no topo** ficam acessíveis a todos os 4 describes
- **`renderComparator` retorna spies já criados** (`onSelect`, `onSelectWinner`) — permite assert direto sem precisar declarar `const onSelect = vi.fn()` antes
- **`select` como namespace de seletores** — colisão de nome com `screen` evitada; nome curto facilita leitura
- **Match por regex `^Selecionar variação N(,|$)`** em `select.card(n)` evita match parcial ambíguo (ex: `select.card(1)` não matcha "Selecionar variação 10")
- **`buildVariations` aceita overrides parciais por índice** — flexível para isWinner, qualityDiagnosis, qualityScore variados sem repetir id/imageUrl/isFavorite

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem alterar snapshots (`__snapshots__/magic-up-onda5.test.tsx.snap`)
- Sem alterar nenhuma asserção, descrição de `it()` ou contagem de testes
- Total continua: 49 testes
- Diff esperado: -250 a -350 linhas no arquivo (1385 → ~1050)

## Entregável

- 1 arquivo refatorado: `tests/components/magic-up-onda5.test.tsx`
- 3 helpers no topo: `buildVariations`, `renderComparator`, `select`
- Boilerplate de render reduzido em ~50 ocorrências
- Arrays de fixture reduzidos em ~13 ocorrências (mantidos onde divergem do default)
- Seletores ARIA padronizados em ~80 ocorrências
- Suite continua passando 49/49 sem mudança em snapshots

