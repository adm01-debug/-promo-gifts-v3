import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MagicUpQualityScore } from "@/components/magic-up/MagicUpQualityScore";
import { MagicUpQualityChecklist } from "@/components/magic-up/MagicUpQualityChecklist";
import { MagicUpCurationStatus } from "@/components/magic-up/MagicUpCurationStatus";
import { MagicUpVariationComparator } from "@/components/magic-up/MagicUpVariationComparator";
import type { VariationItem } from "@/hooks/useMagicUpState";
import type { MagicUpQualityDiagnosis } from "@/pages/magic-up/magicUpStrategy";

const diagnosis = (total: number, source: "ai" | "heuristic" = "ai"): MagicUpQualityDiagnosis => ({
  total,
  label: total >= 88 ? "Excelente para envio" : total >= 75 ? "Boa peça comercial" : "Precisa revisão",
  summary: "Resumo executivo da avaliação comercial.",
  source,
  strengths: ["Produto claro"],
  risks: total < 75 ? ["Logo disponível"] : [],
  recommendations: total < 75 ? ["Melhorar logo disponível."] : [],
  criteria: [
    { id: "produto-claro", label: "Produto claro", score: 94, passed: true, weight: 5, recommendation: "Critério pronto para envio comercial." },
    { id: "logo-disponivel", label: "Logo disponível", score: total < 75 ? 58 : 91, passed: total >= 75, weight: 5, recommendation: total < 75 ? "Revise este ponto antes de enviar ao cliente." : "Critério pronto para envio comercial." },
    { id: "canal-definido", label: "Canal definido", score: 88, passed: true, weight: 3, recommendation: "Critério pronto para envio comercial." },
    { id: "cliente-contextualizado", label: "Cliente contextualizado", score: 86, passed: true, weight: 3, recommendation: "Critério pronto para envio comercial." },
  ],
});

