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
import { render, fireEvent, screen, within, createEvent } from "@testing-library/react";
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

// ───────── Retorno de foco após troca de variação ativa (WCAG 2.4.3, 2.4.7, 3.2.1) ─────────

describe("MagicUpResultPanel — retorno de foco após troca de variação ativa", () => {
  beforeEach(() => vi.clearAllMocks());

  function activate(el: HTMLElement, key: "click" | "Enter" | " " = "click") {
    el.focus();
    if (key === "click") {
      fireEvent.click(el);
    } else {
      fireEvent.keyDown(el, { key });
      fireEvent.click(el);
    }
  }

  function rerenderWithActive(
    rerender: (ui: React.ReactElement) => void,
    m: StubState,
    newActive: number
  ) {
    const updated = {
      ...m,
      activeVariation: newActive,
      currentVariation: m.variations[newActive],
    } as StubState;
    rerender(<MagicUpResultPanel m={updated} />);
  }

  it("Click em dot[2] mantém foco em dot[2] após re-render com active=2", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    activate(getDots()[2], "click");
    expect(m.setActiveVariation).toHaveBeenCalledWith(2);

    rerenderWithActive(rerender, m, 2);

    const dotsAfter = getDots();
    expect(document.activeElement).toBe(dotsAfter[2]);
    expect(dotsAfter[0]).toHaveAttribute("tabindex", "-1");
    expect(dotsAfter[1]).toHaveAttribute("tabindex", "-1");
    expect(dotsAfter[2]).toHaveAttribute("tabindex", "0");
  });

  it("Enter em dot[1] mantém foco em dot[1] após re-render com active=1", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    activate(getDots()[1], "Enter");
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);

    rerenderWithActive(rerender, m, 1);

    const dotsAfter = getDots();
    expect(document.activeElement).toBe(dotsAfter[1]);
    expect(dotsAfter[0]).toHaveAttribute("tabindex", "-1");
    expect(dotsAfter[1]).toHaveAttribute("tabindex", "0");
    expect(dotsAfter[2]).toHaveAttribute("tabindex", "-1");
  });

  it("Click em thumb[2] mantém foco em thumb[2] após re-render com active=2", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    activate(getThumbs()[2], "click");
    expect(m.setActiveVariation).toHaveBeenCalledWith(2);

    rerenderWithActive(rerender, m, 2);

    const thumbsAfter = getThumbs();
    expect(document.activeElement).toBe(thumbsAfter[2]);
    expect(thumbsAfter[2]).toHaveAttribute("tabindex", "0");
  });

  it("Space em thumb[1] mantém foco em thumb[1] após re-render com active=1", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    activate(getThumbs()[1], " ");
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);

    rerenderWithActive(rerender, m, 1);

    const thumbsAfter = getThumbs();
    expect(document.activeElement).toBe(thumbsAfter[1]);
    expect(thumbsAfter[0]).toHaveAttribute("tabindex", "-1");
    expect(thumbsAfter[1]).toHaveAttribute("tabindex", "0");
    expect(thumbsAfter[2]).toHaveAttribute("tabindex", "-1");
  });

  it("Ativar dot[N] NÃO desloca foco para thumb[N] (grupos independentes)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    activate(getDots()[2], "Enter");
    rerenderWithActive(rerender, m, 2);

    const dotsAfter = getDots();
    const thumbsAfter = getThumbs();
    expect(document.activeElement).toBe(dotsAfter[2]);
    expect(document.activeElement).not.toBe(thumbsAfter[2]);
    // Roving da thumbnail também atualizou, mas foco DOM permanece no dot
    expect(thumbsAfter[2]).toHaveAttribute("tabindex", "0");
  });

  it("Ativar thumb[N] NÃO desloca foco para dot[N] (espelho do anterior)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    activate(getThumbs()[1], "click");
    rerenderWithActive(rerender, m, 1);

    const dotsAfter = getDots();
    const thumbsAfter = getThumbs();
    expect(document.activeElement).toBe(thumbsAfter[1]);
    expect(document.activeElement).not.toBe(dotsAfter[1]);
    expect(dotsAfter[1]).toHaveAttribute("tabindex", "0");
  });

  it("Após ativar dot[2], roving tabindex está totalmente re-sincronizado nos dois grupos", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    activate(getDots()[2], "Enter");
    rerenderWithActive(rerender, m, 2);

    const dotsAfter = getDots();
    const thumbsAfter = getThumbs();

    expect(dotsAfter[0]).toHaveAttribute("tabindex", "-1");
    expect(dotsAfter[1]).toHaveAttribute("tabindex", "-1");
    expect(dotsAfter[2]).toHaveAttribute("tabindex", "0");
    expect(thumbsAfter[0]).toHaveAttribute("tabindex", "-1");
    expect(thumbsAfter[1]).toHaveAttribute("tabindex", "-1");
    expect(thumbsAfter[2]).toHaveAttribute("tabindex", "0");

    // Boundary correto pós-ativação: active=2 (último) → next disabled, prev enabled
    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });
    expect(prev).not.toBeDisabled();
    expect(next).toBeDisabled();
  });
});

