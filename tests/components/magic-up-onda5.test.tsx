import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("compara variações com aria-pressed e botão vencedora único por variação", async () => {
    const variations = buildVariations([
      { qualityScore: 70 },
      { qualityScore: undefined, qualityDiagnosis: diagnosis(92) },
      { qualityScore: undefined },
    ]);
    const { onSelect, onSelectWinner, user } = renderComparator({ variations });

    expect(screen.getByLabelText("Comparador de variações")).toBeInTheDocument();
    const firstBtn = select.card(1);
    expect(firstBtn).toHaveAttribute("aria-pressed", "true");
    expect(firstBtn).toHaveAttribute("aria-current", "true");
    await user.click(select.card(2));
    expect(onSelect).toHaveBeenCalledWith(1);
    await user.click(select.marcar(2));
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
    renderComparator({ variations });
    expect(screen.getByLabelText("Melhor score entre variações: indisponível")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(select.cardExact("Selecionar variação 1, melhor score")).toBeInTheDocument();
  });

  it("identifica vencedor único quando há scores parciais sem confundir 0 com ausente", () => {
    const variations: VariationItem[] = [
      { id: "a", imageUrl: "https://example.com/a.png", isFavorite: false },
      { id: "b", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 80 },
      { id: "c", imageUrl: "https://example.com/c.png", isFavorite: false },
    ];
    renderComparator({ variations });
    expect(screen.getByLabelText("Melhor score entre variações: 80")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(select.cardExact("Selecionar variação 2, score 80, melhor score")).toBeInTheDocument();
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
    renderComparator({ variations });
    expect(screen.getAllByRole("listitem").length).toBe(8);
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(screen.getByLabelText("Melhor score entre variações: 92")).toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 7, score 92, melhor score")).toBeInTheDocument();
    for (let i = 1; i <= 8; i++) {
      expect(select.marcar(i)).toBeInTheDocument();
    }
  });

  it("mantém aria-pressed alinhado com activeIndex e isola clique de marcar vencedora", async () => {
    const variations = buildVariations([
      { qualityScore: 60 },
      { qualityScore: 70, isWinner: true },
      { qualityScore: 65 },
    ]);
    const { onSelect, onSelectWinner, user } = renderComparator({ variations });

    const winnerCard = select.card(2);
    expect(winnerCard).toHaveAttribute("aria-pressed", "false");
    expect(select.card(1)).toHaveAttribute("aria-pressed", "true");

    await user.click(winnerCard);
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onSelectWinner).not.toHaveBeenCalled();

    await user.click(select.marcar(3));
    expect(onSelectWinner).toHaveBeenCalledWith(2);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("aplica focus-visible:ring e contraste de disabled nos botões críticos da Onda 5", () => {
    const variations = buildVariations([{ qualityScore: 70 }, { qualityScore: 80 }]).slice(0, 2);
    const { unmount } = renderComparator({ variations });
    const winnerBtn = select.marcar(1);
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
    expect(select.cardExact("Selecionar variação 2, score 90, melhor score")).toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 3, score 90")).toBeInTheDocument();

    // Determinismo: re-render mantém winner no índice 1
    rerender(<MagicUpVariationComparator variations={tied} activeIndex={0} onSelect={vi.fn()} onSelectWinner={vi.fn()} />);
    expect(select.cardExact("Selecionar variação 2, score 90, melhor score")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Selecionar variação 3, score 90, melhor score" })).not.toBeInTheDocument();
    unmount();

    // isWinner explícito num item de score baixo ainda vence se aparecer antes do bestScore
    const winnerFirst: VariationItem[] = [
      { id: "a", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 70, isWinner: true },
      { id: "b", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 90 },
      { id: "c", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 90 },
    ];
    renderComparator({ variations: winnerFirst });
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(select.cardExact("Selecionar variação 1, score 70, melhor score")).toBeInTheDocument();
  });

  it("empate total: exibe exatamente 1 badge 'Melhor score' no primeiro índice (winner determinístico)", () => {
    const variations = buildVariations([
      { qualityScore: 80 },
      { qualityScore: 80 },
      { qualityScore: 80 },
    ]);
    renderComparator({ variations });
    // Exatamente 1 badge "Melhor score" entre todas as variações empatadas
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    // Winner determinístico: primeiro índice (findIndex retorna o primeiro match)
    expect(select.cardExact("Selecionar variação 1, score 80, melhor score")).toBeInTheDocument();
    // Variações 2 e 3 NÃO têm sufixo "melhor score" no aria-label
    expect(select.cardExact("Selecionar variação 2, score 80")).toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 3, score 80")).toBeInTheDocument();
    // Badge isolada tem aria-label exato e texto visível sincronizado
    const badge = screen.getByLabelText("Melhor score");
    expect(badge).toHaveTextContent("Melhor score");
    // Contagem global: badge + botão + listitem aninhado = 3 nodes acessíveis com "melhor score"
    expect(screen.getAllByLabelText(/melhor score/i)).toHaveLength(3);
    // Ausência explícita do sufixo de winner nas variações 2 e 3
    expect(screen.queryByRole("button", { name: /Selecionar variação 2.*melhor score/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Selecionar variação 3.*melhor score/i })).not.toBeInTheDocument();
  });

  it("empate triplo com isWinner explícito: ainda exibe exatamente 1 badge 'Melhor score'", () => {
    const variations = buildVariations([
      { qualityScore: 85 },
      { qualityScore: 85, isWinner: true },
      { qualityScore: 85 },
    ]);
    renderComparator({ variations });
    // Mesmo com isWinner explícito + 3 empatados, apenas 1 badge
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    // findIndex retorna o primeiro match (índice 0 satisfaz scores[0] === bestScore)
    expect(select.cardExact("Selecionar variação 1, score 85, melhor score")).toBeInTheDocument();
    // Variação 2 (com isWinner: true) NÃO recebe badge — comportamento atual do findIndex
    expect(select.cardExact("Selecionar variação 2, score 85")).toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 3, score 85")).toBeInTheDocument();
  });

  it("empate em score 0: trata 0 como valor válido e atribui 'Melhor score' ao primeiro índice", () => {
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 0 },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 0 },
    ];
    renderComparator({ variations });
    // bestScore = 0 é válido → exatamente 1 badge "Melhor score"
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    // Winner determinístico: índice 0 recebe sufixo "melhor score"
    expect(select.cardExact("Selecionar variação 1, melhor score")).toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 2")).toBeInTheDocument();
  });

  it("dois isWinner: true simultâneos: badge vai para o primeiro índice marcado, ignorando o segundo", () => {
    const variations = buildVariations([
      { qualityScore: 60, isWinner: true },
      { qualityScore: 70 },
      { qualityScore: 50, isWinner: true },
    ]);
    renderComparator({ variations });
    // Apenas 1 badge mesmo com 2 isWinner: true
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    // Variação 1 (índice 0, primeiro isWinner) recebe sufixo
    expect(select.cardExact("Selecionar variação 1, score 60, melhor score")).toBeInTheDocument();
    // Variação 2 (score 70, sem isWinner) não recebe badge — score mais alto é ignorado
    expect(select.cardExact("Selecionar variação 2, score 70")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Selecionar variação 2.*melhor score/i })).not.toBeInTheDocument();
    // Variação 3 (segundo isWinner) NÃO recebe badge — findIndex já parou no índice 0
    expect(select.cardExact("Selecionar variação 3, score 50")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Selecionar variação 3.*melhor score/i })).not.toBeInTheDocument();
  });

  it("clicar em card empatado não-vencedor: chama onSelect mas não move a badge 'Melhor score'", async () => {
    const variations = buildVariations([
      { qualityScore: 80 },
      { qualityScore: 80 },
      { qualityScore: 80 },
    ]);
    const onSelect = vi.fn();
    const { rerender, user } = renderComparator({ variations, onSelect });
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    expect(select.cardExact("Selecionar variação 1, score 80, melhor score")).toBeInTheDocument();

    await user.click(select.cardExact("Selecionar variação 2, score 80"));
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
    expect(select.cardExact("Selecionar variação 1, score 80, melhor score")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Selecionar variação 2.*melhor score/i })).not.toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 2, score 80")).toHaveAttribute("aria-pressed", "true");
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
  it("Tab percorre cards e botões 'Marcar vencedora' na ordem do DOM", () => {
    renderComparator();

    const expectedOrder = [
      select.card(1),
      select.marcar(1),
      select.card(2),
      select.marcar(2),
      select.card(3),
      select.marcar(3),
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

  it("Enter no card de variação dispara onSelect com índice correto", async () => {
    const { onSelect, onSelectWinner, user } = renderComparator();

    const card = select.card(2);
    card.focus();
    expect(card).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onSelectWinner).not.toHaveBeenCalled();
  });

  it("Space no card de variação dispara onSelect com índice correto", async () => {
    const { onSelect, onSelectWinner, user } = renderComparator();

    const card = select.card(3);
    card.focus();
    expect(card).toHaveFocus();
    await user.keyboard(" ");

    expect(onSelect).toHaveBeenCalledWith(2);
    expect(onSelectWinner).not.toHaveBeenCalled();
  });

  it("Enter no botão 'Marcar vencedora' chama onSelectWinner sem disparar onSelect", async () => {
    const { onSelect, onSelectWinner, user } = renderComparator();

    const winnerBtn = select.marcar(3);
    winnerBtn.focus();
    expect(winnerBtn).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onSelectWinner).toHaveBeenCalledWith(2);
    expect(onSelectWinner).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("regressão: Enter em botão focado dispara onClick nativo (semântica HTML preservada, sem keyDown handler custom)", async () => {
    const { onSelect, onSelectWinner, user } = renderComparator();

    const card = select.card(2);
    card.focus();
    expect(card).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);

    const card3 = select.card(3);
    card3.focus();
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith(2);

    expect(onSelectWinner).not.toHaveBeenCalled();
  });

  it("Tab/Shift+Tab navega na ordem DOM: select-1 → marcar-1 → select-2 → marcar-2 → select-3 → marcar-3", async () => {
    const { user } = renderComparator();

    expect(document.body).toHaveFocus();

    await user.tab();
    expect(select.cardExact("Selecionar variação 1, score 90, melhor score")).toHaveFocus();

    await user.tab();
    expect(select.marcar(1)).toHaveFocus();

    await user.tab();
    expect(select.cardExact("Selecionar variação 2, score 70")).toHaveFocus();

    await user.tab();
    expect(select.marcar(2)).toHaveFocus();

    await user.tab();
    expect(select.cardExact("Selecionar variação 3, score 50")).toHaveFocus();

    await user.tab();
    expect(select.marcar(3)).toHaveFocus();

    await user.tab({ shift: true });
    expect(select.cardExact("Selecionar variação 3, score 50")).toHaveFocus();

    await user.tab({ shift: true });
    expect(select.marcar(2)).toHaveFocus();
  });

  it("card ativo reflete activeIndex via aria-pressed/aria-current/border-primary, independente do foco do teclado", () => {
    const variations = buildVariations();
    const { rerender } = renderComparator({ variations });

    const card1Btn = select.card(1);
    const card2Btn = select.card(2);
    const card3Btn = select.card(3);

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

    const marcar2 = select.marcar(2);
    expect(marcar2).toBeDisabled();

    await user.tab();
    expect(select.cardExact("Selecionar variação 1, score 80")).toHaveFocus();
    await user.tab();
    expect(select.marcar(1)).toHaveFocus();
    await user.tab();
    expect(select.cardExact("Selecionar variação 2, score 80")).toHaveFocus();
    await user.tab();
    expect(select.cardExact("Selecionar variação 3, score 80")).toHaveFocus();
    expect(marcar2).not.toHaveFocus();

    marcar2.focus();
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

    const marcar2 = select.marcar(2);
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

    const marcar1 = select.marcar(1);
    marcar1.focus();
    await user.keyboard("{Enter}");
    expect(onSelectWinner).toHaveBeenCalledWith(0);
    expect(onSelectWinner).toHaveBeenCalledTimes(1);
  });

  it("Shift+Tab navega em ordem reversa completa: marcar-3 → select-3 → marcar-2 → select-2 → marcar-1 → select-1", async () => {
    const { user } = renderComparator();

    const marcar3 = select.marcar(3);
    marcar3.focus();
    expect(marcar3).toHaveFocus();

    await user.tab({ shift: true });
    expect(select.cardExact("Selecionar variação 3, score 50")).toHaveFocus();

    await user.tab({ shift: true });
    expect(select.marcar(2)).toHaveFocus();

    await user.tab({ shift: true });
    expect(select.cardExact("Selecionar variação 2, score 70")).toHaveFocus();

    await user.tab({ shift: true });
    expect(select.marcar(1)).toHaveFocus();

    await user.tab({ shift: true });
    expect(select.cardExact("Selecionar variação 1, score 90, melhor score")).toHaveFocus();

    await user.tab();
    expect(select.marcar(1)).toHaveFocus();
  });

  it("Enter e Space ativam onSelect (cards) e onSelectWinner (marcar) consistentemente, inclusive após Shift+Tab", async () => {
    const variations = buildVariations().slice(0, 2);
    const { onSelect, onSelectWinner, user } = renderComparator({ variations });

    const select1 = select.card(1);
    const marcar1 = select.marcar(1);
    const select2 = select.cardExact("Selecionar variação 2, score 70");
    const marcar2 = select.marcar(2);

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

  it("Enter/Space disparam re-render que atualiza border-primary + aria-pressed + aria-current no novo card ativo", async () => {
    const user = userEvent.setup();
    const variations = buildVariations();

    function ControlledHarness() {
      const [active, setActive] = React.useState(0);
      return (
        <MagicUpVariationComparator
          variations={variations}
          activeIndex={active}
          onSelect={setActive}
          onSelectWinner={vi.fn()}
        />
      );
    }

    render(<ControlledHarness />);

    const select1 = select.card(1);
    const select2 = select.cardExact("Selecionar variação 2, score 70");
    const select3 = select.cardExact("Selecionar variação 3, score 50");

    expect(select1).toHaveAttribute("aria-pressed", "true");
    expect(select1).toHaveAttribute("aria-current", "true");
    expect(select1.parentElement).toHaveClass("border-primary");
    expect(select2.parentElement).not.toHaveClass("border-primary");

    await user.tab();
    await user.tab();
    await user.tab();
    expect(select2).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(select2).toHaveAttribute("aria-pressed", "true");
    expect(select2).toHaveAttribute("aria-current", "true");
    expect(select2.parentElement).toHaveClass("border-primary");
    expect(select2.parentElement?.className).toMatch(/ring-2/);
    expect(select1).toHaveAttribute("aria-pressed", "false");
    expect(select1).not.toHaveAttribute("aria-current");
    expect(select1.parentElement).not.toHaveClass("border-primary");

    await user.tab();
    await user.tab();
    expect(select3).toHaveFocus();
    await user.keyboard(" ");

    expect(select3).toHaveAttribute("aria-pressed", "true");
    expect(select3).toHaveAttribute("aria-current", "true");
    expect(select3.parentElement).toHaveClass("border-primary");
    expect(select2).toHaveAttribute("aria-pressed", "false");
    expect(select2.parentElement).not.toHaveClass("border-primary");
  });

  it("Enter/Space não alteram quantidade de botões, listitems, imagens nem criam portais/tooltips", async () => {
    const user = userEvent.setup();
    const onSelectWinner = vi.fn();
    const variations = buildVariations();

    function ControlledHarness() {
      const [active, setActive] = React.useState(0);
      return (
        <MagicUpVariationComparator
          variations={variations}
          activeIndex={active}
          onSelect={setActive}
          onSelectWinner={onSelectWinner}
        />
      );
    }

    const { container } = render(<ControlledHarness />);

    const initialButtons = screen.getAllByRole("button").length;
    const initialListItems = screen.getAllByRole("listitem").length;
    const initialImages = container.querySelectorAll("img").length;
    const initialBodyChildren = document.body.children.length;
    const initialSectionHTML = container.querySelector("section")?.outerHTML.length || 0;

    expect(initialButtons).toBe(6);
    expect(initialListItems).toBe(3);
    expect(initialImages).toBe(3);

    await user.tab();
    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(screen.getAllByRole("button").length).toBe(initialButtons);
    expect(screen.getAllByRole("listitem").length).toBe(initialListItems);
    expect(container.querySelectorAll("img").length).toBe(initialImages);
    expect(document.body.children.length).toBe(initialBodyChildren);
    const afterEnterHTML = container.querySelector("section")?.outerHTML.length || 0;
    expect(Math.abs(afterEnterHTML - initialSectionHTML)).toBeLessThan(200);

    await user.tab();
    await user.keyboard(" ");
    expect(onSelectWinner).toHaveBeenCalledWith(1);

    expect(screen.getAllByRole("button").length).toBe(initialButtons);
    expect(screen.getAllByRole("listitem").length).toBe(initialListItems);
    expect(container.querySelectorAll("img").length).toBe(initialImages);
    expect(document.body.children.length).toBe(initialBodyChildren);

    expect(document.querySelector("[role='tooltip']")).toBeNull();
    expect(document.querySelector("[role='dialog']")).toBeNull();
    expect(document.querySelector("[data-radix-portal]")).toBeNull();
  });

  it("ARIA do cartão ativo: aria-pressed='true' + aria-current='true' apenas no activeIndex; demais sem aria-current", () => {
    const variations = buildVariations();

    for (const activeIdx of [0, 1, 2]) {
      const { unmount } = render(
        <MagicUpVariationComparator
          variations={variations}
          activeIndex={activeIdx}
          onSelect={vi.fn()}
          onSelectWinner={vi.fn()}
        />
      );

      const cards = [select.card(1), select.card(2), select.card(3)];

      cards.forEach((card, i) => {
        if (i === activeIdx) {
          expect(card).toHaveAttribute("aria-pressed", "true");
          expect(card).toHaveAttribute("aria-current", "true");
        } else {
          expect(card).toHaveAttribute("aria-pressed", "false");
          expect(card).not.toHaveAttribute("aria-current");
        }
      });

      unmount();
    }
  });

  it("aria-label do botão 'Selecionar' compõe corretamente: índice + score (opcional) + 'melhor score' (opcional)", () => {
    const variations: VariationItem[] = [
      // 1: com score, é winner explícito → "Selecionar variação 1, score 95, melhor score"
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 95, isWinner: true },
      // 2: com score, não é winner → "Selecionar variação 2, score 70"
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
      // 3: sem score → "Selecionar variação 3"
      { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false },
    ];

    renderComparator({ variations });

    expect(select.cardExact("Selecionar variação 1, score 95, melhor score")).toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 2, score 70")).toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 3")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Selecionar variação 2, melhor score" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Selecionar variação 3, score 0" })).not.toBeInTheDocument();
  });

  it("aria-label dos botões 'Marcar vencedora' é único por índice; botões de ação não têm aria-pressed/aria-current", () => {
    const variations = buildVariations([{ qualityScore: 90, isWinner: true }, {}, {}]);

    renderComparator({ variations });

    const marcar1 = select.marcar(1);
    const marcar2 = select.marcar(2);
    const marcar3 = select.marcar(3);

    expect(marcar1).toBeInTheDocument();
    expect(marcar2).toBeInTheDocument();
    expect(marcar3).toBeInTheDocument();
    expect(marcar1).not.toBe(marcar2);
    expect(marcar2).not.toBe(marcar3);

    for (const btn of [marcar1, marcar2, marcar3]) {
      expect(btn).not.toHaveAttribute("aria-pressed");
      expect(btn).not.toHaveAttribute("aria-current");
    }

    expect(marcar1).toBeEnabled();

    expect(select.allMarcar()).toHaveLength(3);
  });

  describe("navegação por setas (APG composite widget)", () => {
    function ArrowHarness({ initial = 0 }: { initial?: number }) {
      const [active, setActive] = React.useState(initial);
      return (
        <MagicUpVariationComparator
          variations={buildVariations()}
          activeIndex={active}
          onSelect={setActive}
          onSelectWinner={vi.fn()}
        />
      );
    }

    it("ArrowRight e ArrowDown avançam activeIndex e movem foco para o próximo card", async () => {
      const user = userEvent.setup();
      render(<ArrowHarness initial={0} />);

      const card1 = select.card(1);
      card1.focus();
      expect(card1).toHaveFocus();

      await user.keyboard("{ArrowRight}");
      const card2 = select.card(2);
      expect(card2).toHaveFocus();
      expect(card2).toHaveAttribute("aria-pressed", "true");
      expect(card2).toHaveAttribute("aria-current", "true");

      await user.keyboard("{ArrowDown}");
      const card3 = select.card(3);
      expect(card3).toHaveFocus();
      expect(card3).toHaveAttribute("aria-pressed", "true");
    });

    it("ArrowLeft e ArrowUp retrocedem activeIndex e movem foco para o card anterior", async () => {
      const user = userEvent.setup();
      render(<ArrowHarness initial={2} />);

      const card3 = select.card(3);
      card3.focus();
      expect(card3).toHaveFocus();

      await user.keyboard("{ArrowLeft}");
      const card2 = select.card(2);
      expect(card2).toHaveFocus();
      expect(card2).toHaveAttribute("aria-pressed", "true");

      await user.keyboard("{ArrowUp}");
      const card1 = select.card(1);
      expect(card1).toHaveFocus();
      expect(card1).toHaveAttribute("aria-pressed", "true");
    });

    it("ArrowRight no último faz wrap para o primeiro; ArrowLeft no primeiro faz wrap para o último; Home/End funcionam", async () => {
      const user = userEvent.setup();
      render(<ArrowHarness initial={2} />);

      const card1 = select.card(1);
      const card3 = select.card(3);

      card3.focus();
      await user.keyboard("{ArrowRight}");
      expect(card1).toHaveFocus();
      expect(card1).toHaveAttribute("aria-pressed", "true");

      await user.keyboard("{ArrowLeft}");
      expect(card3).toHaveFocus();
      expect(card3).toHaveAttribute("aria-pressed", "true");

      await user.keyboard("{Home}");
      expect(card1).toHaveFocus();
      expect(card1).toHaveAttribute("aria-pressed", "true");

      await user.keyboard("{End}");
      expect(card3).toHaveFocus();
      expect(card3).toHaveAttribute("aria-pressed", "true");
    });

    it("teclas não-seta não interceptam navegação: Tab segue ordem natural; letras não disparam onSelect", async () => {
      const { onSelect, user } = renderComparator();

      const card1 = select.card(1);
      card1.focus();
      expect(card1).toHaveFocus();

      await user.keyboard("a");
      expect(onSelect).not.toHaveBeenCalled();
      expect(card1).toHaveFocus();

      await user.keyboard("{Tab}");
      const marcar1 = select.marcar(1);
      expect(marcar1).toHaveFocus();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("botão 'Selecionar' expõe aria-keyshortcuts com setas + Home/End", () => {
      renderComparator();
      const cards = select.allCards();
      for (const card of cards) {
        const shortcuts = card.getAttribute("aria-keyshortcuts") || "";
        expect(shortcuts).toContain("ArrowLeft");
        expect(shortcuts).toContain("ArrowRight");
        expect(shortcuts).toContain("ArrowUp");
        expect(shortcuts).toContain("ArrowDown");
        expect(shortcuts).toContain("Home");
        expect(shortcuts).toContain("End");
      }
    });
  });
});

