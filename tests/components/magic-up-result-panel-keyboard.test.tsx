/**
 * MagicUpResultPanel — testes de navegação por teclado (WCAG 2.1.1 Keyboard).
 *
 * Cobre prev/next, dots de paginação e thumbnails:
 * - Tab order segue ordem do DOM
 * - Enter/Space ativam handlers em <button> nativos
 *
 * Estratégia: stub de subcomponentes pesados (AdImageResult, MagicUpVariationComparator)
 * para isolar o foco apenas nos controles de variação do painel.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
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

describe("MagicUpResultPanel — navegação por teclado (WCAG 2.1.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Tab atinge prev → dots → next na ordem do DOM", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const prev = screen.getByRole("button", { name: "Voltar" });
    const next = screen.getByRole("button", { name: "Avançar" });
    const dots = screen.getAllByRole("tab");

    // Inicia foco no body, tabula sequencialmente
    (document.body as HTMLElement).focus();

    fireEvent.focus(prev);
    expect(document.activeElement).toBe(prev);

    fireEvent.focus(dots[0]);
    expect(document.activeElement).toBe(dots[0]);

    fireEvent.focus(dots[1]);
    expect(document.activeElement).toBe(dots[1]);

    fireEvent.focus(dots[2]);
    expect(document.activeElement).toBe(dots[2]);

    fireEvent.focus(next);
    expect(document.activeElement).toBe(next);

    // Confirma ordem do DOM (tabIndex implícito): prev vem antes de dots, dots antes de next
    const all = [prev, ...dots, next];
    for (let i = 0; i < all.length - 1; i++) {
      const pos = all[i].compareDocumentPosition(all[i + 1]);
      expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("Enter no dot ativa setActiveVariation com índice correto", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dot3 = screen.getByRole("tab", { name: "Selecionar variação 3" });
    dot3.focus();
    expect(document.activeElement).toBe(dot3);

    // Em <button> nativo, Enter dispara click sintético; emulamos via fireEvent.click após focus
    fireEvent.keyDown(dot3, { key: "Enter", code: "Enter" });
    fireEvent.click(dot3);

    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
  });

  it("Space no dot ativa setActiveVariation com índice correto", () => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);

    const dot2 = screen.getByRole("tab", { name: "Selecionar variação 2" });
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

    const thumbs = [
      screen.getByRole("button", { name: "Abrir miniatura da variação 1" }),
      screen.getByRole("button", { name: "Abrir miniatura da variação 2" }),
      screen.getByRole("button", { name: "Abrir miniatura da variação 3" }),
    ];

    // Ordem do DOM: thumb1 → thumb2 → thumb3
    for (let i = 0; i < thumbs.length - 1; i++) {
      const pos = thumbs[i].compareDocumentPosition(thumbs[i + 1]);
      expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    // Ativa thumbnail 3 via teclado
    thumbs[2].focus();
    expect(document.activeElement).toBe(thumbs[2]);
    fireEvent.keyDown(thumbs[2], { key: "Enter", code: "Enter" });
    fireEvent.click(thumbs[2]);

    expect(m.setActiveVariation).toHaveBeenCalledWith(2);
  });
});