// ───────────────────────────────────────────────────────────────────
// Sub-suíte: navegação por setas (APG Tabs Pattern) nos dots e thumbnails
// ───────────────────────────────────────────────────────────────────
describe("MagicUpResultPanel — navegação por setas nos dots e thumbnails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ArrowRight em dot[0] move foco para dot[1] e chama setActiveVariation(1)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    dots[0].focus();
    fireEvent.keyDown(dots[0], { key: "ArrowRight" });
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
    expect(document.activeElement).toBe(getDots()[1]);
  });

  it("ArrowLeft em dot[1] move foco para dot[0] e chama setActiveVariation(0)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    dots[1].focus();
    fireEvent.keyDown(dots[1], { key: "ArrowLeft" });
    expect(m.setActiveVariation).toHaveBeenCalledWith(0);
    expect(document.activeElement).toBe(getDots()[0]);
  });

  it("ArrowRight em dot[last] faz wrap para dot[0] (ciclo APG)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 2 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    dots[2].focus();
    fireEvent.keyDown(dots[2], { key: "ArrowRight" });
    expect(m.setActiveVariation).toHaveBeenCalledWith(0);
    expect(document.activeElement).toBe(getDots()[0]);
  });

  it("ArrowLeft em dot[0] faz wrap para dot[last] (ciclo APG)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    dots[0].focus();
    fireEvent.keyDown(dots[0], { key: "ArrowLeft" });
    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
    expect(document.activeElement).toBe(getDots()[2]);
  });

  it("Home em dot[2] move foco para dot[0]", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 2 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    dots[2].focus();
    fireEvent.keyDown(dots[2], { key: "Home" });
    expect(m.setActiveVariation).toHaveBeenCalledWith(0);
    expect(document.activeElement).toBe(getDots()[0]);
  });

  it("End em dot[0] move foco para dot[last]", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    dots[0].focus();
    fireEvent.keyDown(dots[0], { key: "End" });
    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
    expect(document.activeElement).toBe(getDots()[2]);
  });

  it("ArrowDown e ArrowUp funcionam idênticos a ArrowRight/Left (suporte vertical)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    dots[1].focus();
    fireEvent.keyDown(dots[1], { key: "ArrowDown" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(2);
    expect(document.activeElement).toBe(getDots()[2]);

    getDots()[1].focus();
    fireEvent.keyDown(getDots()[1], { key: "ArrowUp" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(0);
    expect(document.activeElement).toBe(getDots()[0]);
  });

  it("preventDefault é chamado para setas — não causa scroll da página", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dot = getDots()[0];
    dot.focus();
    const event = createEvent.keyDown(dot, { key: "ArrowRight" });
    fireEvent(dot, event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Mesma navegação por setas funciona em thumbnails (ArrowRight/Left/Home/End)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const thumbs = getThumbs();
    thumbs[0].focus();
    fireEvent.keyDown(thumbs[0], { key: "ArrowRight" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(1);
    expect(document.activeElement).toBe(getThumbs()[1]);

    getThumbs()[1].focus();
    fireEvent.keyDown(getThumbs()[1], { key: "ArrowLeft" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(0);
    expect(document.activeElement).toBe(getThumbs()[0]);

    getThumbs()[0].focus();
    fireEvent.keyDown(getThumbs()[0], { key: "End" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(2);
    expect(document.activeElement).toBe(getThumbs()[2]);
  });

  it("Atributo aria-keyshortcuts presente em todos os dots e thumbnails", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const expected = "ArrowLeft ArrowRight ArrowUp ArrowDown Home End";
    getDots().forEach((dot) => {
      expect(dot).toHaveAttribute("aria-keyshortcuts", expected);
    });
    getThumbs().forEach((thumb) => {
      expect(thumb).toHaveAttribute("aria-keyshortcuts", expected);
    });
  });
});

// ───────── APG Tabs — gaps de cobertura: N=2/N=1, thumbnails verticais, teclas ignoradas, sincronia com tabindex ─────────
describe("MagicUpResultPanel — setas APG (cobertura adicional de bordas e thumbnails)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Bordas N=2 (menor caso com wrap) e N=1 (no-op) ──

  it("N=2: ArrowRight em dot[1] faz wrap para dot[0]", () => {
    const m = buildStubState({ variationsCount: 2, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    expect(dots).toHaveLength(2);
    dots[1].focus();
    fireEvent.keyDown(dots[1], { key: "ArrowRight" });
    expect(m.setActiveVariation).toHaveBeenCalledWith(0);
    expect(document.activeElement).toBe(getDots()[0]);
  });

  it("N=2: ArrowLeft em dot[0] faz wrap para dot[1]", () => {
    const m = buildStubState({ variationsCount: 2, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    dots[0].focus();
    fireEvent.keyDown(dots[0], { key: "ArrowLeft" });
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
    expect(document.activeElement).toBe(getDots()[1]);
  });

  it("N=1: dots/thumbs não são renderizados; setActiveVariation não é chamado", () => {
    // Com N=1 o painel não renderiza prev/next/dots/thumbs (gating `variations.length > 1`).
    const m = buildStubState({ variationsCount: 1, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    expect(screen.queryByRole("tablist", { name: "Variações geradas" })).toBeNull();
    expect(screen.queryByRole("tablist", { name: "Miniaturas das variações" })).toBeNull();
    expect(m.setActiveVariation).not.toHaveBeenCalled();
  });

  // ── Thumbnails: paridade completa com dots em ArrowUp/Down + wrap + Home + preventDefault ──

  it("Thumbnails: ArrowDown em thumb[0] move para thumb[1] (suporte vertical)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const thumbs = getThumbs();
    thumbs[0].focus();
    fireEvent.keyDown(thumbs[0], { key: "ArrowDown" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(1);
    expect(document.activeElement).toBe(getThumbs()[1]);
  });

  it("Thumbnails: ArrowUp em thumb[1] move para thumb[0] (suporte vertical)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);
    const thumbs = getThumbs();
    thumbs[1].focus();
    fireEvent.keyDown(thumbs[1], { key: "ArrowUp" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(0);
    expect(document.activeElement).toBe(getThumbs()[0]);
  });

  it("Thumbnails: ArrowRight em thumb[last] faz wrap para thumb[0]", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 2 });
    render(<MagicUpResultPanel m={m} />);
    const thumbs = getThumbs();
    thumbs[2].focus();
    fireEvent.keyDown(thumbs[2], { key: "ArrowRight" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(0);
    expect(document.activeElement).toBe(getThumbs()[0]);
  });

  it("Thumbnails: ArrowLeft em thumb[0] faz wrap para thumb[last]", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const thumbs = getThumbs();
    thumbs[0].focus();
    fireEvent.keyDown(thumbs[0], { key: "ArrowLeft" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(2);
    expect(document.activeElement).toBe(getThumbs()[2]);
  });

  it("Thumbnails: Home em thumb[2] move para thumb[0]", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 2 });
    render(<MagicUpResultPanel m={m} />);
    const thumbs = getThumbs();
    thumbs[2].focus();
    fireEvent.keyDown(thumbs[2], { key: "Home" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(0);
    expect(document.activeElement).toBe(getThumbs()[0]);
  });

  it("Thumbnails: preventDefault chamado para setas (consistente com dots)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const thumb = getThumbs()[0];
    thumb.focus();
    const event = createEvent.keyDown(thumb, { key: "ArrowRight" });
    fireEvent(thumb, event);
    expect(event.defaultPrevented).toBe(true);
  });

  // ── Teclas ignoradas: não causam side-effects (handler retorna sem preventDefault) ──

  it.each(["a", "Tab", "Shift", "Escape", "Backspace"])(
    "Tecla '%s' em dot é ignorada — não chama setActiveVariation e não previne default",
    (key) => {
      const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
      render(<MagicUpResultPanel m={m} />);
      const dot = getDots()[0];
      dot.focus();
      const event = createEvent.keyDown(dot, { key });
      fireEvent(dot, event);
      expect(event.defaultPrevented).toBe(false);
      expect(m.setActiveVariation).not.toHaveBeenCalled();
    }
  );

  it.each(["a", "Tab", "Escape"])(
    "Tecla '%s' em thumbnail é ignorada — não chama setActiveVariation e não previne default",
    (key) => {
      const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
      render(<MagicUpResultPanel m={m} />);
      const thumb = getThumbs()[0];
      thumb.focus();
      const event = createEvent.keyDown(thumb, { key });
      fireEvent(thumb, event);
      expect(event.defaultPrevented).toBe(false);
      expect(m.setActiveVariation).not.toHaveBeenCalled();
    }
  );
});

describe("MagicUpResultPanel — retenção de foco em click no dot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function clickAndCheckFocus(el: HTMLButtonElement) {
    el.focus();
    expect(document.activeElement).toBe(el);
    fireEvent.click(el);
    return document.activeElement;
  }

  it("Click em dot[0] mantém foco em dot[0] e chama setActiveVariation(0)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    const after = clickAndCheckFocus(dots[0]);
    expect(after).toBe(getDots()[0]);
    expect(m.setActiveVariation).toHaveBeenCalledWith(0);
  });

  it("Click em dot[meio] mantém foco em dot[meio]", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    const after = clickAndCheckFocus(dots[1]);
    expect(after).toBe(getDots()[1]);
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
  });

  it("Click em dot[last] mantém foco em dot[last]", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    const after = clickAndCheckFocus(dots[2]);
    expect(after).toBe(getDots()[2]);
    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
  });

  it("Click em dot NÃO move foco para o thumbnail correspondente", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    clickAndCheckFocus(dots[2]);
    expect(document.activeElement).not.toBe(getThumbs()[2]);
    expect(document.activeElement).toBe(getDots()[2]);
  });

  it("Click em dot NÃO move foco para prev/next", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    clickAndCheckFocus(dots[2]);
    const prev = screen.getByLabelText("Voltar");
    const next = screen.getByLabelText("Avançar");
    expect(document.activeElement).not.toBe(prev);
    expect(document.activeElement).not.toBe(next);
    expect(document.activeElement).toBe(getDots()[2]);
  });

  it("Click em dot NÃO perde foco para document.body em todas as posições", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    [0, 1, 2].forEach((i) => {
      const dot = getDots()[i];
      clickAndCheckFocus(dot);
      expect(document.activeElement).not.toBe(document.body);
      expect(document.activeElement).toBe(getDots()[i]);
    });
  });
});

// ───────── Atributos ARIA dinâmicos refletem variação ativa (WCAG 4.1.2) ─────────

describe("MagicUpResultPanel — atributos ARIA dinâmicos refletem variação ativa", () => {
  beforeEach(() => vi.clearAllMocks());

  function expectAriaSelectedState(elements: HTMLElement[], activeIndex: number) {
    elements.forEach((el, i) => {
      const expected = i === activeIndex ? "true" : "false";
      expect(el.getAttribute("aria-selected")).toBe(expected);
    });
  }

  function expectTabIndexState(elements: HTMLElement[], activeIndex: number) {
    elements.forEach((el, i) => {
      expect(el.tabIndex).toBe(i === activeIndex ? 0 : -1);
    });
  }

  function rerenderWithActive(
    rerender: (ui: React.ReactElement) => void,
    m: StubState,
    newActive: number
  ) {
    const updated = {
      ...m,
      activeVariation: newActive,
      currentVariation: m.variations[newActive],
    } as StubState;
    rerender(<MagicUpResultPanel m={updated} />);
  }

  it("aria-selected inicial reflete activeVariation=0 nos dots", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    expectAriaSelectedState(getDots(), 0);
  });

  it("aria-selected migra após re-render com novo active (0 → 2)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);
    expectAriaSelectedState(getDots(), 0);

    rerenderWithActive(rerender, m, 2);
    expectAriaSelectedState(getDots(), 2);
  });

  it("aria-selected em thumbnails segue mesmo contrato após re-render (1 → 0)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);
    expectAriaSelectedState(getThumbs(), 1);

    rerenderWithActive(rerender, m, 0);
    expectAriaSelectedState(getThumbs(), 0);
  });

  it("tabIndex sincronizado com aria-selected nos dots após re-render (1 → 2)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);
    expectTabIndexState(getDots(), 1);
    expectAriaSelectedState(getDots(), 1);

    rerenderWithActive(rerender, m, 2);
    expectTabIndexState(getDots(), 2);
    expectAriaSelectedState(getDots(), 2);
  });

  it("aria-current='true' reflete o ativo apenas no dot ativo após re-render", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);
    rerenderWithActive(rerender, m, 2);

    const dots = getDots();
    expect(dots[0]).not.toHaveAttribute("aria-current");
    expect(dots[1]).not.toHaveAttribute("aria-current");
    expect(dots[2]).toHaveAttribute("aria-current", "true");
  });

  it("múltiplas trocas sequenciais (0 → 2 → 1 → 0) atualizam ARIA sem estado fantasma", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);
    expectAriaSelectedState(getDots(), 0);
    expectTabIndexState(getDots(), 0);

    rerenderWithActive(rerender, m, 2);
    expectAriaSelectedState(getDots(), 2);
    expectTabIndexState(getDots(), 2);

    rerenderWithActive(rerender, m, 1);
    expectAriaSelectedState(getDots(), 1);
    expectTabIndexState(getDots(), 1);

    rerenderWithActive(rerender, m, 0);
    expectAriaSelectedState(getDots(), 0);
    expectTabIndexState(getDots(), 0);

    // Também valida thumbnails no estado final
    expectAriaSelectedState(getThumbs(), 0);
    expectTabIndexState(getThumbs(), 0);
  });

  it("após ArrowRight + re-render, ARIA reflete novo ativo nos dots", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    dots[0].focus();
    fireEvent.keyDown(dots[0], { key: "ArrowRight" });
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);

    rerenderWithActive(rerender, m, 1);
    expectAriaSelectedState(getDots(), 1);
    expectTabIndexState(getDots(), 1);
  });
});