describe("MagicUpVariationComparator focus-visible classes", () => {
  it("Botão 'Marcar vencedora' expõe ring + ring-offset no foco (WCAG 2.4.7)", () => {
    renderComparator();
    const buttons = select.allMarcar();
    expect(buttons).toHaveLength(3);
    for (const btn of buttons) {
      expect(btn.className).toContain("focus-visible:ring-2");
      expect(btn.className).toContain("focus-visible:ring-ring");
      expect(btn.className).toContain("focus-visible:ring-offset-2");
      expect(btn.className).toContain("focus-visible:ring-offset-background");
    }
  });

  it("Card de variação não fica invisível ao foco — outline-none compensado por ring (WCAG 2.4.7)", () => {
    renderComparator();
    const cards = select.allCards();
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.className).toContain("focus-visible:outline-none");
      expect(card.className).toContain("focus-visible:ring-2");
      expect(card.className).toContain("focus-visible:ring-ring");
    }
  });

  it("Estado disabled do botão 'Marcar vencedora' mantém contraste legível (WCAG 1.4.3)", () => {
    renderComparator();
    const buttons = select.allMarcar();
    for (const btn of buttons) {
      expect(btn.className).toContain("disabled:bg-muted");
      expect(btn.className).toContain("disabled:text-muted-foreground");
      expect(btn.className).toContain("disabled:opacity-100");
    }
  });

  it("Tab atravessa cards e botões 'Marcar vencedora' alternadamente; cada parada tem classes focus-visible:ring-2 (WCAG 2.4.7)", async () => {
    const { user } = renderComparator();

    const expectedOrder: Array<{ name: RegExp | string }> = [
      { name: /^Selecionar variação 1/ },
      { name: "Marcar variação 1 como vencedora" },
      { name: /^Selecionar variação 2/ },
      { name: "Marcar variação 2 como vencedora" },
      { name: /^Selecionar variação 3/ },
      { name: "Marcar variação 3 como vencedora" },
    ];

    for (const matcher of expectedOrder) {
      await user.tab();
      const focused = screen.getByRole("button", matcher);
      expect(focused).toHaveFocus();
      expect(focused.className).toContain("focus-visible:ring-2");
      expect(focused.className).toContain("focus-visible:ring-ring");
    }
  });

  it("Cards de seleção aplicam focus-visible:outline-none e são alcançáveis por Tab (sem outline duplicado sobre o ring)", async () => {
    const { user } = renderComparator();

    const cards = select.allCards();
    for (const card of cards) {
      expect(card.className).toContain("focus-visible:outline-none");
    }

    await user.tab();
    expect(cards[0]).toHaveFocus();
    expect(cards[0].className).toContain("focus-visible:ring-2");
  });

  it("Botões 'Marcar vencedora' aplicam ring-2 + ring-offset-2 + ring-offset-background e são alcançados na 2ª parada do Tab (WCAG 1.4.11)", async () => {
    const { user } = renderComparator();

    const marcarBtns = select.allMarcar();
    for (const btn of marcarBtns) {
      expect(btn.className).toContain("focus-visible:ring-2");
      expect(btn.className).toContain("focus-visible:ring-ring");
      expect(btn.className).toContain("focus-visible:ring-offset-2");
      expect(btn.className).toContain("focus-visible:ring-offset-background");
    }

    await user.tab(); // card1
    await user.tab(); // marcar1
    expect(marcarBtns[0]).toHaveFocus();
  });
});

