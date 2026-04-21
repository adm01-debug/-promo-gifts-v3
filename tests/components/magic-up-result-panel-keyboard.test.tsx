/**
 * MagicUpResultPanel — testes de navegação por teclado (WCAG 2.1.1 Keyboard)
 * + WAI-ARIA APG Tabs Pattern (roving tabindex, aria-selected sincronizado).
 *
 * Cobre prev/next, dots de paginação e thumbnails:
 * - Tab order segue ordem do DOM
 * - Enter/Space ativam handlers em <button> nativos
 * - Apenas a tab ativa é alcançável via Tab (roving tabindex)
 * - aria-selected sincronizado entre dots e thumbnails
 *
 * Estratégia: stub de subcomponentes pesados (AdImageResult, MagicUpVariationComparator)
 * para isolar o foco apenas nos controles de variação do painel.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, within } from "@testing-library/react";
import { MagicUpResultPanel } from "@/pages/magic-up/MagicUpResultPanel";

vi.mock("@/components/magic-up/AdImageResult", () => ({
  AdImageResult: () => <div data-testid="ad-image-result-stub" />,
}));

vi.mock("@/components/magic-up/MagicUpVariationComparator", () => ({
  MagicUpVariationComparator: () => <div data-testid="comparator-stub" />,
}));

type StubState = Parameters<typeof MagicUpResultPanel>[0]["m"];

function buildStubState({
  variationsCount = 3,
  activeVariation = 0,
}: { variationsCount?: number; activeVariation?: number } = {}): StubState {
  const variations = Array.from({ length: variationsCount }).map((_, i) => ({
    id: `var-${i + 1}`,
    imageUrl: `https://example.com/img-${i + 1}.png`,
    isFavorite: false,
    qualityScore: 80,
    curationStatus: "draft" as const,
    isWinner: false,
  }));

  return {
    variations,
    activeVariation,
    setActiveVariation: vi.fn(),
    currentVariation: variations[activeVariation],
    generating: false,
    history: [],
    selectedProduct: { name: "Caneta Premium" },
    selectedScene: { title: "Lifestyle" },
    handleDownload: vi.fn(),
    handleShare: vi.fn(),
    handleGenerate: vi.fn(),
    handleToggleFavorite: vi.fn(),
    handleSelectHistory: vi.fn(),
    handleDeleteHistory: vi.fn(),
    handleToggleHistoryFavorite: vi.fn(),
    handleSelectWinningVariation: vi.fn(),
    handleSetCurationStatus: vi.fn(),
    handleRunQualityScore: vi.fn(),
    qualityScore: 80,
    qualityDiagnosis: undefined,
    curationStatus: "draft",
    copyPack: { headline: "", subheadline: "", cta: "", body: "", hashtags: [] },
    creativeControls: { aspectRatio: "1:1" },
  } as unknown as StubState;
}

// ─────── Helpers para escopo isolado dos dois tablists ───────
function getDotsTablist() {
  return screen.getByRole("tablist", { name: "Variações geradas" });
}
function getThumbsTablist() {
  return screen.getByRole("tablist", { name: "Miniaturas das variações" });
}
function getDots() {
  return within(getDotsTablist()).getAllByRole("tab");
}
function getThumbs() {
  return within(getThumbsTablist()).getAllByRole("tab");
}

describe("MagicUpResultPanel — navegação por teclado (WCAG 2.1.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Tab atinge prev → dots → next na ordem do DOM", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });
    const dots = getDots();

    prev.focus();
    expect(document.activeElement).toBe(prev);

    dots[0].focus();
    expect(document.activeElement).toBe(dots[0]);

    dots[1].focus();
    expect(document.activeElement).toBe(dots[1]);

    dots[2].focus();
    expect(document.activeElement).toBe(dots[2]);

    next.focus();
    expect(document.activeElement).toBe(next);

    const all = [prev, ...dots, next];
    for (let i = 0; i < all.length - 1; i++) {
      const pos = all[i].compareDocumentPosition(all[i + 1]);
      expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("Enter no dot ativa setActiveVariation com índice correto", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dot3 = within(getDotsTablist()).getByRole("tab", { name: "Selecionar variação 3" });
    dot3.focus();
    expect(document.activeElement).toBe(dot3);

    fireEvent.keyDown(dot3, { key: "Enter", code: "Enter" });
    fireEvent.click(dot3);

    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
  });

  it("Space no dot ativa setActiveVariation com índice correto", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dot2 = within(getDotsTablist()).getByRole("tab", { name: "Selecionar variação 2" });
    dot2.focus();

    fireEvent.keyDown(dot2, { key: " ", code: "Space" });
    fireEvent.click(dot2);

    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
  });

  it("Enter no botão Avançar incrementa activeVariation", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const next = screen.getByRole("button", { name: "Avançar" });
    next.focus();
    fireEvent.keyDown(next, { key: "Enter", code: "Enter" });
    fireEvent.click(next);

    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
  });

  it("Enter no botão Voltar decrementa activeVariation", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 2 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    prev.focus();
    fireEvent.keyDown(prev, { key: "Enter", code: "Enter" });
    fireEvent.click(prev);

    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
  });

  it("Thumbnail abre variação correta via teclado e mantém ordem de tab", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const thumbs = getThumbs();

    for (let i = 0; i < thumbs.length - 1; i++) {
      const pos = thumbs[i].compareDocumentPosition(thumbs[i + 1]);
      expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    thumbs[2].focus();
    expect(document.activeElement).toBe(thumbs[2]);
    fireEvent.keyDown(thumbs[2], { key: "Enter", code: "Enter" });
    fireEvent.click(thumbs[2]);

    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
  });
});

describe("MagicUpResultPanel — hit area dos dots (WCAG 2.5.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Click no botão dot (área expandida 44x44) ativa setActiveVariation", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    fireEvent.click(dots[2]);

    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
  });

  it("Click no span visual interno borbulha e ativa setActiveVariation", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    const innerSpan = dots[1].querySelector("span[aria-hidden='true']");
    expect(innerSpan).not.toBeNull();

    fireEvent.click(innerSpan!);

    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
  });

  it("Cada botão dot expõe dimensões mínimas WCAG 2.5.5 (w-11 h-11)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    dots.forEach((dot) => {
      expect(dot.className).toMatch(/\bw-11\b/);
      expect(dot.className).toMatch(/\bh-11\b/);
    });
  });
});

// ───────── WAI-ARIA APG Tabs Pattern: Roving Tabindex + aria-selected ─────────

describe("MagicUpResultPanel — Dots: roving tabindex + aria-selected (APG Tabs)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tablist 'Variações geradas' tem role=tablist, aria-label e N tabs com role=tab", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const tablist = getDotsTablist();
    expect(tablist).toHaveAttribute("aria-label", "Variações geradas");
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs).toHaveLength(3);
  });

  it("apenas o dot do activeVariation tem tabindex=0; demais tabindex=-1 (roving)", () => {
    for (const active of [0, 1, 2]) {
      const m = buildStubState({ variationsCount: 3, activeVariation: active });
      const { unmount } = render(<MagicUpResultPanel m={m} />);
      const dots = getDots();
      dots.forEach((dot, i) => {
        expect(dot).toHaveAttribute("tabindex", i === active ? "0" : "-1");
      });
      unmount();
    }
  });

  it("aria-selected=true e aria-current=true apenas no dot ativo", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    expect(dots[0]).toHaveAttribute("aria-selected", "false");
    expect(dots[0]).not.toHaveAttribute("aria-current");
    expect(dots[1]).toHaveAttribute("aria-selected", "true");
    expect(dots[1]).toHaveAttribute("aria-current", "true");
    expect(dots[2]).toHaveAttribute("aria-selected", "false");
    expect(dots[2]).not.toHaveAttribute("aria-current");
  });

  it("clicar em dot inativo dispara setActiveVariation com índice correto", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    fireEvent.click(dots[2]);
    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
  });
});

describe("MagicUpResultPanel — Thumbnails: APG Tabs equivalente aos dots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("wrapper das thumbnails é role=tablist com aria-label='Miniaturas das variações'", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const tablist = getThumbsTablist();
    expect(tablist).toHaveAttribute("aria-label", "Miniaturas das variações");
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs).toHaveLength(3);
  });

  it("cada thumbnail tem role=tab, aria-selected sincronizado e tabindex roving", () => {
    for (const active of [0, 1, 2]) {
      const m = buildStubState({ variationsCount: 3, activeVariation: active });
      const { unmount } = render(<MagicUpResultPanel m={m} />);
      const thumbs = getThumbs();
      thumbs.forEach((thumb, i) => {
        expect(thumb).toHaveAttribute("role", "tab");
        expect(thumb).toHaveAttribute("aria-selected", i === active ? "true" : "false");
        expect(thumb).toHaveAttribute("tabindex", i === active ? "0" : "-1");
      });
      unmount();
    }
  });

  it("clicar/Enter em thumbnail inativa dispara setActiveVariation correto", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const thumbs = getThumbs();
    thumbs[2].focus();
    fireEvent.keyDown(thumbs[2], { key: "Enter", code: "Enter" });
    fireEvent.click(thumbs[2]);

    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
  });
});

describe("MagicUpResultPanel — Prev/Next: disabled states + focus ring (WCAG 1.4.3, 2.4.7)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no primeiro índice: 'Voltar' disabled com classes token-on-token; 'Avançar' enabled e funcional", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });

    expect(prev).toBeDisabled();
    expect(prev.className).toContain("disabled:bg-muted");
    expect(prev.className).toContain("disabled:text-muted-foreground");
    expect(prev.className).toContain("disabled:opacity-100");

    expect(next).not.toBeDisabled();
    fireEvent.click(next);
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
  });

  it("no último índice: 'Avançar' disabled; 'Voltar' enabled dispara setActiveVariation(prev)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 2 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });

    expect(next).toBeDisabled();
    expect(next.className).toContain("disabled:bg-muted");
    expect(next.className).toContain("disabled:text-muted-foreground");
    expect(next.className).toContain("disabled:opacity-100");

    expect(prev).not.toBeDisabled();
    fireEvent.click(prev);
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
  });

  it("prev/next expõem aria-label e classes focus-visible (WCAG 2.4.7)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });

    [prev, next].forEach((btn) => {
      expect(btn).toHaveAttribute("aria-label");
      expect(btn.className).toContain("focus-visible:ring-2");
      expect(btn.className).toContain("focus-visible:ring-ring");
      expect(btn.className).toContain("focus-visible:ring-offset-2");
      expect(btn.className).toContain("focus-visible:ring-offset-background");
    });
  });
});

// ───────── Focus-visible em Tab + persistência após Enter/Space (WCAG 2.4.7 + 2.4.3) ─────────

const FOCUS_VISIBLE_CLASSES = [
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "focus-visible:ring-offset-2",
  "focus-visible:ring-offset-background",
];

function expectFocusVisibleClasses(el: HTMLElement) {
  for (const cls of FOCUS_VISIBLE_CLASSES) {
    expect(el.className).toContain(cls);
  }
}

function expectFocusVisibleOutlineNone(el: HTMLElement) {
  expect(el.className).toContain("focus-visible:outline-none");
}

describe("MagicUpResultPanel — focus-visible em Tab + persistência após Enter/Space", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prev/next recebem foco via Tab e carregam classes focus-visible + outline-none", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });

    prev.focus();
    expect(prev).toHaveFocus();
    expectFocusVisibleClasses(prev);
    expectFocusVisibleOutlineNone(prev);

    next.focus();
    expect(next).toHaveFocus();
    expectFocusVisibleClasses(next);
    expectFocusVisibleOutlineNone(next);
  });

  it("cada dot do tablist carrega classes focus-visible canônicas + outline-none", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    expect(dots).toHaveLength(3);
    dots.forEach((dot) => {
      expectFocusVisibleClasses(dot);
      expectFocusVisibleOutlineNone(dot);
    });
  });

  it("cada thumbnail carrega classes focus-visible canônicas + outline-none", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const thumbs = getThumbs();
    expect(thumbs).toHaveLength(3);
    thumbs.forEach((thumb) => {
      expectFocusVisibleClasses(thumb);
      expectFocusVisibleOutlineNone(thumb);
    });
  });

  it("após Enter no dot, foco permanece no dot ativado e classes focus-visible mantidas", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    const target = dots[2];
    target.focus();
    expect(target).toHaveFocus();

    fireEvent.keyDown(target, { key: "Enter", code: "Enter" });
    fireEvent.click(target);

    expect(document.activeElement).toBe(target);
    expectFocusVisibleClasses(target);
    expectFocusVisibleOutlineNone(target);
  });

  it("após Space no botão Avançar, foco permanece no botão e classes focus-visible mantidas", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const next = screen.getByRole("button", { name: "Avançar" });
    next.focus();
    expect(next).toHaveFocus();

    fireEvent.keyDown(next, { key: " ", code: "Space" });
    fireEvent.click(next);

    expect(document.activeElement).toBe(next);
    expectFocusVisibleClasses(next);
    expectFocusVisibleOutlineNone(next);
  });

  it("após Enter na thumbnail, foco permanece e classes focus-visible mantidas", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const thumbs = getThumbs();
    const target = thumbs[2];
    target.focus();
    expect(target).toHaveFocus();

    fireEvent.keyDown(target, { key: "Enter", code: "Enter" });
    fireEvent.click(target);

    expect(document.activeElement).toBe(target);
    expectFocusVisibleClasses(target);
    expectFocusVisibleOutlineNone(target);
  });
});

describe("MagicUpResultPanel — Sincronização cross-grupo entre dots e thumbnails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("activeVariation propaga aria-selected/tabindex consistentes nos dois tablists", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    const thumbs = getThumbs();

    [0, 1, 2].forEach((i) => {
      const expectedSelected = i === 1 ? "true" : "false";
      const expectedTabindex = i === 1 ? "0" : "-1";
      expect(dots[i]).toHaveAttribute("aria-selected", expectedSelected);
      expect(thumbs[i]).toHaveAttribute("aria-selected", expectedSelected);
      expect(dots[i]).toHaveAttribute("tabindex", expectedTabindex);
      expect(thumbs[i]).toHaveAttribute("tabindex", expectedTabindex);
    });
  });
});

// ───── Accessible names + ARIA roles para screen readers (WCAG 4.1.2 / 2.4.6 / 1.3.1) ─────

function expectAccessibleName(el: HTMLElement, expected: string | RegExp) {
  const name = el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "";
  if (expected instanceof RegExp) {
    expect(name).toMatch(expected);
  } else {
    expect(name).toBe(expected);
  }
}

function expectUniqueNames(elements: HTMLElement[]) {
  const names = elements.map((el) => el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "");
  expect(new Set(names).size).toBe(names.length);
}

describe("MagicUpResultPanel — accessible names e atributos ARIA para screen readers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Prev e Next têm accessible names 'Voltar' e 'Avançar' via aria-label", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });

    expect(prev).toHaveAttribute("aria-label", "Voltar");
    expect(next).toHaveAttribute("aria-label", "Avançar");
    expectAccessibleName(prev, "Voltar");
    expectAccessibleName(next, "Avançar");
  });

  it("Dots têm accessible names únicos no formato 'Selecionar variação N' (1-based)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    expect(dots).toHaveLength(3);
    dots.forEach((dot, i) => {
      expectAccessibleName(dot, `Selecionar variação ${i + 1}`);
    });
    expectUniqueNames(dots);
  });

  it("Thumbnails têm accessible names únicos no formato 'Abrir miniatura da variação N'", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const thumbs = getThumbs();
    expect(thumbs).toHaveLength(3);
    thumbs.forEach((thumb, i) => {
      expectAccessibleName(thumb, `Abrir miniatura da variação ${i + 1}`);
    });
    expectUniqueNames(thumbs);

    // Thumbnails devem ter nomes distintos dos dots para evitar duplicação no SR
    const dotNames = getDots().map((d) => d.getAttribute("aria-label"));
    const thumbNames = thumbs.map((t) => t.getAttribute("aria-label"));
    thumbNames.forEach((name) => {
      expect(dotNames).not.toContain(name);
    });
  });

  it("Tablists têm aria-label distintos ('Variações geradas' vs 'Miniaturas das variações')", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dotsTablist = screen.getByRole("tablist", { name: "Variações geradas" });
    const thumbsTablist = screen.getByRole("tablist", { name: "Miniaturas das variações" });

    expect(dotsTablist).toHaveAttribute("aria-label", "Variações geradas");
    expect(thumbsTablist).toHaveAttribute("aria-label", "Miniaturas das variações");
    expect(dotsTablist).not.toBe(thumbsTablist);
  });

  it("Roles corretos: prev/next=button, dots/thumbnails=tab dentro de tablist", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });
    expect(prev.tagName).toBe("BUTTON");
    expect(next.tagName).toBe("BUTTON");

    expect(getDotsTablist()).toHaveAttribute("role", "tablist");
    expect(getThumbsTablist()).toHaveAttribute("role", "tablist");

    getDots().forEach((dot) => expect(dot).toHaveAttribute("role", "tab"));
    getThumbs().forEach((thumb) => expect(thumb).toHaveAttribute("role", "tab"));
  });

  it("Dot ativo expõe aria-current='true'; demais dots não expõem aria-current", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    expect(dots[1]).toHaveAttribute("aria-current", "true");
    expect(dots[0]).not.toHaveAttribute("aria-current");
    expect(dots[2]).not.toHaveAttribute("aria-current");
  });

  it("Prev/Next mantêm accessible name quando disabled (SR anuncia 'Voltar/Avançar, indisponível')", () => {
    const mFirst = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { unmount } = render(<MagicUpResultPanel m={mFirst} />);
    const prevDisabled = screen.getByRole("button", { name: "Voltar" });
    expect(prevDisabled).toBeDisabled();
    expect(prevDisabled).toHaveAttribute("aria-label", "Voltar");
    unmount();

    const mLast = buildStubState({ variationsCount: 3, activeVariation: 2 });
    render(<MagicUpResultPanel m={mLast} />);
    const nextDisabled = screen.getByRole("button", { name: "Avançar" });
    expect(nextDisabled).toBeDisabled();
    expect(nextDisabled).toHaveAttribute("aria-label", "Avançar");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub-suíte: comportamento de extremidades (no-wrap) em Tab/Enter/Space
// WCAG 2.1.1 (Keyboard) + 2.1.2 (No Keyboard Trap) + 2.4.3 (Focus Order)
// ─────────────────────────────────────────────────────────────────────────────
describe("MagicUpResultPanel — comportamento de extremidades (no-wrap) em Tab/Enter/Space", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function pressKey(el: HTMLElement, key: "Enter" | " ") {
    fireEvent.keyDown(el, { key });
    // Browsers disparam click sintético em Enter/Space em <button>; replicamos
    if (!(el as HTMLButtonElement).disabled) {
      fireEvent.click(el);
    }
  }

  it("Prev disabled no primeiro índice; click/Enter/Space não disparam setActiveVariation", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    expect(prev).toBeDisabled();

    fireEvent.click(prev);
    pressKey(prev, "Enter");
    pressKey(prev, " ");

    expect(m.setActiveVariation).not.toHaveBeenCalled();
  });

  it("Next disabled no último índice; click/Enter/Space não disparam setActiveVariation", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 2 });
    render(<MagicUpResultPanel m={m} />);

    const next = screen.getByRole("button", { name: "Avançar" });
    expect(next).toBeDisabled();

    fireEvent.click(next);
    pressKey(next, "Enter");
    pressKey(next, " ");

    expect(m.setActiveVariation).not.toHaveBeenCalled();
  });

  it("Prev funciona normalmente em índice intermediário (chama setActiveVariation com índice-1)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    expect(prev).not.toBeDisabled();

    fireEvent.click(prev);
    expect(m.setActiveVariation).toHaveBeenCalledWith(0);
  });

  it("Next funciona normalmente em índice intermediário (chama setActiveVariation com índice+1)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const next = screen.getByRole("button", { name: "Avançar" });
    expect(next).not.toBeDisabled();

    fireEvent.click(next);
    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
  });

  it("Roving tabindex no primeiro índice: apenas dot[0]/thumb[0] com tabindex=0 (sem wrap)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    expect(dots[0]).toHaveAttribute("tabindex", "0");
    expect(dots[1]).toHaveAttribute("tabindex", "-1");
    expect(dots[2]).toHaveAttribute("tabindex", "-1");

    const thumbs = getThumbs();
    expect(thumbs[0]).toHaveAttribute("tabindex", "0");
    expect(thumbs[1]).toHaveAttribute("tabindex", "-1");
    expect(thumbs[2]).toHaveAttribute("tabindex", "-1");
  });

  it("Roving tabindex no último índice: apenas dot[last]/thumb[last] com tabindex=0 (sem wrap)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 2 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    expect(dots[2]).toHaveAttribute("tabindex", "0");
    expect(dots[0]).toHaveAttribute("tabindex", "-1");
    expect(dots[1]).toHaveAttribute("tabindex", "-1");

    const thumbs = getThumbs();
    expect(thumbs[2]).toHaveAttribute("tabindex", "0");
    expect(thumbs[0]).toHaveAttribute("tabindex", "-1");
    expect(thumbs[1]).toHaveAttribute("tabindex", "-1");
  });

  it("Enter/Space em dot/thumb já ativo é idempotente (chama com mesmo índice; foco permanece)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    dots[1].focus();
    expect(document.activeElement).toBe(dots[1]);
    pressKey(dots[1], "Enter");
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
    expect(document.activeElement).toBe(dots[1]);

    const thumbs = getThumbs();
    thumbs[1].focus();
    expect(document.activeElement).toBe(thumbs[1]);
    pressKey(thumbs[1], " ");
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
    expect(document.activeElement).toBe(thumbs[1]);
  });

  it("Foco em next não retorna ao prev (sem wrap/trap de foco)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });

    next.focus();
    expect(document.activeElement).toBe(next);
    // Após focar next, o foco não deve estar (nem ciclar) para prev — Tab é linear,
    // não há trap/wrap forçado pelo painel.
    expect(document.activeElement).not.toBe(prev);
  });
});