describe("MagicUpResultPanel — tooltip acessível nos dots (WCAG 1.4.13, 4.1.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cada dot tem aria-describedby apontando para id único 'magic-up-dot-tooltip-{i}'", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();

    expect(dots[0]).toHaveAttribute("aria-describedby", "magic-up-dot-tooltip-0");
    expect(dots[1]).toHaveAttribute("aria-describedby", "magic-up-dot-tooltip-1");
    expect(dots[2]).toHaveAttribute("aria-describedby", "magic-up-dot-tooltip-2");

    const ids = dots.map((d) => d.getAttribute("aria-describedby"));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tooltip aparece no hover (mouse) com texto 'Variação N'", async () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();

    fireEvent.pointerMove(dots[1], { pointerType: "mouse" });
    fireEvent.pointerEnter(dots[1], { pointerType: "mouse" });
    fireEvent.mouseEnter(dots[1]);
    fireEvent.mouseMove(dots[1]);

    const tooltip = await screen.findByRole("tooltip", {}, { timeout: 1500 });
    expect(tooltip).toHaveTextContent("Variação 2");
  });

  it("tooltip aparece no foco do teclado (WCAG 1.4.13 — equivalência hover/foco)", async () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();

    fireEvent.focus(dots[2]);

    const tooltip = await screen.findByRole("tooltip", {}, { timeout: 1500 });
    expect(tooltip).toHaveTextContent("Variação 3");
  });

  it("tooltip desaparece após blur do dot", async () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();

    fireEvent.focus(dots[1]);
    await screen.findByRole("tooltip", {}, { timeout: 1500 });

    fireEvent.blur(dots[1]);
    // Radix marca data-state="closed" ou remove do DOM — ambos contam como fechado
    await new Promise((r) => setTimeout(r, 50));
    const tooltip = screen.queryByRole("tooltip");
    if (tooltip) {
      expect(tooltip.getAttribute("data-state")).toBe("closed");
    } else {
      expect(tooltip).toBeNull();
    }
  });

  it.each([0, 1, 2])("tooltip do dot[%i] mostra texto correspondente 'Variação N'", async (i) => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();

    fireEvent.focus(dots[i]);
    const tooltip = await screen.findByRole("tooltip", {}, { timeout: 1500 });
    expect(tooltip).toHaveTextContent(`Variação ${i + 1}`);
  });

  it("aria-describedby permanece estável após re-render com novo activeVariation", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    expect(getDots()[0]).toHaveAttribute("aria-describedby", "magic-up-dot-tooltip-0");
    expect(getDots()[2]).toHaveAttribute("aria-describedby", "magic-up-dot-tooltip-2");

    const updated = {
      ...m,
      activeVariation: 2,
      currentVariation: m.variations[2],
    } as StubState;
    rerender(<MagicUpResultPanel m={updated} />);

    // ids NÃO dependem de active — devem permanecer idênticos
    expect(getDots()[0]).toHaveAttribute("aria-describedby", "magic-up-dot-tooltip-0");
    expect(getDots()[1]).toHaveAttribute("aria-describedby", "magic-up-dot-tooltip-1");
    expect(getDots()[2]).toHaveAttribute("aria-describedby", "magic-up-dot-tooltip-2");
  });
});

// ───────── Hit area 44×44 responsiva (WCAG 2.5.5 AAA, 2.5.8 AA, 1.4.10 Reflow) ─────────

