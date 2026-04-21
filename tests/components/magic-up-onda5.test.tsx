import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("empate total: exibe exatamente 1 badge 'Melhor score' no primeiro índice (winner determinístico)", () => {
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 80 },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 80 },
      { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 80 },
    ];
    render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );
    // Exatamente 1 badge "Melhor score" entre todas as variações empatadas
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    // Winner determinístico: primeiro índice (findIndex retorna o primeiro match)
    expect(
      screen.getByRole("button", { name: "Selecionar variação 1, score 80, melhor score" })
    ).toBeInTheDocument();
    // Variações 2 e 3 NÃO têm sufixo "melhor score" no aria-label
    expect(screen.getByRole("button", { name: "Selecionar variação 2, score 80" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar variação 3, score 80" })).toBeInTheDocument();
    // Badge isolada tem aria-label exato e texto visível sincronizado
    const badge = screen.getByLabelText("Melhor score");
    expect(badge).toHaveTextContent("Melhor score");
    // Contagem global: badge + botão + listitem aninhado = 3 nodes acessíveis com "melhor score"
    // (badge tem aria-label próprio; botão tem aria-label com sufixo; listitem herda accessible name do botão filho)
    // Trava o contrato atual — qualquer mudança que introduza node extra (tooltip/sr-only) quebra
    expect(screen.getAllByLabelText(/melhor score/i)).toHaveLength(3);
    // Ausência explícita do sufixo de winner nas variações 2 e 3
    expect(
      screen.queryByRole("button", { name: /Selecionar variação 2.*melhor score/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Selecionar variação 3.*melhor score/i })
    ).not.toBeInTheDocument();
  });

  it("empate triplo com isWinner explícito: ainda exibe exatamente 1 badge 'Melhor score'", () => {
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 85 },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 85, isWinner: true },
      { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 85 },
    ];
    render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );
    // Mesmo com isWinner explícito + 3 empatados, apenas 1 badge
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    // findIndex retorna o primeiro match (índice 0 satisfaz scores[0] === bestScore)
    expect(
      screen.getByRole("button", { name: "Selecionar variação 1, score 85, melhor score" })
    ).toBeInTheDocument();
    // Variação 2 (com isWinner: true) NÃO recebe badge — comportamento atual do findIndex
    expect(screen.getByRole("button", { name: "Selecionar variação 2, score 85" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar variação 3, score 85" })).toBeInTheDocument();
  });

  it("empate em score 0: trata 0 como valor válido e atribui 'Melhor score' ao primeiro índice", () => {
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 0 },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 0 },
    ];
    render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );
    // bestScore = 0 é válido → exatamente 1 badge "Melhor score"
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    // Winner determinístico: índice 0 recebe sufixo "melhor score"
    // (aria-label omite ", score N" quando score é 0/falsy — comportamento atual)
    expect(screen.getByRole("button", { name: "Selecionar variação 1, melhor score" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar variação 2" })).toBeInTheDocument();
  });

  it("dois isWinner: true simultâneos: badge vai para o primeiro índice marcado, ignorando o segundo", () => {
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 60, isWinner: true },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
      { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50, isWinner: true },
    ];
    render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );
    // Apenas 1 badge mesmo com 2 isWinner: true
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    // Variação 1 (índice 0, primeiro isWinner) recebe sufixo
    expect(
      screen.getByRole("button", { name: "Selecionar variação 1, score 60, melhor score" })
    ).toBeInTheDocument();
    // Variação 2 (score 70, sem isWinner) não recebe badge — score mais alto é ignorado
    expect(
      screen.getByRole("button", { name: "Selecionar variação 2, score 70" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Selecionar variação 2.*melhor score/i })
    ).not.toBeInTheDocument();
    // Variação 3 (segundo isWinner) NÃO recebe badge — findIndex já parou no índice 0
    expect(
      screen.getByRole("button", { name: "Selecionar variação 3, score 50" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Selecionar variação 3.*melhor score/i })
    ).not.toBeInTheDocument();
  });

  it("clicar em card empatado não-vencedor: chama onSelect mas não move a badge 'Melhor score'", () => {
    const onSelect = vi.fn();
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 80 },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 80 },
      { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 80 },
    ];
    const { rerender } = render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={0}
        onSelect={onSelect}
        onSelectWinner={vi.fn()}
      />
    );
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(
      screen.getByRole("button", { name: "Selecionar variação 1, score 80, melhor score" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Selecionar variação 2, score 80" }));
    expect(onSelect).toHaveBeenCalledWith(1);

    rerender(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={1}
        onSelect={onSelect}
        onSelectWinner={vi.fn()}
      />
    );

    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(
      screen.getByRole("button", { name: "Selecionar variação 1, score 80, melhor score" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Selecionar variação 2.*melhor score/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Selecionar variação 2, score 80" })
    ).toHaveAttribute("aria-pressed", "true");
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

  it("Tab/Shift+Tab navega na ordem DOM: select-1 → marcar-1 → select-2 → marcar-2 → select-3 → marcar-3", async () => {
    const user = userEvent.setup();
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
      { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
    ];
    render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );

    expect(document.body).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: /Selecionar variação 1, score 90, melhor score/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Selecionar variação 2, score 70" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Marcar variação 2 como vencedora" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Selecionar variação 3, score 50" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Marcar variação 3 como vencedora" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Selecionar variação 3, score 50" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Marcar variação 2 como vencedora" })).toHaveFocus();
  });

  it("card ativo reflete activeIndex via aria-pressed/aria-current/border-primary, independente do foco do teclado", () => {
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
      { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
    ];
    const { rerender } = render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );

    const card1Btn = screen.getByRole("button", { name: /Selecionar variação 1, score 90, melhor score/i });
    const card2Btn = screen.getByRole("button", { name: "Selecionar variação 2, score 70" });
    const card3Btn = screen.getByRole("button", { name: "Selecionar variação 3, score 50" });

    expect(card1Btn).toHaveAttribute("aria-pressed", "true");
    expect(card1Btn).toHaveAttribute("aria-current", "true");
    expect(card2Btn).toHaveAttribute("aria-pressed", "false");
    expect(card2Btn).not.toHaveAttribute("aria-current");
    expect(card3Btn).toHaveAttribute("aria-pressed", "false");
    expect(card3Btn).not.toHaveAttribute("aria-current");

    expect(card1Btn.parentElement).toHaveClass("border-primary");
    expect(card2Btn.parentElement).not.toHaveClass("border-primary");

    // Foco programático no card 3 não muda o estado ativo
    card3Btn.focus();
    expect(card3Btn).toHaveFocus();
    expect(card1Btn).toHaveAttribute("aria-pressed", "true");
    expect(card3Btn).toHaveAttribute("aria-pressed", "false");
    expect(card3Btn.parentElement).not.toHaveClass("border-primary");

    rerender(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={2}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );

    expect(card1Btn).toHaveAttribute("aria-pressed", "false");
    expect(card1Btn).not.toHaveAttribute("aria-current");
    expect(card3Btn).toHaveAttribute("aria-pressed", "true");
    expect(card3Btn).toHaveAttribute("aria-current", "true");
    expect(card3Btn.parentElement).toHaveClass("border-primary");
    expect(card1Btn.parentElement).not.toHaveClass("border-primary");
  });

  it("'Marcar vencedora' com disabled nativo: removido do Tab e Enter/Space não disparam onSelectWinner", async () => {
    const user = userEvent.setup();
    const onSelectWinner = vi.fn();

    function Harness() {
      return (
        <section className="rounded-lg border bg-card p-3">
          <div role="list" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} role="listitem" className="overflow-hidden rounded-lg border">
                <button
                  type="button"
                  aria-pressed={i === 0}
                  aria-label={`Selecionar variação ${i + 1}, score 80`}
                  onClick={vi.fn()}
                >
                  card {i + 1}
                </button>
                <button
                  type="button"
                  disabled={i === 1}
                  aria-label={`Marcar variação ${i + 1} como vencedora`}
                  onClick={() => onSelectWinner(i)}
                >
                  Marcar vencedora
                </button>
              </div>
            ))}
          </div>
        </section>
      );
    }

    render(<Harness />);

    const marcar2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });
    expect(marcar2).toBeDisabled();

    await user.tab();
    expect(screen.getByRole("button", { name: "Selecionar variação 1, score 80" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Selecionar variação 2, score 80" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Selecionar variação 3, score 80" })).toHaveFocus();
    expect(marcar2).not.toHaveFocus();

    marcar2.focus();
    // .focus() em botão disabled é no-op: foco permanece no elemento anterior (select-3)
    expect(marcar2).not.toHaveFocus();

    await user.click(marcar2);
    expect(onSelectWinner).not.toHaveBeenCalled();
  });

  it("'Marcar vencedora' com aria-disabled=true: mantém no Tab mas Enter/Space/click são ignorados via guarda", async () => {
    const user = userEvent.setup();
    const onSelectWinner = vi.fn();

    function Harness() {
      const handleClick = (i: number) => (e: React.MouseEvent | React.KeyboardEvent) => {
        if ((e.currentTarget as HTMLElement).getAttribute("aria-disabled") === "true") return;
        onSelectWinner(i);
      };
      return (
        <section>
          <div role="list" className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} role="listitem">
                <button
                  type="button"
                  aria-label={`Selecionar variação ${i + 1}, score 80`}
                  onClick={vi.fn()}
                >
                  card {i + 1}
                </button>
                <button
                  type="button"
                  aria-disabled={i === 1 ? "true" : undefined}
                  aria-label={`Marcar variação ${i + 1} como vencedora`}
                  onClick={handleClick(i)}
                >
                  Marcar vencedora
                </button>
              </div>
            ))}
          </div>
        </section>
      );
    }

    render(<Harness />);

    const marcar2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });
    expect(marcar2).toHaveAttribute("aria-disabled", "true");
    expect(marcar2).not.toBeDisabled();

    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(marcar2).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onSelectWinner).not.toHaveBeenCalled();

    await user.keyboard(" ");
    expect(onSelectWinner).not.toHaveBeenCalled();

    await user.click(marcar2);
    expect(onSelectWinner).not.toHaveBeenCalled();

    const marcar1 = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
    marcar1.focus();
    await user.keyboard("{Enter}");
    expect(onSelectWinner).toHaveBeenCalledWith(0);
    expect(onSelectWinner).toHaveBeenCalledTimes(1);
  });

  it("Shift+Tab navega em ordem reversa completa: marcar-3 → select-3 → marcar-2 → select-2 → marcar-1 → select-1", async () => {
    const user = userEvent.setup();
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
      { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
    ];
    render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );

    const marcar3 = screen.getByRole("button", { name: "Marcar variação 3 como vencedora" });
    marcar3.focus();
    expect(marcar3).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Selecionar variação 3, score 50" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Marcar variação 2 como vencedora" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Selecionar variação 2, score 70" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: /Selecionar variação 1, score 90, melhor score/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).toHaveFocus();
  });

  it("Enter e Space ativam onSelect (cards) e onSelectWinner (marcar) consistentemente, inclusive após Shift+Tab", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onSelectWinner = vi.fn();
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    ];
    render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={0}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
      />
    );

    const select1 = screen.getByRole("button", { name: /Selecionar variação 1, score 90/i });
    const marcar1 = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
    const select2 = screen.getByRole("button", { name: "Selecionar variação 2, score 70" });
    const marcar2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });

    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(marcar2).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelectWinner).toHaveBeenCalledWith(1);
    expect(onSelectWinner).toHaveBeenCalledTimes(1);

    await user.tab({ shift: true });
    expect(select2).toHaveFocus();
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onSelect).toHaveBeenCalledTimes(1);

    await user.tab({ shift: true });
    expect(marcar1).toHaveFocus();
    await user.keyboard(" ");
    expect(onSelectWinner).toHaveBeenCalledWith(0);
    expect(onSelectWinner).toHaveBeenCalledTimes(2);

    await user.tab({ shift: true });
    expect(select1).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(0);
    expect(onSelect).toHaveBeenCalledTimes(2);

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelectWinner).toHaveBeenCalledTimes(2);
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