// ─────────────────────────────────────────────────────────────────────
// MagicUpVariationComparator — empate total de scores (determinismo)
// Trava contrato: findIndex retorna primeiro empatado; apenas 1 badge "Melhor score"
// ─────────────────────────────────────────────────────────────────────

describe("MagicUpVariationComparator — empate total de scores (determinismo)", () => {
  function buildVariation(overrides: Partial<VariationItem> = {}, idx = 0): VariationItem {
    return {
      id: `var-${idx}`,
      imageUrl: `https://example.com/img-${idx}.png`,
      isFavorite: false,
      qualityScore: 75,
      isWinner: false,
      ...overrides,
    };
  }

  const renderTied = (variations: VariationItem[]) =>
    render(
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );

  it("empate total com qualityScore=75: renderiza exatamente 1 badge 'Melhor score' nos cards", () => {
    const variations = [0, 1, 2].map((i) => buildVariation({ qualityScore: 75 }, i));
    renderTied(variations);
    // Filtra apenas as badges dos cards (exclui o badge do header "Melhor score: N")
    const cardBadges = screen
      .getAllByLabelText("Melhor score")
      .filter((el) => el.tagName.toLowerCase() !== "div" || !el.textContent?.includes(":"));
    // O badge no header tem aria-label diferente ("Melhor score entre variações: ...")
    // então getAllByLabelText("Melhor score") só pega os badges dentro dos cards
    expect(cardBadges).toHaveLength(1);
  });

  it("empate total: badge 'Melhor score' aparece apenas no card do índice 0", () => {
    const variations = [0, 1, 2].map((i) => buildVariation({ qualityScore: 75 }, i));
    renderTied(variations);
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    const { within } = require("@testing-library/react");
    expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();
  });

  it("empate total via qualityDiagnosis.total=90: badge fica no índice 0 (mesmo determinismo)", () => {
    const variations = [0, 1, 2].map((i) =>
      buildVariation({ qualityScore: undefined, qualityDiagnosis: diagnosis(90) }, i)
    );
    renderTied(variations);
    const cards = screen.getAllByRole("listitem");
    const { within } = require("@testing-library/react");
    expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();
    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
  });

  it("caso degenerado (todos sem score): bestScore=0, badge ainda aparece no índice 0", () => {
    const variations = [0, 1, 2].map((i) =>
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, i)
    );
    renderTied(variations);
    const cards = screen.getAllByRole("listitem");
    const { within } = require("@testing-library/react");
    // Contrato atual: scores[index] === bestScore (0===0) → findIndex retorna 0
    expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();
  });

  it("empate parcial [60, 90, 90]: badge no primeiro com bestScore (índice 1), nunca no 2", () => {
    const variations = [
      buildVariation({ qualityScore: 60 }, 0),
      buildVariation({ qualityScore: 90 }, 1),
      buildVariation({ qualityScore: 90 }, 2),
    ];
    renderTied(variations);
    const cards = screen.getAllByRole("listitem");
    const { within } = require("@testing-library/react");
    expect(within(cards[0]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();
    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
  });

  it.each([2, 3, 5])(
    "empate em score 0 com %i variações: exatamente 1 badge 'Melhor score', sempre no índice 0",
    (count) => {
      const variations = Array.from({ length: count }, (_, i) =>
        buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, i)
      );
      renderTied(variations);

      expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);

      const cards = screen.getAllByRole("listitem");
      expect(cards).toHaveLength(count);
      const { within } = require("@testing-library/react");
      expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
      for (let i = 1; i < count; i++) {
        expect(within(cards[i]).queryByLabelText("Melhor score")).toBeNull();
      }
    }
  );

  it("score=0 (empate degenerado): aria-label do vencedor inclui 'melhor score' mas omite 'score 0'", () => {
    const variations = [
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 0),
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 1),
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 2),
    ];
    renderTied(variations);

    // Vencedor (índice 0): aria-label deve conter "melhor score" mas NÃO "score 0"
    const winnerButton = screen.getByRole("button", { name: /Selecionar variação 1/ });
    const winnerLabel = winnerButton.getAttribute("aria-label") || "";
    expect(winnerLabel).toContain("melhor score");
    expect(winnerLabel).not.toMatch(/score 0\b/);
    expect(winnerLabel).not.toContain(", score 0");

    // Não-vencedores (índices 1, 2): aria-label não menciona "score 0" nem "melhor score"
    const loser1 = screen.getByRole("button", { name: /Selecionar variação 2/ });
    const loser2 = screen.getByRole("button", { name: /Selecionar variação 3/ });
    expect(loser1.getAttribute("aria-label")).not.toMatch(/score 0\b/);
    expect(loser1.getAttribute("aria-label")).not.toContain("melhor score");
    expect(loser2.getAttribute("aria-label")).not.toMatch(/score 0\b/);
    expect(loser2.getAttribute("aria-label")).not.toContain("melhor score");
  });
});