describe("MagicUpResultPanel — hit area 44×44 responsiva (WCAG 2.5.5 AAA, 2.5.8 AA)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cada dot tem classes w-11 e h-11 (44×44 base)", () => {
    const m = buildStubState({ variationsCount: 3 });
    render(<MagicUpResultPanel m={m} />);
    getDots().forEach((dot) => {
      expect(dot.className).toMatch(/\bw-11\b/);
      expect(dot.className).toMatch(/\bh-11\b/);
    });
  });

  it("cada dot tem min-w-11 e min-h-11 (defesa contra colapso flex)", () => {
    const m = buildStubState({ variationsCount: 3 });
    render(<MagicUpResultPanel m={m} />);
    getDots().forEach((dot) => {
      expect(dot.className).toMatch(/\bmin-w-11\b/);
      expect(dot.className).toMatch(/\bmin-h-11\b/);
    });
  });

  it("cada dot tem margens negativas -mx-[18px] e -my-[18px] (visual 8px sem alterar)", () => {
    const m = buildStubState({ variationsCount: 3 });
    render(<MagicUpResultPanel m={m} />);
    getDots().forEach((dot) => {
      expect(dot.className).toContain("-mx-[18px]");
      expect(dot.className).toContain("-my-[18px]");
    });
  });

  it("container dos dots tem flex-wrap (previne overflow horizontal em mobile)", () => {
    const m = buildStubState({ variationsCount: 3 });
    render(<MagicUpResultPanel m={m} />);
    const container = screen.getByTestId("magic-up-dots-container");
    expect(container.className).toMatch(/\bflex-wrap\b/);
  });

  it("container dos dots tem gap-3 mínimo (isola hit areas adjacentes)", () => {
    const m = buildStubState({ variationsCount: 3 });
    render(<MagicUpResultPanel m={m} />);
    const container = screen.getByTestId("magic-up-dots-container");
    expect(container.className).toMatch(/\bgap-(3|4|5|6)\b/);
  });

  it("dots NÃO usam classes responsivas que reduzem o tamanho abaixo de 44px", () => {
    const m = buildStubState({ variationsCount: 3 });
    render(<MagicUpResultPanel m={m} />);
    // qualquer prefixo de breakpoint que reduza w/h/min-w/min-h para <11 é proibido
    const shrinkRegex = /\b(sm|md|lg|xl|2xl|max-sm|max-md|max-lg):(w|h|min-w|min-h)-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10)\b/;
    getDots().forEach((dot) => {
      expect(dot.className).not.toMatch(shrinkRegex);
    });
  });

  it("com 5 variações (carga), todos os dots mantêm 44×44 e container mantém flex-wrap", () => {
    const m = buildStubState({ variationsCount: 5 });
    render(<MagicUpResultPanel m={m} />);
    const dots = getDots();
    expect(dots).toHaveLength(5);
    dots.forEach((dot) => {
      expect(dot.className).toMatch(/\bw-11\b/);
      expect(dot.className).toMatch(/\bh-11\b/);
      expect(dot.className).toMatch(/\bmin-w-11\b/);
      expect(dot.className).toMatch(/\bmin-h-11\b/);
    });
    const container = screen.getByTestId("magic-up-dots-container");
    expect(container.className).toMatch(/\bflex-wrap\b/);
  });
});

// ───────── Foco + roving tabindex após click em controle INATIVO ─────────
// WCAG 2.4.3 (Focus Order) + APG Tabs (roving tabindex sincronizado pós-ativação)

describe("MagicUpResultPanel — foco e roving após click em dot/thumbnail inativo", () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * Simula o ciclo real: usuário clica num controle INATIVO →
   * componente chama setActiveVariation(i) → estado sobe → re-render
   * com novo activeVariation. Validamos que:
   *   1) setActiveVariation foi chamado com o índice correto
   *   2) o foco permanece/migra para o novo controle ativo
   *   3) roving tabindex está 100% sincronizado nos DOIS grupos (dots + thumbs)
   *   4) aria-selected acompanha o tabindex
   */
  function rerenderWithActive(
    rerender: (ui: React.ReactElement) => void,
    m: StubState,
    newActive: number
  ) {
    const updated = {
      ...m,
      activeVariation: newActive,
      currentVariation: m.variations[newActive],
    } as StubState;
    rerender(<MagicUpResultPanel m={updated} />);
  }

  function expectRovingState(elements: HTMLElement[], activeIndex: number) {
    elements.forEach((el, i) => {
      expect(el.tabIndex).toBe(i === activeIndex ? 0 : -1);
      expect(el.getAttribute("aria-selected")).toBe(i === activeIndex ? "true" : "false");
    });
    expectSingleTabStop(elements, activeIndex);
  }

  /**
   * Garante que apenas UM elemento da coleção tem tabindex=0
   * (contrato APG: roving tabindex == single tab stop por tablist).
   */
  function expectSingleTabStop(elements: HTMLElement[], expectedIndex: number) {
    const zeros = elements
      .map((el, i) => (el.tabIndex === 0 ? i : -1))
      .filter((i) => i !== -1);
    expect(zeros).toEqual([expectedIndex]);
  }

  function clickInactiveAndSyncState(
    rerender: (ui: React.ReactElement) => void,
    m: StubState,
    el: HTMLButtonElement,
    targetIndex: number
  ) {
    expect(el.tabIndex).toBe(-1); // sanity: precisa estar inativo no início
    el.focus();
    expect(document.activeElement).toBe(el);
    fireEvent.click(el);
    expect(m.setActiveVariation).toHaveBeenCalledWith(targetIndex);
    rerenderWithActive(rerender, m, targetIndex);
  }

  // ── Dots ────────────────────────────────────────────────────────────

  it.each([
    { from: 0, to: 2 },
    { from: 0, to: 1 },
    { from: 1, to: 0 },
    { from: 2, to: 0 },
  ])(
    "Click em dot[$to] inativo (active=$from): foco fica em dot[$to] e roving migra",
    ({ from, to }) => {
      const m = buildStubState({ variationsCount: 3, activeVariation: from });
      const { rerender } = render(<MagicUpResultPanel m={m} />);

      clickInactiveAndSyncState(rerender, m, getDots()[to] as HTMLButtonElement, to);

      // Após re-render: foco no novo controle ativo (mesmo índice, novo nó React)
      const dotsAfter = getDots();
      expect(document.activeElement).toBe(dotsAfter[to]);
      expectRovingState(dotsAfter, to);
      // Roving deve estar sincronizado também no grupo paralelo de thumbnails
      expectRovingState(getThumbs(), to);
    }
  );

  it("Click em dot inativo: dot anterior perde tabindex=0 e ganha tabindex=-1", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    expect(getDots()[0].tabIndex).toBe(0);
    expect(getDots()[2].tabIndex).toBe(-1);

    clickInactiveAndSyncState(rerender, m, getDots()[2] as HTMLButtonElement, 2);

    const dotsAfter = getDots();
    expect(dotsAfter[0].tabIndex).toBe(-1);
    expect(dotsAfter[2].tabIndex).toBe(0);
  });

  // ── Thumbnails ──────────────────────────────────────────────────────

  it.each([
    { from: 0, to: 2 },
    { from: 0, to: 1 },
    { from: 1, to: 0 },
    { from: 2, to: 0 },
  ])(
    "Click em thumbnail[$to] inativo (active=$from): foco fica em thumb[$to] e roving migra",
    ({ from, to }) => {
      const m = buildStubState({ variationsCount: 3, activeVariation: from });
      const { rerender } = render(<MagicUpResultPanel m={m} />);

      clickInactiveAndSyncState(rerender, m, getThumbs()[to] as HTMLButtonElement, to);

      const thumbsAfter = getThumbs();
      expect(document.activeElement).toBe(thumbsAfter[to]);
      expectRovingState(thumbsAfter, to);
      // Grupo paralelo de dots também recebe roving sincronizado
      expectRovingState(getDots(), to);
    }
  );

  it("Click em thumbnail inativo: thumb anterior perde tabindex=0 e ganha tabindex=-1", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    expect(getThumbs()[1].tabIndex).toBe(0);
    expect(getThumbs()[0].tabIndex).toBe(-1);

    clickInactiveAndSyncState(rerender, m, getThumbs()[0] as HTMLButtonElement, 0);

    const thumbsAfter = getThumbs();
    expect(thumbsAfter[1].tabIndex).toBe(-1);
    expect(thumbsAfter[0].tabIndex).toBe(0);
  });

  // ── Cliques sequenciais em controles inativos ───────────────────────

  it("Cliques sequenciais em dots inativos (0 → 2 → 1) mantêm foco e roving sincronizados a cada passo", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    // Passo 1: 0 → 2
    clickInactiveAndSyncState(rerender, m, getDots()[2] as HTMLButtonElement, 2);
    expect(document.activeElement).toBe(getDots()[2]);
    expectRovingState(getDots(), 2);
    expectRovingState(getThumbs(), 2);

    // Passo 2: 2 → 1 (novo dot inativo)
    clickInactiveAndSyncState(rerender, m, getDots()[1] as HTMLButtonElement, 1);
    expect(document.activeElement).toBe(getDots()[1]);
    expectRovingState(getDots(), 1);
    expectRovingState(getThumbs(), 1);
  });

  it("Click em thumbnail inativo NÃO desloca foco para o dot correspondente", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    clickInactiveAndSyncState(rerender, m, getThumbs()[2] as HTMLButtonElement, 2);

    expect(document.activeElement).toBe(getThumbs()[2]);
    expect(document.activeElement).not.toBe(getDots()[2]);
    // mas o dot correspondente também recebeu roving=0 (sincronia entre grupos)
    expect(getDots()[2].tabIndex).toBe(0);
  });

  it("Click em dot inativo NÃO desloca foco para o thumbnail correspondente", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    clickInactiveAndSyncState(rerender, m, getDots()[1] as HTMLButtonElement, 1);

    expect(document.activeElement).toBe(getDots()[1]);
    expect(document.activeElement).not.toBe(getThumbs()[1]);
    expect(getThumbs()[1].tabIndex).toBe(0);
  });
});

