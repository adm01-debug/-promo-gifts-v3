

# Plano — Testes de roving tabindex / aria-selected nos dots, thumbnails e prev/next do `MagicUpResultPanel`

Adiciono uma nova suíte de testes em `tests/components/magic-up-result-panel-keyboard.test.tsx` (arquivo já mencionado no `MAGIC_UP_ONDA5_A11Y.md` como guardião de teclado deste painel) cobrindo o comportamento APG **Tabs + Roving Tabindex** dos três grupos de navegação visual da variação ativa.

## Justificativa

`MagicUpResultPanel` expõe três grupos de controles que navegam entre variações: (1) botões **Voltar/Avançar** (prev/next), (2) **dots** dentro de `role="tablist"`, (3) **thumbnails** abaixo do `AdImageResult`. Para conformidade com WAI-ARIA APG **Tabs Pattern** + WCAG 2.1.1 (Keyboard) e 4.1.2 (Name, Role, Value), o tablist precisa:

- Apenas a tab ativa (`aria-selected="true"`) ser alcançável via Tab — demais com `tabindex="-1"` (roving)
- `aria-selected` sincronizado com `activeVariation` em todos os 3 grupos
- prev/next manterem `disabled` correto nos extremos (já coberto via `disabled:bg-muted` mas sem teste de comportamento)
- Foco visual permanecer no controle correto após navegação

Hoje a inspeção do `MagicUpResultPanel.tsx` (linhas 19-83) revela que **dots têm `role="tab"` + `aria-selected` + `aria-current` mas NÃO têm `tabindex` controlado** — todos ficam alcançáveis via Tab simultaneamente, violando o APG Tabs pattern. Os testes vão **detectar essa lacuna** e travar o contrato após o ajuste no componente.

## Arquivos alterados

### 1. `src/pages/magic-up/MagicUpResultPanel.tsx`

Adicionar **roving tabindex** ao tablist de dots:

- Cada dot recebe `tabindex={i === m.activeVariation ? 0 : -1}` — apenas o ativo é alcançável via Tab
- Thumbnails (segundo loop, linhas 73-83) recebem o mesmo padrão: `tabindex={i === m.activeVariation ? 0 : -1}` + `aria-selected={i === m.activeVariation}` + `role="tab"` (atualmente são botões "soltos" sem semântica de tab)
- Wrapper das thumbnails ganha `role="tablist"` + `aria-label="Miniaturas das variações"` para parear com o tablist dos dots
- Sem alterar layout, classes Tailwind, handlers existentes ou aria-labels já presentes

### 2. `tests/components/magic-up-result-panel-keyboard.test.tsx`

Novo arquivo com 3 sub-suítes (~10 testes). Como `MagicUpResultPanel` recebe um objeto `m` enorme do `useMagicUpState`, os testes usam um **harness mínimo** que monta apenas as partes do retorno necessárias (variations, activeVariation, setActiveVariation, currentVariation) com stubs `vi.fn()` e dados vazios para o resto. `AdImageResult` e `MagicUpVariationComparator` filhos são mockados via `vi.mock()` para isolar o painel.

#### Helpers no topo do arquivo

```ts
function buildPanelState(activeVariation = 0, total = 3) {
  const variations = Array.from({ length: total }, (_, i) => ({
    id: `v${i + 1}`,
    imageUrl: `https://example.com/${i + 1}.png`,
    isFavorite: false,
    qualityScore: 80 + i,
  }));
  const setActiveVariation = vi.fn();
  return {
    variations,
    activeVariation,
    setActiveVariation,
    currentVariation: variations[activeVariation],
    selectedProduct: null,
    selectedScene: null,
    generating: false,
    history: [],
    qualityScore: null,
    qualityDiagnosis: null,
    curationStatus: "draft",
    copyPack: null,
    creativeControls: { aspectRatio: "1:1" },
    handleDownload: vi.fn(),
    handleShare: vi.fn(),
    handleGenerate: vi.fn(),
    handleToggleFavorite: vi.fn(),
    handleSelectHistory: vi.fn(),
    handleDeleteHistory: vi.fn(),
    handleToggleHistoryFavorite: vi.fn(),
    handleSetCurationStatus: vi.fn(),
    handleRunQualityScore: vi.fn(),
    handleSelectWinningVariation: vi.fn(),
  } as any;
}