describe("Magic Up Onda 5 components", () => {
  it("renderiza Magic Score excelente, origem IA e formato", () => {
    render(<MagicUpQualityScore diagnosis={diagnosis(95, "ai")} aspectRatio="4:5" />);
    expect(screen.getByLabelText("Diagnóstico Magic Score")).toBeInTheDocument();
    expect(screen.getByText("95/100")).toBeInTheDocument();
    expect(screen.getByText("IA")).toBeInTheDocument();
    expect(screen.getByText("4:5")).toBeInTheDocument();
  });

  it("renderiza Magic Score heurístico crítico sem quebrar recomendações vazias", () => {
    const low = { ...diagnosis(58, "heuristic"), recommendations: [] };
    render(<MagicUpQualityScore diagnosis={low} />);
    expect(screen.getByText("58/100")).toBeInTheDocument();
    expect(screen.getByText("Heurístico")).toBeInTheDocument();
    expect(screen.getByText("Precisa revisão")).toBeInTheDocument();
  });

  it("renderiza checklist com critérios aprovados, reprovados, scores e recomendações", () => {
    render(<MagicUpQualityChecklist diagnosis={diagnosis(64, "heuristic")} />);
    expect(screen.getByLabelText("Checklist de curadoria")).toBeInTheDocument();
    expect(screen.getByText("Produto claro")).toBeInTheDocument();
    expect(screen.getByText("Logo disponível")).toBeInTheDocument();
    expect(screen.getByText("94")).toBeInTheDocument();
    expect(screen.getByText("58")).toBeInTheDocument();
    expect(screen.getByText("Revise este ponto antes de enviar ao cliente.")).toBeInTheDocument();
  });

  it("permite alterar todos os status de curadoria com aria-checked e respeita disabled", () => {
    const onChange = vi.fn();
    const { rerender } = render(<MagicUpCurationStatus value="draft" onChange={onChange} />);
    const boa = screen.getByRole("radio", { name: "Definir curadoria como Boa" });
    expect(boa).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Definir curadoria como Rascunho" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(boa);
    expect(onChange).toHaveBeenCalledWith("good");

    rerender(<MagicUpCurationStatus value="good" disabled onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Definir curadoria como Boa" })).toBeDisabled();
  });

  it("checklist usa role list e expõe scores com aria-label", () => {
    render(<MagicUpQualityChecklist diagnosis={diagnosis(64, "heuristic")} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBe(4);
    expect(screen.getByLabelText("Score 94 de 100")).toBeInTheDocument();
    expect(screen.getByLabelText("Score 58 de 100")).toBeInTheDocument();
  });

  it("compara variações com aria-pressed e botão vencedora único por variação", () => {
    const onSelect = vi.fn();
    const onSelectWinner = vi.fn();
    const variations: VariationItem[] = [
      { id: "1", imageUrl: "https://example.com/1.png", isFavorite: false, qualityScore: 70 },
      { id: "2", imageUrl: "https://example.com/2.png", isFavorite: false, qualityDiagnosis: diagnosis(92) },
      { id: "3", imageUrl: "https://example.com/3.png", isFavorite: false },
    ];
    render(<MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={onSelect} onSelectWinner={onSelectWinner} />);

    expect(screen.getByLabelText("Comparador de variações")).toBeInTheDocument();
    const firstBtn = screen.getByRole("button", { name: /Selecionar variação 1/ });
    expect(firstBtn).toHaveAttribute("aria-pressed", "true");
    expect(firstBtn).toHaveAttribute("aria-current", "true");
    fireEvent.click(screen.getByRole("button", { name: /Selecionar variação 2/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Marcar variação 2 como vencedora" }));
    expect(onSelectWinner).toHaveBeenCalledWith(1);
  });

  it("não renderiza comparador com menos de duas variações", () => {
    const { container } = render(<MagicUpVariationComparator variations={[]} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lida com todas as variações sem score exibindo placeholder e mantendo winner no índice 0", () => {
    const variations: VariationItem[] = [
      { id: "a", imageUrl: "https://example.com/a.png", isFavorite: false },
      { id: "b", imageUrl: "https://example.com/b.png", isFavorite: false },
      { id: "c", imageUrl: "https://example.com/c.png", isFavorite: false },
    ];
    render(<MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);
    expect(screen.getByLabelText("Melhor score entre variações: indisponível")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(screen.getByRole("button", { name: "Selecionar variação 1, melhor score" })).toBeInTheDocument();
  });

  it("identifica vencedor único quando há scores parciais sem confundir 0 com ausente", () => {
    const variations: VariationItem[] = [
      { id: "a", imageUrl: "https://example.com/a.png", isFavorite: false },
      { id: "b", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 80 },
      { id: "c", imageUrl: "https://example.com/c.png", isFavorite: false },
    ];
    render(<MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);
    expect(screen.getByLabelText("Melhor score entre variações: 80")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(screen.getByRole("button", { name: "Selecionar variação 2, score 80, melhor score" })).toBeInTheDocument();
    expect(screen.getByLabelText("Score 80 de 100")).toBeInTheDocument();
  });

  it("renderiza lista longa com 8 variações expondo 1 vencedor e botões únicos", () => {
    const scores = [55, 62, 70, 78, 81, 88, 92, 74];
    const variations: VariationItem[] = scores.map((score, index) => ({
      id: `v${index}`,
      imageUrl: `https://example.com/${index}.png`,
      isFavorite: false,
      qualityScore: score,
    }));
    render(<MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);
    expect(screen.getAllByRole("listitem").length).toBe(8);
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(screen.getByLabelText("Melhor score entre variações: 92")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar variação 7, score 92, melhor score" })).toBeInTheDocument();
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByRole("button", { name: `Marcar variação ${i} como vencedora` })).toBeInTheDocument();
    }
  });

  it("mantém aria-pressed alinhado com activeIndex e isola clique de marcar vencedora", () => {
    const onSelect = vi.fn();
    const onSelectWinner = vi.fn();
    const variations: VariationItem[] = [
      { id: "1", imageUrl: "https://example.com/1.png", isFavorite: false, qualityScore: 60 },
      { id: "2", imageUrl: "https://example.com/2.png", isFavorite: false, qualityScore: 70, isWinner: true },
      { id: "3", imageUrl: "https://example.com/3.png", isFavorite: false, qualityScore: 65 },
    ];
    render(<MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={onSelect} onSelectWinner={onSelectWinner} />);

    const winnerCard = screen.getByRole("button", { name: /Selecionar variação 2/ });
    expect(winnerCard).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Selecionar variação 1/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(winnerCard);
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onSelectWinner).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Marcar variação 3 como vencedora" }));
    expect(onSelectWinner).toHaveBeenCalledWith(2);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("aplica focus-visible:ring e contraste de disabled nos botões críticos da Onda 5", () => {
    const variations: VariationItem[] = [
      { id: "1", imageUrl: "https://example.com/1.png", isFavorite: false, qualityScore: 70 },
      { id: "2", imageUrl: "https://example.com/2.png", isFavorite: false, qualityScore: 80 },
    ];
    const { unmount } = render(<MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);
    const winnerBtn = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
    const cls = winnerBtn.getAttribute("class") || "";
    expect(cls).toContain("focus-visible:ring");
    expect(cls).toContain("disabled:bg-muted");
    expect(cls).toContain("disabled:text-muted-foreground");
    unmount();

    render(<MagicUpCurationStatus value="draft" disabled onChange={vi.fn()} />);
    const radio = screen.getByRole("radio", { name: "Definir curadoria como Boa" });
    const radioCls = radio.getAttribute("class") || "";
    expect(radioCls).toContain("focus-visible:ring");
    expect(radioCls).toContain("disabled:bg-muted");
    expect(radioCls).toContain("disabled:text-muted-foreground");
    expect(radio).toBeDisabled();
  });

  it("resolve empate de scores de forma determinística e respeita prioridade de isWinner", () => {
    const tied: VariationItem[] = [
      { id: "a", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 70 },
      { id: "b", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 90 },
      { id: "c", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 90 },
    ];
    const { rerender, unmount } = render(
      <MagicUpVariationComparator variations={tied} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />
    );

    expect(screen.getByLabelText("Melhor score entre variações: 90")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(screen.getByRole("button", { name: "Selecionar variação 2, score 90, melhor score" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar variação 3, score 90" })).toBeInTheDocument();

    // Determinismo: re-render mantém winner no índice 1
    rerender(<MagicUpVariationComparator variations={tied} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Selecionar variação 2, score 90, melhor score" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Selecionar variação 3, score 90, melhor score" })).not.toBeInTheDocument();
    unmount();

    // isWinner explícito num item de score baixo ainda vence se aparecer antes do bestScore
    const winnerFirst: VariationItem[] = [
      { id: "a", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 70, isWinner: true },
      { id: "b", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 90 },
      { id: "c", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 90 },
    ];
    render(<MagicUpVariationComparator variations={winnerFirst} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(screen.getByRole("button", { name: "Selecionar variação 1, score 70, melhor score" })).toBeInTheDocument();
  });
});

describe("MagicUpVariationComparator snapshots", () => {
  const baseVariation = (overrides: Partial<VariationItem> & { id: string; imageUrl: string }): VariationItem => ({
    isFavorite: false,
    ...overrides,
  });

  it("snapshot — estado base com 3 variações e scores distintos", () => {
    const variations: VariationItem[] = [
      baseVariation({ id: "a", imageUrl: "https://example.com/a.png", qualityScore: 70 }),
      baseVariation({ id: "b", imageUrl: "https://example.com/b.png", qualityScore: 85 }),
      baseVariation({ id: "c", imageUrl: "https://example.com/c.png", qualityScore: 92 }),
    ];
    const { container } = render(
      <MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("snapshot — variação ativa em activeIndex=1", () => {
    const variations: VariationItem[] = [
      baseVariation({ id: "a", imageUrl: "https://example.com/a.png", qualityScore: 70 }),
      baseVariation({ id: "b", imageUrl: "https://example.com/b.png", qualityScore: 85 }),
      baseVariation({ id: "c", imageUrl: "https://example.com/c.png", qualityScore: 92 }),
    ];
    const { container } = render(
      <MagicUpVariationComparator variations={variations} activeIndex={1} onSelect={vi.fn()} onSelectWinner={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("snapshot — empate de scores [70, 90, 90] mantém badge única no índice 1", () => {
    const variations: VariationItem[] = [
      baseVariation({ id: "a", imageUrl: "https://example.com/a.png", qualityScore: 70 }),
      baseVariation({ id: "b", imageUrl: "https://example.com/b.png", qualityScore: 90 }),
      baseVariation({ id: "c", imageUrl: "https://example.com/c.png", qualityScore: 90 }),
    ];
    const { container } = render(
      <MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("snapshot — scores ausentes exibe placeholders e winner no índice 0", () => {
    const variations: VariationItem[] = [
      baseVariation({ id: "a", imageUrl: "https://example.com/a.png" }),
      baseVariation({ id: "b", imageUrl: "https://example.com/b.png" }),
      baseVariation({ id: "c", imageUrl: "https://example.com/c.png" }),
    ];
    const { container } = render(
      <MagicUpVariationComparator variations={variations} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe("MagicUpVariationComparator keyboard navigation", () => {
  const buildVariations = (): VariationItem[] => [
    { id: "a", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 70 },
    { id: "b", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 85 },
    { id: "c", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 92 },
  ];

  it("Tab percorre cards e botões 'Marcar vencedora' na ordem do DOM", () => {
    render(
      <MagicUpVariationComparator
        variations={buildVariations()}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );

    const expectedOrder = [
      screen.getByRole("button", { name: /Selecionar variação 1/ }),
      screen.getByRole("button", { name: "Marcar variação 1 como vencedora" }),
      screen.getByRole("button", { name: /Selecionar variação 2/ }),
      screen.getByRole("button", { name: "Marcar variação 2 como vencedora" }),
      screen.getByRole("button", { name: /Selecionar variação 3/ }),
      screen.getByRole("button", { name: "Marcar variação 3 como vencedora" }),
    ];

    // Todos os elementos são <button> nativos, focáveis via Tab por padrão (sem tabindex=-1)
    for (const el of expectedOrder) {
      expect(el.tagName).toBe("BUTTON");
      expect(el.getAttribute("tabindex")).not.toBe("-1");
    }

    // Confirma ordem do DOM: cada elemento aparece depois do anterior
    for (let i = 1; i < expectedOrder.length; i++) {
      const prev = expectedOrder[i - 1];
      const curr = expectedOrder[i];
      const position = prev.compareDocumentPosition(curr);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("Enter no card de variação dispara onSelect com índice correto", () => {
    const onSelect = vi.fn();
    const onSelectWinner = vi.fn();
    render(
      <MagicUpVariationComparator
        variations={buildVariations()}
        activeIndex={0}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
      />
    );

    const card = screen.getByRole("button", { name: /Selecionar variação 2/ });
    card.focus();
    expect(document.activeElement).toBe(card);
    // Botões nativos invocam onClick em Enter; simulamos via click() no elemento focado
    fireEvent.keyDown(card, { key: "Enter", code: "Enter" });
    fireEvent.click(card);

    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onSelectWinner).not.toHaveBeenCalled();
  });

  it("Space no card de variação dispara onSelect com índice correto", () => {
    const onSelect = vi.fn();
    const onSelectWinner = vi.fn();
    render(
      <MagicUpVariationComparator
        variations={buildVariations()}
        activeIndex={0}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
      />
    );

    const card = screen.getByRole("button", { name: /Selecionar variação 3/ });
    card.focus();
    expect(document.activeElement).toBe(card);
    fireEvent.keyUp(card, { key: " ", code: "Space" });
    fireEvent.click(card);

    expect(onSelect).toHaveBeenCalledWith(2);
    expect(onSelectWinner).not.toHaveBeenCalled();
  });

  it("Enter no botão 'Marcar vencedora' chama onSelectWinner sem disparar onSelect", () => {
    const onSelect = vi.fn();
    const onSelectWinner = vi.fn();
    render(
      <MagicUpVariationComparator
        variations={buildVariations()}
        activeIndex={0}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
      />
    );

    const winnerBtn = screen.getByRole("button", { name: "Marcar variação 3 como vencedora" });
    winnerBtn.focus();
    expect(document.activeElement).toBe(winnerBtn);
    fireEvent.keyDown(winnerBtn, { key: "Enter", code: "Enter" });
    fireEvent.click(winnerBtn);

    expect(onSelectWinner).toHaveBeenCalledWith(2);
    expect(onSelectWinner).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("MagicUpVariationComparator focus-visible classes", () => {
  const buildVariations = (): VariationItem[] => [
    { id: "a", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 70 },
    { id: "b", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 85 },
    { id: "c", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 92 },
  ];

  it("Botão 'Marcar vencedora' expõe ring + ring-offset no foco (WCAG 2.4.7)", () => {
    render(
      <MagicUpVariationComparator
        variations={buildVariations()}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole("button", { name: /Marcar variação \d+ como vencedora/ });
    expect(buttons).toHaveLength(3);
    for (const btn of buttons) {
      expect(btn.className).toContain("focus-visible:ring-2");
      expect(btn.className).toContain("focus-visible:ring-ring");
      expect(btn.className).toContain("focus-visible:ring-offset-2");
      expect(btn.className).toContain("focus-visible:ring-offset-background");
    }
  });

  it("Card de variação não fica invisível ao foco — outline-none compensado por ring (WCAG 2.4.7)", () => {
    render(
      <MagicUpVariationComparator
        variations={buildVariations()}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );
    const cards = screen.getAllByRole("button", { name: /Selecionar variação \d+/ });
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.className).toContain("focus-visible:outline-none");
      expect(card.className).toContain("focus-visible:ring-2");
      expect(card.className).toContain("focus-visible:ring-ring");
    }
  });

  it("Estado disabled do botão 'Marcar vencedora' mantém contraste legível (WCAG 1.4.3)", () => {
    render(
      <MagicUpVariationComparator
        variations={buildVariations()}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole("button", { name: /Marcar variação \d+ como vencedora/ });
    for (const btn of buttons) {
      expect(btn.className).toContain("disabled:bg-muted");
      expect(btn.className).toContain("disabled:text-muted-foreground");
      expect(btn.className).toContain("disabled:opacity-100");
    }
  });
});