// ───────── Identidade acessível: id/role/aria-label + single tab stop global ─────────
// WCAG 4.1.2 (Name, Role, Value) + WAI-ARIA APG Tabs (1 único tabindex=0 por widget)

describe("MagicUpResultPanel — identidade acessível e single tab stop", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Helpers locais ──────────────────────────────────────────────────

  /** Coleta todos os tab stops do widget de variações (dots + thumbs + prev/next). */
  function collectVariationTabStops() {
    const dots = getDots();
    const thumbs = getThumbs();
    const prev = screen.queryByRole("button", { name: "Voltar" });
    const next = screen.queryByRole("button", { name: "Avançar" });
    return { dots, thumbs, prev, next, all: [...dots, ...thumbs, ...(prev ? [prev] : []), ...(next ? [next] : [])] };
  }

  /** Conta quantos elementos da lista têm tabindex=0 explicitamente. */
  function countTabIndexZero(elements: HTMLElement[]) {
    return elements.filter((el) => el.tabIndex === 0).length;
  }

  /** Asserta presença de aria-label não vazio. */
  function expectAriaLabel(el: HTMLElement, pattern: RegExp | string) {
    const label = el.getAttribute("aria-label");
    expect(label).toBeTruthy();
    if (typeof pattern === "string") expect(label).toBe(pattern);
    else expect(label).toMatch(pattern);
  }

  // ── role nos containers e nos itens ─────────────────────────────────

  it("Cada tablist tem role='tablist' com aria-label único e descritivo", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dotsList = getDotsTablist();
    const thumbsList = getThumbsTablist();

    expect(dotsList).toHaveAttribute("role", "tablist");
    expect(thumbsList).toHaveAttribute("role", "tablist");
    expectAriaLabel(dotsList, "Variações geradas");
    expectAriaLabel(thumbsList, "Miniaturas das variações");

    // labels distintos (não pode haver dois tablists com mesmo nome acessível)
    expect(dotsList.getAttribute("aria-label")).not.toBe(thumbsList.getAttribute("aria-label"));
  });

  it("Todos os dots têm role='tab' e aria-label 'Selecionar variação N'", () => {
    const m = buildStubState({ variationsCount: 4, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dots = getDots();
    expect(dots).toHaveLength(4);
    dots.forEach((dot, i) => {
      expect(dot).toHaveAttribute("role", "tab");
      expectAriaLabel(dot, `Selecionar variação ${i + 1}`);
    });
  });

  it("Todos os thumbnails têm role='tab' e aria-label começando com 'Variação N'", () => {
    const m = buildStubState({ variationsCount: 4, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const thumbs = getThumbs();
    expect(thumbs).toHaveLength(4);
    thumbs.forEach((thumb, i) => {
      expect(thumb).toHaveAttribute("role", "tab");
      expectAriaLabel(thumb, new RegExp(`varia[cç][aã]o\\s+${i + 1}\\b`, "i"));
    });
  });

  it("Botões prev/next têm role implícito de button e aria-label 'Voltar'/'Avançar'", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });

    expect(prev.tagName).toBe("BUTTON");
    expect(next.tagName).toBe("BUTTON");
    expectAriaLabel(prev, "Voltar");
    expectAriaLabel(next, "Avançar");
  });

  // ── ids únicos (aria-describedby tooltip) ──────────────────────────

  it("Cada dot tem id implícito via aria-describedby único — sem colisão", () => {
    const m = buildStubState({ variationsCount: 5, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const ids = getDots().map((d) => d.getAttribute("aria-describedby"));
    ids.forEach((id) => expect(id).toMatch(/^magic-up-dot-tooltip-\d+$/));
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ── Single tab stop por tablist ─────────────────────────────────────

  it.each([0, 1, 2])(
    "Apenas UM dot com tabindex=0 (active=%i) — nenhuma duplicidade",
    (active) => {
      const m = buildStubState({ variationsCount: 3, activeVariation: active });
      render(<MagicUpResultPanel m={m} />);
      expect(countTabIndexZero(getDots())).toBe(1);
      expect(getDots()[active].tabIndex).toBe(0);
    }
  );

  it.each([0, 1, 2])(
    "Apenas UM thumbnail com tabindex=0 (active=%i) — nenhuma duplicidade",
    (active) => {
      const m = buildStubState({ variationsCount: 3, activeVariation: active });
      render(<MagicUpResultPanel m={m} />);
      expect(countTabIndexZero(getThumbs())).toBe(1);
      expect(getThumbs()[active].tabIndex).toBe(0);
    }
  );

  // ── Single tab stop por tablist mantido após troca de active ───────

  it("Após re-render para novo active, ainda há exatamente 1 tabindex=0 em cada tablist", () => {
    const m = buildStubState({ variationsCount: 4, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    expect(countTabIndexZero(getDots())).toBe(1);
    expect(countTabIndexZero(getThumbs())).toBe(1);

    for (const next of [3, 1, 2, 0]) {
      const updated = {
        ...m,
        activeVariation: next,
        currentVariation: m.variations[next],
      } as StubState;
      rerender(<MagicUpResultPanel m={updated} />);

      expect(countTabIndexZero(getDots())).toBe(1);
      expect(countTabIndexZero(getThumbs())).toBe(1);
      expect(getDots()[next].tabIndex).toBe(0);
      expect(getThumbs()[next].tabIndex).toBe(0);
    }
  });

  // ── Garante que dots e thumbs NÃO contam como duplicidade indevida ─

  it("Dots e thumbnails do MESMO índice ativo coexistem com tabindex=0 (são tablists separados)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const dotZero = getDots()[1];
    const thumbZero = getThumbs()[1];
    expect(dotZero.tabIndex).toBe(0);
    expect(thumbZero.tabIndex).toBe(0);

    // mas pertencem a tablists distintos com aria-label diferente
    const dotsList = getDotsTablist();
    const thumbsList = getThumbsTablist();
    expect(dotsList.contains(dotZero)).toBe(true);
    expect(thumbsList.contains(thumbZero)).toBe(true);
    expect(dotsList).not.toBe(thumbsList);
  });

  // ── Verifica que itens INATIVOS nunca regridem para tabindex=0 ─────

  it("Nenhum item inativo (não-active) tem tabindex=0 em qualquer momento", () => {
    const m = buildStubState({ variationsCount: 4, activeVariation: 2 });
    render(<MagicUpResultPanel m={m} />);

    getDots().forEach((dot, i) => {
      if (i !== 2) expect(dot.tabIndex).toBe(-1);
    });
    getThumbs().forEach((thumb, i) => {
      if (i !== 2) expect(thumb.tabIndex).toBe(-1);
    });
  });

  // ── Sanity check: tabStops globais coletados batem com expectativa ─

  it("Snapshot semântico de tab stops: prev/next + 1 dot + 1 thumb = 4 elementos focáveis via Tab", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const { all, prev, next } = collectVariationTabStops();
    const tabbable = all.filter((el) => el.tabIndex === 0);

    // prev e next são sempre focáveis (tabindex padrão = 0 em <button>)
    expect(prev).not.toBeNull();
    expect(next).not.toBeNull();
    expect(tabbable).toContain(prev!);
    expect(tabbable).toContain(next!);

    // exatamente 1 dot ativo + 1 thumb ativo + prev + next
    expect(tabbable).toHaveLength(4);
  });
});

// ───────── Live region: anúncio de variação para leitores de tela ─────────
// WCAG 4.1.3 Status Messages: trocar de variação via prev/next, dot ou thumb
// deve atualizar um live region (role="status" + aria-live="polite") com texto
// "Variação N de TOTAL selecionada".

describe("MagicUpResultPanel — live region anuncia variação ativa (WCAG 4.1.3)", () => {
  beforeEach(() => vi.clearAllMocks());

  function getLiveRegion(): HTMLElement {
    const el = screen.getByTestId("magic-up-variation-live-region");
    return el;
  }

  function rerenderWithActive(
    rerender: (ui: React.ReactElement) => void,
    m: StubState,
    newActive: number
  ) {
    const updated = {
      ...m,
      activeVariation: newActive,
      currentVariation: m.variations[newActive],
    } as StubState;
    rerender(<MagicUpResultPanel m={updated} />);
  }

  // ── Contrato base do live region ────────────────────────────────────

  it("expõe role='status', aria-live='polite' e aria-atomic='true' (sr-only)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const live = getLiveRegion();
    expect(live.getAttribute("role")).toBe("status");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.getAttribute("aria-atomic")).toBe("true");
    expect(live.className).toContain("sr-only");
  });

  it("anuncio inicial reflete a variação ativa do estado inicial", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);
    expect(getLiveRegion().textContent).toBe("Variação 2 de 3 selecionada");
  });

  it("não anuncia quando há apenas 1 variação (sem prev/next/dots)", () => {
    const m = buildStubState({ variationsCount: 1, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    expect(getLiveRegion().textContent).toBe("");
  });

  // ── Prev / Next ─────────────────────────────────────────────────────

  it("clicar em 'Avançar' atualiza o anúncio para a próxima variação", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    expect(getLiveRegion().textContent).toBe("Variação 1 de 3 selecionada");

    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
    rerenderWithActive(rerender, m, 1);

    expect(getLiveRegion().textContent).toBe("Variação 2 de 3 selecionada");
  });

  it("clicar em 'Voltar' atualiza o anúncio para a variação anterior", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 2 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    expect(getLiveRegion().textContent).toBe("Variação 3 de 3 selecionada");

    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(m.setActiveVariation).toHaveBeenCalledWith(1);
    rerenderWithActive(rerender, m, 1);

    expect(getLiveRegion().textContent).toBe("Variação 2 de 3 selecionada");
  });

  // ── Dots ────────────────────────────────────────────────────────────

  it.each([0, 1, 2])(
    "selecionar dot[%i] atualiza o anúncio para 'Variação %s de 3 selecionada'",
    (target) => {
      const initialActive = target === 0 ? 2 : 0;
      const m = buildStubState({ variationsCount: 3, activeVariation: initialActive });
      const { rerender } = render(<MagicUpResultPanel m={m} />);

      expect(getLiveRegion().textContent).toBe(`Variação ${initialActive + 1} de 3 selecionada`);

      fireEvent.click(getDots()[target]);
      expect(m.setActiveVariation).toHaveBeenCalledWith(target);
      rerenderWithActive(rerender, m, target);

      expect(getLiveRegion().textContent).toBe(`Variação ${target + 1} de 3 selecionada`);
    }
  );

  // ── Thumbnails ──────────────────────────────────────────────────────

  it.each([0, 1, 2])(
    "selecionar thumb[%i] atualiza o anúncio para 'Variação %s de 3 selecionada'",
    (target) => {
      const initialActive = target === 0 ? 2 : 0;
      const m = buildStubState({ variationsCount: 3, activeVariation: initialActive });
      const { rerender } = render(<MagicUpResultPanel m={m} />);

      expect(getLiveRegion().textContent).toBe(`Variação ${initialActive + 1} de 3 selecionada`);

      fireEvent.click(getThumbs()[target]);
      expect(m.setActiveVariation).toHaveBeenCalledWith(target);
      rerenderWithActive(rerender, m, target);

      expect(getLiveRegion().textContent).toBe(`Variação ${target + 1} de 3 selecionada`);
    }
  );

  // ── Sequência intercalada prev/next + dot/thumb ─────────────────────

  it("sequência prev/next + dot + thumb: anúncio sempre reflete a variação ativa", () => {
    const m = buildStubState({ variationsCount: 4, activeVariation: 0 });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    expect(getLiveRegion().textContent).toBe("Variação 1 de 4 selecionada");

    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    rerenderWithActive(rerender, m, 1);
    expect(getLiveRegion().textContent).toBe("Variação 2 de 4 selecionada");

    fireEvent.click(getDots()[3]);
    rerenderWithActive(rerender, m, 3);
    expect(getLiveRegion().textContent).toBe("Variação 4 de 4 selecionada");

    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    rerenderWithActive(rerender, m, 2);
    expect(getLiveRegion().textContent).toBe("Variação 3 de 4 selecionada");

    fireEvent.click(getThumbs()[0]);
    rerenderWithActive(rerender, m, 0);
    expect(getLiveRegion().textContent).toBe("Variação 1 de 4 selecionada");
  });
});