function renderPanel(activeVariation = 0, total = 3) {
  const m = buildPanelState(activeVariation, total);
  const utils = render(<MagicUpResultPanel m={m} />);
  return { ...utils, m, user: userEvent.setup() };
}
```

Mocks de filhos (no topo, antes do `describe`):

```ts
vi.mock("@/components/magic-up/AdImageResult", () => ({
  AdImageResult: () => <div data-testid="ad-image-result-stub" />,
}));
vi.mock("@/components/magic-up/MagicUpVariationComparator", () => ({
  MagicUpVariationComparator: () => <div data-testid="comparator-stub" />,
}));
```

#### Sub-suíte 1 — Dots: roving tabindex + aria-selected + tablist semantics

- **Teste 1**: tablist tem `role="tablist"` e `aria-label="Variações geradas"`; contém exatamente N tabs com `role="tab"`
- **Teste 2**: apenas o dot do `activeVariation` tem `tabindex="0"`; todos os outros têm `tabindex="-1"` (roving) — varre cada índice de 0 a 2 via re-render
- **Teste 3**: `aria-selected="true"` apenas no dot ativo; `aria-selected="false"` (ou ausente) nos demais; `aria-current="true"` apenas no ativo
- **Teste 4**: clicar (ou Enter via teclado) em dot inativo chama `setActiveVariation(i)` com índice correto; foco do teclado pula apenas para o dot ativo via Tab (loop com `user.tab()` confirma que demais dots são pulados)

#### Sub-suíte 2 — Thumbnails: mesmo contrato APG Tabs

- **Teste 5**: wrapper das thumbnails expõe `role="tablist"` + `aria-label="Miniaturas das variações"`
- **Teste 6**: cada thumbnail tem `role="tab"`, `aria-selected` sincronizado, e `tabindex` roving (apenas a ativa = 0)
- **Teste 7**: clicar/Enter em thumbnail inativa chama `setActiveVariation(i)` correto

#### Sub-suíte 3 — Prev/Next: estados disabled + comportamento

- **Teste 8**: no `activeVariation=0`, botão "Voltar" tem `disabled` + classes `disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100` (contraste WCAG 1.4.3, não usa `opacity-50`); "Avançar" enabled e clicável dispara `setActiveVariation(1)`
- **Teste 9**: no `activeVariation=2` (último), inverso — "Avançar" disabled, "Voltar" enabled dispara `setActiveVariation(1)`
- **Teste 10**: ambos prev/next têm classes `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` (WCAG 2.4.7); `aria-label` "Voltar" / "Avançar" expostos

#### Sub-suíte 4 — Sincronização cross-grupo

- **Teste 11**: re-render com `activeVariation=1` propaga `aria-selected="true"` simultaneamente no dot 2 E no thumbnail 2; demais ficam `aria-selected="false"`/`tabindex="-1"` em ambos os grupos — garante que os dois tablists nunca dessincronizam

## Estratégia técnica

- **Mock `useMagicUpState`**: não montar o hook real (depende de Supabase, IA, history). Apenas o subset necessário do retorno é injetado via `m` prop direta.
- **Mock filhos pesados** (`AdImageResult`, `MagicUpVariationComparator`): isola o painel em si; ambos têm suítes próprias.
- **Loop sobre `[0, 1, 2]`** para validar roving: re-renderiza com cada `activeVariation`, confirma simetria sem hardcodar índices.
- **`screen.getByRole("tablist", { name: "Variações geradas" })`** e `within(tablist).getAllByRole("tab")` para escopo isolado.
- **`expect(tab).toHaveAttribute("tabindex", "0" | "-1")`** trava roving tabindex.
- **Não usar `userEvent.tab()` extensivamente** entre dots (roving torna inúteis Tabs entre tabs); usar para confirmar que apenas 1 dot é alcançável.

## Restrições

- Sem alterar `MagicUpVariationComparator`, `AdImageResult`, snapshots existentes, ou outros testes.
- Mudança no componente é **aditiva** (adicionar `tabindex`/`role`/`aria-label`), não remove nada.
- Padrão APG Tabs aplicado: dots e thumbnails ficam **funcionalmente equivalentes** (dois tablists espelhados navegando o mesmo `activeVariation`) — comportamento intencional já presente no design.
- Testes não dependem de tema, fontes ou Supabase.

## Entregável

- `MagicUpResultPanel.tsx`: roving tabindex nos dots + thumbnails promovidas a `role="tab"` dentro de `role="tablist"` com `aria-label`
- `tests/components/magic-up-result-panel-keyboard.test.tsx`: ~11 testes em 4 sub-suítes
- Trava contrato WAI-ARIA APG Tabs Pattern: apenas tab ativa alcançável via Tab, `aria-selected` sincronizado, roving tabindex correto
- Trava contrato WCAG 2.1.1 (Keyboard) + 2.4.7 (Focus Visible) + 4.1.2 (Name, Role, Value) para os 3 grupos de navegação visual
- Cobertura nova: 49 → 60 testes na suíte Onda 5