// ───────── Regressão: Enter/Space NÃO faz wrap entre dot[last] ↔ dot[0] ─────────
// Diferente das setas (ArrowLeft/Right/Home/End — que navegam por roving),
// Enter e Space APENAS ativam o item já focado. Eles NUNCA podem mover o
// foco/ativação para o extremo oposto da lista (sem wrap acidental).

describe("MagicUpResultPanel — Enter/Space não wrap entre extremos (dot[last] ↔ dot[0])", () => {
  beforeEach(() => vi.clearAllMocks());

  /** Asserta: tabindex=0 SOMENTE no índice esperado; demais = -1. */
  function expectExactlyOneTabbable(elements: HTMLElement[], expectedIndex: number) {
    const tabbable = elements
      .map((el, i) => ({ i, value: el.getAttribute("tabindex") }))
      .filter((entry) => entry.value === "0")
      .map((entry) => entry.i);
    expect(tabbable).toEqual([expectedIndex]);
    elements.forEach((el, i) => {
      expect(el.getAttribute("tabindex")).toBe(i === expectedIndex ? "0" : "-1");
    });
  }

  function rerenderWithActive(
    rerender: (ui: React.ReactElement) => void,
    m: StubState,
    newActive: number
  ) {
    const updated = {
      ...m,
      activeVariation: newActive,
      currentVariation: m.variations[newActive],
    } as StubState;
    rerender(<MagicUpResultPanel m={updated} />);
  }

  // ── DOTS: foco no último, Enter/Space NÃO ativa o primeiro ──────────

  it.each([
    { key: "Enter" as const, code: "Enter" },
    { key: " " as const, code: "Space" },
  ])(
    "foco no dot[last] + $code → ativa dot[last] e NUNCA dot[0] (sem wrap)",
    ({ key, code }) => {
      const total = 4;
      const last = total - 1;
      const m = buildStubState({ variationsCount: total, activeVariation: last });
      const { rerender } = render(<MagicUpResultPanel m={m} />);

      expectExactlyOneTabbable(getDots(), last);

      const lastDot = getDots()[last] as HTMLButtonElement;
      lastDot.focus();
      expect(document.activeElement).toBe(lastDot);

      fireEvent.keyDown(lastDot, { key, code });
      fireEvent.click(lastDot);

      // Anti-wrap: setActiveVariation NUNCA chamado com 0
      expect(m.setActiveVariation).not.toHaveBeenCalledWith(0);
      // Apenas chamadas com `last` são aceitas
      const calls = (m.setActiveVariation as ReturnType<typeof vi.fn>).mock.calls;
      calls.forEach(([idx]) => expect(idx).toBe(last));

      rerenderWithActive(rerender, m, last);

      // Estado permanece no último — invariante preservada
      expectExactlyOneTabbable(getDots(), last);
      expectExactlyOneTabbable(getThumbs(), last);

      // aria-selected também não migrou
      expect(getDots()[last].getAttribute("aria-selected")).toBe("true");
      expect(getDots()[0].getAttribute("aria-selected")).toBe("false");
    }
  );

  // ── DOTS: foco no primeiro, Enter/Space NÃO ativa o último ──────────

  it.each([
    { key: "Enter" as const, code: "Enter" },
    { key: " " as const, code: "Space" },
  ])(
    "foco no dot[0] + $code → ativa dot[0] e NUNCA dot[last] (sem wrap reverso)",
    ({ key, code }) => {
      const total = 4;
      const last = total - 1;
      const m = buildStubState({ variationsCount: total, activeVariation: 0 });
      const { rerender } = render(<MagicUpResultPanel m={m} />);

      expectExactlyOneTabbable(getDots(), 0);

      const firstDot = getDots()[0] as HTMLButtonElement;
      firstDot.focus();
      expect(document.activeElement).toBe(firstDot);

      fireEvent.keyDown(firstDot, { key, code });
      fireEvent.click(firstDot);

      expect(m.setActiveVariation).not.toHaveBeenCalledWith(last);
      const calls = (m.setActiveVariation as ReturnType<typeof vi.fn>).mock.calls;
      calls.forEach(([idx]) => expect(idx).toBe(0));

      rerenderWithActive(rerender, m, 0);

      expectExactlyOneTabbable(getDots(), 0);
      expectExactlyOneTabbable(getThumbs(), 0);

      expect(getDots()[0].getAttribute("aria-selected")).toBe("true");
      expect(getDots()[last].getAttribute("aria-selected")).toBe("false");
    }
  );

  // ── THUMBS: mesma garantia anti-wrap nos dois extremos ──────────────

  it.each([
    { key: "Enter" as const, code: "Enter" },
    { key: " " as const, code: "Space" },
  ])(
    "foco no thumb[last] + $code → ativa thumb[last] e NUNCA thumb[0]",
    ({ key, code }) => {
      const total = 4;
      const last = total - 1;
      const m = buildStubState({ variationsCount: total, activeVariation: last });
      const { rerender } = render(<MagicUpResultPanel m={m} />);

      expectExactlyOneTabbable(getThumbs(), last);

      const lastThumb = getThumbs()[last] as HTMLButtonElement;
      lastThumb.focus();
      fireEvent.keyDown(lastThumb, { key, code });
      fireEvent.click(lastThumb);

      expect(m.setActiveVariation).not.toHaveBeenCalledWith(0);
      const calls = (m.setActiveVariation as ReturnType<typeof vi.fn>).mock.calls;
      calls.forEach(([idx]) => expect(idx).toBe(last));

      rerenderWithActive(rerender, m, last);
      expectExactlyOneTabbable(getThumbs(), last);
      expectExactlyOneTabbable(getDots(), last);
    }
  );

  it.each([
    { key: "Enter" as const, code: "Enter" },
    { key: " " as const, code: "Space" },
  ])(
    "foco no thumb[0] + $code → ativa thumb[0] e NUNCA thumb[last]",
    ({ key, code }) => {
      const total = 4;
      const last = total - 1;
      const m = buildStubState({ variationsCount: total, activeVariation: 0 });
      const { rerender } = render(<MagicUpResultPanel m={m} />);

      expectExactlyOneTabbable(getThumbs(), 0);

      const firstThumb = getThumbs()[0] as HTMLButtonElement;
      firstThumb.focus();
      fireEvent.keyDown(firstThumb, { key, code });
      fireEvent.click(firstThumb);

      expect(m.setActiveVariation).not.toHaveBeenCalledWith(last);
      const calls = (m.setActiveVariation as ReturnType<typeof vi.fn>).mock.calls;
      calls.forEach(([idx]) => expect(idx).toBe(0));

      rerenderWithActive(rerender, m, 0);
      expectExactlyOneTabbable(getThumbs(), 0);
      expectExactlyOneTabbable(getDots(), 0);
    }
  );

  // ── Sequência: várias ativações nos extremos não acumulam wrap ─────

  it("pressionar Enter repetidas vezes em dot[last] e dot[0] alternadamente: nunca wrap", () => {
    const total = 5;
    const last = total - 1;
    const m = buildStubState({ variationsCount: total, activeVariation: last });
    const { rerender } = render(<MagicUpResultPanel m={m} />);

    // Enter no último (3×) → continua no último
    for (let n = 0; n < 3; n++) {
      const dot = getDots()[last] as HTMLButtonElement;
      dot.focus();
      fireEvent.keyDown(dot, { key: "Enter", code: "Enter" });
      fireEvent.click(dot);
      rerenderWithActive(rerender, m, last);
      expectExactlyOneTabbable(getDots(), last);
    }

    // Enter no primeiro (3×) → continua no primeiro (sem ir para o último)
    rerenderWithActive(rerender, m, 0);
    for (let n = 0; n < 3; n++) {
      const dot = getDots()[0] as HTMLButtonElement;
      dot.focus();
      fireEvent.keyDown(dot, { key: "Enter", code: "Enter" });
      fireEvent.click(dot);
      rerenderWithActive(rerender, m, 0);
      expectExactlyOneTabbable(getDots(), 0);
    }

    // Em nenhum momento setActiveVariation foi chamado com índice intermediário fora dos extremos
    const calls = (m.setActiveVariation as ReturnType<typeof vi.fn>).mock.calls;
    calls.forEach(([idx]) => {
      expect([0, last]).toContain(idx);
    });
  });
});

// ───────── Tab sai do painel sem ciclar de volta ao primeiro controle ─────────
// WAI-ARIA APG Tabs: roving tabindex faz com que SOMENTE a tab ativa esteja
// no Tab order. Após o último controle alcançável (Avançar quando habilitado,
// caso contrário o thumbnail/dot ativo), Tab deve mover o foco para FORA do
// painel — nunca voltar para o primeiro controle interno.
//
// Usamos um sentinela <button data-testid="after-panel"> renderizado APÓS o
// painel para asserir o "saiu para o próximo elemento focável da página".

describe("MagicUpResultPanel — Tab no fim do painel sai sem ciclar de volta ao primeiro", () => {
  beforeEach(() => vi.clearAllMocks());

  function renderWithSentinels(m: StubState) {
    return render(
      <>
        <button data-testid="before-panel">before</button>
        <MagicUpResultPanel m={m} />
        <button data-testid="after-panel">after</button>
      </>
    );
  }

  /**
   * Coleta TODOS os elementos focáveis da árvore na ordem do DOM,
   * respeitando tabindex (>= 0 entra; -1 fica fora) e disabled.
   * Isto reproduz como o navegador resolve a sequência de Tab.
   */
  function getTabOrder(container: HTMLElement): HTMLElement[] {
    const candidates = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    // Remove disabled buttons explicitamente (defensive, alguns querySelectors variam)
    return candidates.filter((el) => {
      if (el instanceof HTMLButtonElement && el.disabled) return false;
      const ti = el.getAttribute("tabindex");
      if (ti === "-1") return false;
      return true;
    });
  }

  /** Simula Tab: foca o próximo elemento da ordem atual de Tab. */
  function pressTab(current: HTMLElement, container: HTMLElement) {
    const order = getTabOrder(container);
    const idx = order.indexOf(current);
    expect(idx, "elemento atual deve estar na Tab order").toBeGreaterThanOrEqual(0);
    const next = order[idx + 1] ?? null;
    fireEvent.keyDown(current, { key: "Tab", code: "Tab" });
    if (next) next.focus();
    return next;
  }

  // ── Cenário 1: Avançar habilitado é o ÚLTIMO controle do painel ─────

  it("Tab a partir de Avançar (último controle, active=0) sai para o sentinela 'after'", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { container } = renderWithSentinels(m);

    const next = screen.getByRole("button", { name: /avançar/i });
    expect(next).not.toBeDisabled();

    next.focus();
    expect(document.activeElement).toBe(next);

    const after = pressTab(next, container);

    // Saiu para o sentinela externo — NÃO voltou para Voltar/dot/thumb interno
    expect(after).toBe(screen.getByTestId("after-panel"));
    expect(document.activeElement).toBe(screen.getByTestId("after-panel"));

    // Confirma que NÃO ciclou para o primeiro controle (Voltar) nem para
    // qualquer dot/thumb que NÃO seja o ativo
    const prev = screen.getByRole("button", { name: /voltar/i });
    expect(document.activeElement).not.toBe(prev);
    getDots().forEach((d, i) => {
      if (i !== m.activeVariation) expect(document.activeElement).not.toBe(d);
    });
  });

  // ── Cenário 2: Avançar desabilitado (active=last). Último alcançável =
  // o thumbnail ativo (último <button> em Tab order do painel) ─────────

  it("Tab a partir do thumbnail ativo (active=last; Avançar disabled) sai para 'after'", () => {
    const total = 3;
    const last = total - 1;
    const m = buildStubState({ variationsCount: total, activeVariation: last });
    const { container } = renderWithSentinels(m);

    expect(screen.getByRole("button", { name: /avançar/i })).toBeDisabled();

    const activeThumb = getThumbs()[last] as HTMLButtonElement;
    expect(activeThumb.getAttribute("tabindex")).toBe("0");

    activeThumb.focus();
    expect(document.activeElement).toBe(activeThumb);

    const after = pressTab(activeThumb, container);

    expect(after).toBe(screen.getByTestId("after-panel"));
    expect(document.activeElement).toBe(screen.getByTestId("after-panel"));

    // Roving tabindex: nenhum thumbnail/dot inativo entrou na ordem de Tab
    getThumbs().forEach((t, i) => {
      if (i !== last) expect(document.activeElement).not.toBe(t);
    });
    getDots().forEach((d, i) => {
      if (i !== last) expect(document.activeElement).not.toBe(d);
    });
  });

  // ── Cenário 3: dot/thumb inativos NÃO aparecem em getTabOrder ───────

  it("Tab order do painel inclui SOMENTE 1 dot e 1 thumb (os ativos) — confirma que Tab não cicla por inativos", () => {
    const m = buildStubState({ variationsCount: 4, activeVariation: 2 });
    const { container } = renderWithSentinels(m);

    const order = getTabOrder(container);

    const dots = getDots();
    const thumbs = getThumbs();

    const dotsInOrder = dots.filter((d) => order.includes(d));
    const thumbsInOrder = thumbs.filter((t) => order.includes(t));

    expect(dotsInOrder).toHaveLength(1);
    expect(thumbsInOrder).toHaveLength(1);
    expect(dotsInOrder[0]).toBe(dots[2]);
    expect(thumbsInOrder[0]).toBe(thumbs[2]);
  });

  // ── Cenário 4: simular caminho completo Avançar → after, depois Tab
  // novamente do 'after' NÃO retorna ao painel (é o navegador quem decide,
  // mas garantimos que o painel não captura/redireciona) ─────────────

  it("Após sair pelo 'after-panel', o foco continua fluindo para fora — painel não recaptura", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    const { container } = renderWithSentinels(m);

    const next = screen.getByRole("button", { name: /avançar/i });
    next.focus();
    pressTab(next, container);

    const after = screen.getByTestId("after-panel");
    expect(document.activeElement).toBe(after);

    // Próxima Tab a partir do 'after' não tem para onde ir nesta árvore
    const order = getTabOrder(container);
    const idx = order.indexOf(after);
    expect(order[idx + 1]).toBeUndefined();

    // Foco permanece no 'after' — painel NÃO interceptou de volta para Voltar
    fireEvent.keyDown(after, { key: "Tab", code: "Tab" });
    expect(document.activeElement).toBe(after);
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: /voltar/i }));
  });

  // ── Cenário 5: caminho COMPLETO partindo de 'before' atravessa painel
  // exatamente uma vez e termina em 'after' ─────────────────────────

  it("Caminho completo Tab: before → Voltar → dot ativo → thumb ativo → Avançar → after (sem revisitar)", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    const { container } = renderWithSentinels(m);

    const before = screen.getByTestId("before-panel");
    const after = screen.getByTestId("after-panel");
    const prev = screen.getByRole("button", { name: /voltar/i });
    const next = screen.getByRole("button", { name: /avançar/i });
    const activeDot = getDots()[1];
    const activeThumb = getThumbs()[1];

    const order = getTabOrder(container);

    // Sequência esperada (na ordem do DOM do painel):
    // before, prev, dot[1], next, thumb[1], after
    // (next aparece antes de thumb[1] pois está no header; thumb[1] está abaixo do AdImageResult stub)
    const expectedSubset = [before, prev, activeDot, next, activeThumb, after];
    const observedIndices = expectedSubset.map((el) => order.indexOf(el));

    // Todos presentes
    observedIndices.forEach((idx, i) => {
      expect(idx, `${expectedSubset[i].tagName}#${i} ausente da Tab order`).toBeGreaterThanOrEqual(0);
    });

    // Estritamente crescentes (nenhum revisitado / nenhum ciclo)
    for (let i = 1; i < observedIndices.length; i++) {
      expect(observedIndices[i]).toBeGreaterThan(observedIndices[i - 1]);
    }

    // E 'after' é o ÚLTIMO da lista filtrada (nada depois dele)
    expect(order[order.length - 1]).toBe(after);
  });
});
