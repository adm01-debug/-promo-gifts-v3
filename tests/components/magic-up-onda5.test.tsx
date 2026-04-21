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

  it("lida com todas as variações sem score exibindo placeholder e SEM badge de vencedor", () => {
    const variations: VariationItem[] = [
      { id: "a", imageUrl: "https://example.com/a.png", isFavorite: false },
      { id: "b", imageUrl: "https://example.com/b.png", isFavorite: false },
      { id: "c", imageUrl: "https://example.com/c.png", isFavorite: false },
    ];
    renderComparator({ variations });
    expect(screen.getByLabelText("Melhor score entre variações: indisponível")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    // Sem score válido → nenhuma badge "Melhor score" e nenhum aria-label de vencedor
    expect(screen.queryAllByLabelText("Melhor score")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /melhor score/i })).not.toBeInTheDocument();
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

  it("empate triplo com isWinner explícito: badge vai para o índice marcado (prioridade absoluta de isWinner)", () => {
    const variations = buildVariations([
      { qualityScore: 85 },
      { qualityScore: 85, isWinner: true },
      { qualityScore: 85 },
    ]);
    renderComparator({ variations });
    // Apenas 1 badge no total
    expect(screen.getAllByLabelText("Melhor score").length).toBe(1);
    // isWinner=true tem prioridade absoluta sobre o cálculo automático por bestScore
    expect(select.cardExact("Selecionar variação 1, score 85")).toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 2, score 85, melhor score")).toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 3, score 85")).toBeInTheDocument();
  });

  it("empate em score 0: trata 0 como avaliação real (ruim) — badge 'Melhor score' vai para o primeiro índice", () => {
    const variations: VariationItem[] = [
      { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 0 },
      { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 0 },
    ];
    renderComparator({ variations });
    // bestScore = 0 (avaliação real) → winnerIndex = 0 → 1 badge no primeiro card
    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
    expect(select.cardExact("Selecionar variação 1, score 0, melhor score")).toBeInTheDocument();
    expect(select.cardExact("Selecionar variação 2, score 0")).toBeInTheDocument();
    // Badge global mostra "0" explícito (não "—")
    expect(screen.getByLabelText(/Melhor score entre variações/)).toHaveTextContent("Melhor score: 0");
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

  it("snapshot — scores ausentes exibe placeholders e nenhum vencedor (sem badge)", () => {
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

  it("caso degenerado (todos sem score): bestScore=0, NENHUMA badge em nenhum card", () => {
    const variations = [0, 1, 2].map((i) =>
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, i)
    );
    renderTied(variations);
    const cards = screen.getAllByRole("listitem");
    const { within } = require("@testing-library/react");
    // Novo contrato: hasValidScores = false → winnerIndex = -1 → sem badge em qualquer card
    expect(within(cards[0]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();
    expect(screen.queryAllByLabelText("Melhor score")).toHaveLength(0);
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
    "empate em score válido (75) com %i variações: exatamente 1 badge 'Melhor score', sempre no índice 0",
    (count) => {
      const variations = Array.from({ length: count }, (_, i) =>
        buildVariation({ qualityScore: 75 }, i)
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

  it("nenhum score (todos undefined): badge 'Melhor score' não aparece em nenhum card e nenhum aria-label menciona vencedor", () => {
    const variations = [
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 0),
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 1),
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 2),
    ];
    renderTied(variations);

    // Nenhuma badge "Melhor score" nos cards
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    cards.forEach((card) => {
      expect(within(card).queryByLabelText("Melhor score")).toBeNull();
    });

    // Nenhum aria-label de botão menciona "melhor score" nem "score N"
    for (let i = 1; i <= 3; i++) {
      const btn = screen.getByRole("button", { name: new RegExp(`Selecionar variação ${i}`) });
      const label = btn.getAttribute("aria-label") || "";
      expect(label).not.toContain("melhor score");
      expect(label).not.toMatch(/score \d/);
    }

    // Badge global do header mostra "—" (placeholder)
    expect(screen.getByLabelText(/Melhor score entre variações/)).toHaveTextContent("Melhor score: —");
  });

  it("isWinner=true em índice 0 com score menor (50) vence sobre índice 1 com score maior (90)", () => {
    const variations = [
      buildVariation({ qualityScore: 50, isWinner: true }, 0),
      buildVariation({ qualityScore: 90 }, 1),
      buildVariation({ qualityScore: 70 }, 2),
    ];
    renderTied(variations);

    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

    const winnerBtn = screen.getByRole("button", { name: /Selecionar variação 1/ });
    expect(winnerBtn.getAttribute("aria-label")).toContain("melhor score");
    expect(winnerBtn.getAttribute("aria-label")).toContain("score 50");
  });

  it("isWinner=true em índice 2 com score menor (30) vence sobre índices 0/1 com scores maiores (70/80)", () => {
    const variations = [
      buildVariation({ qualityScore: 70 }, 0),
      buildVariation({ qualityScore: 80 }, 1),
      buildVariation({ qualityScore: 30, isWinner: true }, 2),
    ];
    renderTied(variations);

    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).not.toBeNull();
  });

  it("isWinner=true sem scores válidos: vence mesmo com bestScore=0", () => {
    const variations = [
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 0),
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined, isWinner: true }, 1),
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 2),
    ];
    renderTied(variations);

    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
    const cards = screen.getAllByRole("listitem");
    expect(within(cards[1]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[0]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

    expect(screen.getByLabelText(/Melhor score entre variações/)).toHaveTextContent("Melhor score: —");
  });

  it("todos com qualityScore=0 (avaliados ruins): bestScore=0, badge no índice 0, header mostra '0' (não '—')", () => {
    const variations = [
      buildVariation({ qualityScore: 0 }, 0),
      buildVariation({ qualityScore: 0 }, 1),
      buildVariation({ qualityScore: 0 }, 2),
    ];
    renderTied(variations);

    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

    // Header mostra o "0" real (não placeholder "—")
    expect(screen.getByLabelText(/Melhor score entre variações/)).toHaveTextContent("Melhor score: 0");

    // aria-label do vencedor inclui "score 0" explícito
    const winnerBtn = screen.getByRole("button", { name: /Selecionar variação 1/ });
    expect(winnerBtn.getAttribute("aria-label")).toContain("score 0");
    expect(winnerBtn.getAttribute("aria-label")).toContain("melhor score");
  });

  it("mix de null e numéricos [null, 60, null, 40]: vencedor é o numérico maior (índice 1)", () => {
    const variations = [
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 0),
      buildVariation({ qualityScore: 60 }, 1),
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined }, 2),
      buildVariation({ qualityScore: 40 }, 3),
    ];
    renderTied(variations);

    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[3]).queryByLabelText("Melhor score")).toBeNull();

    // Cards sem score mostram "—" no aria-label do span de score (Score indisponível)
    expect(within(cards[0]).getByLabelText("Score indisponível")).toBeInTheDocument();
    expect(within(cards[2]).getByLabelText("Score indisponível")).toBeInTheDocument();
    // Cards com score mostram valor numérico
    expect(within(cards[1]).getByLabelText("Score 60 de 100")).toBeInTheDocument();
    expect(within(cards[3]).getByLabelText("Score 40 de 100")).toBeInTheDocument();

    // Header mostra o melhor numérico (60)
    expect(screen.getByLabelText(/Melhor score entre variações/)).toHaveTextContent("Melhor score: 60");
  });

  it("qualityDiagnosis.total=0 tem prioridade absoluta sobre qualityScore=80 (não cai no fallback falsy)", () => {
    const variations = [
      // diagnóstico explícito = 0 deve ser respeitado (não cair em qualityScore=80)
      buildVariation({ qualityDiagnosis: diagnosis(0, "ai"), qualityScore: 80 }, 0),
      buildVariation({ qualityScore: 50 }, 1),
    ];
    renderTied(variations);

    // Variação 1: diagnóstico=0 (não 80) → variação 2 (score 50) é a vencedora
    expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);
    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).not.toBeNull();

    // Card 1 expõe score 0 (não 80) — diagnosis tem prioridade
    expect(within(cards[0]).getByLabelText("Score 0 de 100")).toBeInTheDocument();
    expect(within(cards[1]).getByLabelText("Score 50 de 100")).toBeInTheDocument();

    // Header mostra o maior (50)
    expect(screen.getByLabelText(/Melhor score entre variações/)).toHaveTextContent("Melhor score: 50");
  });

  it("invariante defensivo: sem bestScore (todas null) e sem isWinner — nenhuma badge 'Melhor score' renderiza em nenhum card", () => {
    const variations = [
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined, isWinner: false }, 0),
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined, isWinner: false }, 1),
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined, isWinner: false }, 2),
      buildVariation({ qualityScore: undefined, qualityDiagnosis: undefined, isWinner: false }, 3),
    ];
    renderTied(variations);

    // 1. Zero badges "Melhor score" no DOM inteiro
    expect(screen.queryAllByLabelText("Melhor score")).toHaveLength(0);

    // 2. Cada card individualmente: nenhuma badge
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(4);
    cards.forEach((card) => {
      expect(within(card).queryByLabelText("Melhor score")).toBeNull();
    });

    // 3. Nenhum aria-label de botão menciona "melhor score" nem "score N"
    for (let i = 1; i <= 4; i++) {
      const btn = screen.getByRole("button", { name: new RegExp(`Selecionar variação ${i}`) });
      const label = btn.getAttribute("aria-label") ?? "";
      expect(label).not.toContain("melhor score");
      expect(label).not.toMatch(/, score \d/);
    }

    // 4. Header global mostra "—" (placeholder) e aria-label "indisponível"
    const headerBadge = screen.getByLabelText(/Melhor score entre variações/);
    expect(headerBadge).toHaveTextContent("Melhor score: —");
    expect(headerBadge.getAttribute("aria-label")).toContain("indisponível");

    // 5. Cada card mostra "Score indisponível" no span de score
    cards.forEach((card) => {
      expect(within(card).getByLabelText("Score indisponível")).toBeInTheDocument();
    });
  });

  it("estabilidade sob permutação: empate triplo (80) — vencedor é sempre o índice 0 do array, independente de qual variação ocupe essa posição", () => {
    const variantA: Partial<VariationItem> = { id: "var-A", qualityScore: 80 };
    const variantB: Partial<VariationItem> = { id: "var-B", qualityScore: 80 };
    const variantC: Partial<VariationItem> = { id: "var-C", qualityScore: 80 };

    const assertWinnerAtIndexZero = () => {
      const badges = screen.getAllByLabelText("Melhor score");
      expect(badges).toHaveLength(1);
      const cards = screen.getAllByRole("listitem");
      expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
      expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
      expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();
    };

    // Permutação 1: [A, B, C] → vencedor = A (índice 0)
    const { unmount: unmount1 } = renderTied([
      buildVariation(variantA, 0),
      buildVariation(variantB, 1),
      buildVariation(variantC, 2),
    ]);
    assertWinnerAtIndexZero();
    unmount1();

    // Permutação 2: [B, A, C] → vencedor = B (índice 0)
    const { unmount: unmount2 } = renderTied([
      buildVariation(variantB, 0),
      buildVariation(variantA, 1),
      buildVariation(variantC, 2),
    ]);
    assertWinnerAtIndexZero();
    unmount2();

    // Permutação 3: [C, B, A] → vencedor = C (índice 0)
    renderTied([
      buildVariation(variantC, 0),
      buildVariation(variantB, 1),
      buildVariation(variantA, 2),
    ]);
    assertWinnerAtIndexZero();
  });

  it("aria-labels completos: cenário com vencedor claro — apenas o card vencedor recebe sufixo ', melhor score'; demais terminam exatamente em ', score N'", () => {
    const variations = [
      buildVariation({ id: "var-A", qualityScore: 60 }, 0),
      buildVariation({ id: "var-B", qualityScore: 95 }, 1), // vencedor
      buildVariation({ id: "var-C", qualityScore: 78 }, 2),
    ];
    renderTied(variations);

    const btn1 = screen.getByRole("button", { name: /Selecionar variação 1/ });
    const btn2 = screen.getByRole("button", { name: /Selecionar variação 2/ });
    const btn3 = screen.getByRole("button", { name: /Selecionar variação 3/ });

    // Match literal completo (string igual, sem regex)
    expect(btn1.getAttribute("aria-label")).toBe("Selecionar variação 1, score 60");
    expect(btn2.getAttribute("aria-label")).toBe("Selecionar variação 2, score 95, melhor score");
    expect(btn3.getAttribute("aria-label")).toBe("Selecionar variação 3, score 78");

    // Validação cruzada: apenas 1 ocorrência de ", melhor score" em todo o DOM de aria-labels
    const allButtons = [btn1, btn2, btn3];
    const labelsWithWinner = allButtons.filter((b) =>
      (b.getAttribute("aria-label") ?? "").includes(", melhor score")
    );
    expect(labelsWithWinner).toHaveLength(1);
    expect(labelsWithWinner[0]).toBe(btn2);

    // Validação defensiva: não-vencedores não terminam com sufixo de winner
    expect(btn1.getAttribute("aria-label")).not.toMatch(/, melhor score$/);
    expect(btn3.getAttribute("aria-label")).not.toMatch(/, melhor score$/);
  });

  it("empate parcial (2 no topo + 1 abaixo): badge 'Melhor score' aparece apenas no primeiro empatado; variação com score menor nunca recebe badge", () => {
    const variations = [
      buildVariation({ id: "var-A", qualityScore: 90 }, 0),
      buildVariation({ id: "var-B", qualityScore: 90 }, 1),
      buildVariation({ id: "var-C", qualityScore: 70 }, 2),
    ];
    renderTied(variations);

    const badges = screen.getAllByLabelText("Melhor score");
    expect(badges).toHaveLength(1);

    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

    const btn1 = screen.getByRole("button", { name: /Selecionar variação 1/ });
    const btn2 = screen.getByRole("button", { name: /Selecionar variação 2/ });
    const btn3 = screen.getByRole("button", { name: /Selecionar variação 3/ });
    expect(btn1.getAttribute("aria-label")).toBe("Selecionar variação 1, score 90, melhor score");
    expect(btn2.getAttribute("aria-label")).toBe("Selecionar variação 2, score 90");
    expect(btn3.getAttribute("aria-label")).toBe("Selecionar variação 3, score 70");

    expect(screen.getByLabelText(/Melhor score entre variações: 90/)).toBeInTheDocument();
  });

  it("empate parcial com permutação: ordem [C=70, A=90, B=90] → winner determinístico no índice 1 (primeiro empatado no maior score)", () => {
    const variations = [
      buildVariation({ id: "var-C", qualityScore: 70 }, 0),
      buildVariation({ id: "var-A", qualityScore: 90 }, 1),
      buildVariation({ id: "var-B", qualityScore: 90 }, 2),
    ];
    renderTied(variations);

    const badges = screen.getAllByLabelText("Melhor score");
    expect(badges).toHaveLength(1);

    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

    const btn1 = screen.getByRole("button", { name: /Selecionar variação 1/ });
    const btn2 = screen.getByRole("button", { name: /Selecionar variação 2/ });
    const btn3 = screen.getByRole("button", { name: /Selecionar variação 3/ });
    expect(btn1.getAttribute("aria-label")).toBe("Selecionar variação 1, score 70");
    expect(btn2.getAttribute("aria-label")).toBe("Selecionar variação 2, score 90, melhor score");
    expect(btn3.getAttribute("aria-label")).toBe("Selecionar variação 3, score 90");
  });

  it("cardinalidade do sufixo 'melhor score' em empate: exatamente 1 aria-label contém o sufixo; demais não contêm em nenhuma posição", () => {
    const variations = [
      buildVariation({ id: "var-A", qualityScore: 85 }, 0),
      buildVariation({ id: "var-B", qualityScore: 85 }, 1),
      buildVariation({ id: "var-C", qualityScore: 85 }, 2),
    ];
    renderTied(variations);

    const allSelectButtons = screen.getAllByRole("button", { name: /^Selecionar variação \d+/ });
    expect(allSelectButtons).toHaveLength(3);

    const withWinnerSuffix = allSelectButtons.filter((btn) =>
      (btn.getAttribute("aria-label") ?? "").includes(", melhor score")
    );
    expect(withWinnerSuffix).toHaveLength(1);

    expect(withWinnerSuffix[0].getAttribute("aria-label")).toBe(
      "Selecionar variação 1, score 85, melhor score"
    );

    const withoutWinnerSuffix = allSelectButtons.filter((btn) =>
      !(btn.getAttribute("aria-label") ?? "").includes(", melhor score")
    );
    expect(withoutWinnerSuffix).toHaveLength(2);
    withoutWinnerSuffix.forEach((btn) => {
      const label = btn.getAttribute("aria-label") ?? "";
      expect(label).not.toContain("melhor score");
      expect(label).not.toMatch(/melhor/i);
    });

    const badges = screen.getAllByLabelText("Melhor score");
    expect(badges).toHaveLength(1);
  });

  it("determinismo por ordem em empate: mesmos ids+scores em ordens diferentes → winner segue o array, sem depender de isWinner", () => {
    const baseVariations = [
      buildVariation({ id: "var-X", qualityScore: 88 }, 0),
      buildVariation({ id: "var-Y", qualityScore: 88 }, 1),
      buildVariation({ id: "var-Z", qualityScore: 88 }, 2),
    ];
    baseVariations.forEach((v) => {
      expect(v.isWinner).toBeFalsy();
    });

    const { unmount: unmount1 } = renderTied(baseVariations);
    const badges1 = screen.getAllByLabelText("Melhor score");
    expect(badges1).toHaveLength(1);
    const cards1 = screen.getAllByRole("listitem");
    expect(within(cards1[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards1[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards1[2]).queryByLabelText("Melhor score")).toBeNull();
    unmount1();

    const reordered = [
      buildVariation({ id: "var-Z", qualityScore: 88 }, 0),
      buildVariation({ id: "var-X", qualityScore: 88 }, 1),
      buildVariation({ id: "var-Y", qualityScore: 88 }, 2),
    ];
    reordered.forEach((v) => {
      expect(v.isWinner).toBeFalsy();
    });
    const { unmount: unmount2 } = renderTied(reordered);
    const badges2 = screen.getAllByLabelText("Melhor score");
    expect(badges2).toHaveLength(1);
    const cards2 = screen.getAllByRole("listitem");
    expect(within(cards2[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards2[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards2[2]).queryByLabelText("Melhor score")).toBeNull();
    unmount2();

    const reordered2 = [
      buildVariation({ id: "var-Y", qualityScore: 88 }, 0),
      buildVariation({ id: "var-Z", qualityScore: 88 }, 1),
      buildVariation({ id: "var-X", qualityScore: 88 }, 2),
    ];
    renderTied(reordered2);
    const cards3 = screen.getAllByRole("listitem");
    expect(within(cards3[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards3[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards3[2]).queryByLabelText("Melhor score")).toBeNull();

    const winnerBtn = screen.getByRole("button", { name: /Selecionar variação 1, score 88, melhor score/ });
    expect(winnerBtn).toBeInTheDocument();
  });

  it("empate triplo sem isWinner: renderiza exatamente 1 badge 'Melhor score' no primeiro índice", () => {
    const variations = [
      buildVariation({ id: "var-1", qualityScore: 75 }, 0),
      buildVariation({ id: "var-2", qualityScore: 75 }, 1),
      buildVariation({ id: "var-3", qualityScore: 75 }, 2),
    ];

    variations.forEach((v) => {
      expect(v.isWinner).toBeFalsy();
    });

    renderTied(variations);

    const badges = screen.getAllByLabelText("Melhor score");
    expect(badges).toHaveLength(1);

    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

    const winnerBtn = screen.getByRole("button", {
      name: "Selecionar variação 1, score 75, melhor score",
    });
    expect(winnerBtn).toBeInTheDocument();

    expect(screen.getByLabelText(/Melhor score entre variações: 75/)).toBeInTheDocument();
  });

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
    const comparatorSection = container.querySelector('[aria-label="Comparador de variações"]');
    expect(comparatorSection).not.toBeNull();

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

  it("dois isWinner: true simultâneos: apenas o primeiro marcado recebe badge (findIndex determinístico)", () => {
    const variations = [
      buildVariation({ id: "var-A", qualityScore: 60, isWinner: true }, 0),
      buildVariation({ id: "var-B", qualityScore: 95, isWinner: false }, 1),
      buildVariation({ id: "var-C", qualityScore: 80, isWinner: true }, 2),
    ];

    expect(variations.filter((v) => v.isWinner === true)).toHaveLength(2);
    expect(variations[0].isWinner).toBe(true);
    expect(variations[2].isWinner).toBe(true);

    renderTied(variations);

    const badges = screen.getAllByLabelText("Melhor score");
    expect(badges).toHaveLength(1);

    const cards = screen.getAllByRole("listitem");
    expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
    expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
    expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

    const winnerBtn = screen.getByRole("button", {
      name: "Selecionar variação 1, score 60, melhor score",
    });
    expect(winnerBtn).toBeInTheDocument();

    const varBBtn = screen.getByRole("button", {
      name: "Selecionar variação 2, score 95",
    });
    expect(varBBtn).toBeInTheDocument();

    const varCBtn = screen.getByRole("button", {
      name: "Selecionar variação 3, score 80",
    });
    expect(varCBtn).toBeInTheDocument();

    const allSelectButtons = screen.getAllByRole("button", { name: /^Selecionar variação/ });
    const withSuffix = allSelectButtons.filter((btn) =>
      (btn.getAttribute("aria-label") ?? "").includes("melhor score")
    );
    expect(withSuffix).toHaveLength(1);

    expect(screen.getByLabelText(/Melhor score entre variações: 95/)).toBeInTheDocument();
  });

  it.each([
    { label: "menor índice tem menor score", scoreA: 10, scoreC: 99 },
    { label: "menor índice tem maior score", scoreA: 99, scoreC: 10 },
    { label: "ambos têm o mesmo score", scoreA: 50, scoreC: 50 },
  ])(
    "múltiplos isWinner: true — vencedor é sempre o de menor índice ($label)",
    ({ scoreA, scoreC }) => {
      const variations = [
        buildVariation({ id: "var-A", qualityScore: scoreA, isWinner: true }, 0),
        buildVariation({ id: "var-B", qualityScore: 50, isWinner: false }, 1),
        buildVariation({ id: "var-C", qualityScore: scoreC, isWinner: true }, 2),
      ];

      expect(variations.filter((v) => v.isWinner === true)).toHaveLength(2);
      expect(variations[0].isWinner).toBe(true);
      expect(variations[2].isWinner).toBe(true);

      renderTied(variations);

      expect(screen.getAllByLabelText("Melhor score")).toHaveLength(1);

      const cards = screen.getAllByRole("listitem");
      expect(within(cards[0]).queryByLabelText("Melhor score")).not.toBeNull();
      expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
      expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

      const winnerBtn = screen.getByRole("button", {
        name: `Selecionar variação 1, score ${scoreA}, melhor score`,
      });
      expect(winnerBtn).toBeInTheDocument();

      const varCBtn = screen.getByRole("button", {
        name: `Selecionar variação 3, score ${scoreC}`,
      });
      expect(varCBtn).toBeInTheDocument();

      const allSelectButtons = screen.getAllByRole("button", { name: /^Selecionar variação/ });
      const withSuffix = allSelectButtons.filter((btn) =>
        (btn.getAttribute("aria-label") ?? "").includes("melhor score")
      );
      expect(withSuffix).toHaveLength(1);

      // 6. Verificações negativas dirigidas a var-C (segundo isWinner: true que perde)
      const varCCard = cards[2];
      expect(within(varCCard).queryByLabelText("Melhor score")).toBeNull();
      expect(within(varCCard).queryByText("Melhor score")).toBeNull();

      const varCButton = within(varCCard).getByRole("button", { name: /^Selecionar variação 3/ });
      expect(varCButton.getAttribute("aria-label")).not.toMatch(/melhor score/);
      expect(varCButton.getAttribute("aria-label")).toBe(`Selecionar variação 3, score ${scoreC}`);
      expect(varCButton).toHaveAttribute("aria-pressed", "false");
      expect(varCButton).not.toHaveAttribute("aria-current");

      const varBCard = cards[1];
      expect(within(varBCard).queryByLabelText("Melhor score")).toBeNull();
      const varBButton = within(varBCard).getByRole("button", { name: /^Selecionar variação 2/ });
      expect(varBButton.getAttribute("aria-label")).not.toMatch(/melhor score/);
      expect(varBButton.getAttribute("aria-label")).toBe("Selecionar variação 2, score 50");

      const winnerButtons = screen
        .getAllByRole("button", { name: /^Selecionar variação/ })
        .filter((btn) => (btn.getAttribute("aria-label") ?? "").endsWith(", melhor score"));
      expect(winnerButtons).toHaveLength(1);
      expect(winnerButtons[0].getAttribute("aria-label")).toBe(
        `Selecionar variação 1, score ${scoreA}, melhor score`
      );

      // 7. Auditoria global de cardinalidade — protege contra duplicações em
      //    qualquer parte do DOM acessível (header, listitems, tooltips, sr-only).
      const exactBadgeMatches = screen.getAllByLabelText("Melhor score", { exact: true });
      expect(exactBadgeMatches).toHaveLength(1);

      const headerMatches = screen.getAllByLabelText(/^Melhor score entre variações:/);
      expect(headerMatches).toHaveLength(1);

      const visibleBadgeText = screen.getAllByText("Melhor score", { exact: true });
      expect(visibleBadgeText).toHaveLength(1);

      const allElementsWithSuffix = Array.from(
        document.querySelectorAll("[aria-label]")
      ).filter((el) => (el.getAttribute("aria-label") ?? "").endsWith(", melhor score"));
      expect(allElementsWithSuffix).toHaveLength(1);

      expect(cards[0].contains(exactBadgeMatches[0])).toBe(true);
      expect(cards[0].contains(visibleBadgeText[0])).toBe(true);

      // 8. Contrato literal de aria-labels — espec. executável dos 3 botões
      //    Documenta o formato esperado lado a lado e trava regressões de formato
      //    (vírgulas, espaçamento, ordem dos componentes).

      // 8.1 Mapa do contrato esperado por card (índice → aria-label literal)
      const expectedAriaLabels: Record<number, string> = {
        0: `Selecionar variação 1, score ${scoreA}, melhor score`,
        1: "Selecionar variação 2, score 50",
        2: `Selecionar variação 3, score ${scoreC}`,
      };

      // 8.2 Validação literal por card — cada button deve ter EXATAMENTE o aria-label
      //     definido no contrato, sem caracteres extras, sem espaços a mais.
      cards.forEach((card, index) => {
        const button = within(card).getByRole("button", { name: /^Selecionar variação/ });
        const ariaLabel = button.getAttribute("aria-label");
        expect(ariaLabel).toBe(expectedAriaLabels[index]);
      });

      // 8.3 Validação estrutural — vencedor tem 3 componentes (separados por ", "),
      //     perdedores têm 2 componentes. Trava o formato do contrato.
      const winnerLabel = within(cards[0])
        .getByRole("button", { name: /^Selecionar variação/ })
        .getAttribute("aria-label");
      expect(winnerLabel?.split(", ")).toHaveLength(3);
      expect(winnerLabel?.split(", ")[2]).toBe("melhor score");

      [cards[1], cards[2]].forEach((card) => {
        const label = within(card)
          .getByRole("button", { name: /^Selecionar variação/ })
          .getAttribute("aria-label");
        expect(label?.split(", ")).toHaveLength(2);
        expect(label).not.toMatch(/melhor score/);
      });

      // 8.4 Cross-check com a coleção completa — todos os 3 labels esperados
      //     existem no DOM e nenhum label inesperado aparece.
      const allButtonLabels = screen
        .getAllByRole("button", { name: /^Selecionar variação/ })
        .map((btn) => btn.getAttribute("aria-label"));
      expect(allButtonLabels).toEqual([
        expectedAriaLabels[0],
        expectedAriaLabels[1],
        expectedAriaLabels[2],
      ]);
    }
  );

  it("badge 'Melhor score' permanece no winnerIndex mesmo quando outro card é selecionado (activeIndex controlado)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onSelectWinner = vi.fn();

    const variations: VariationItem[] = [
      { id: "var-A", imageUrl: "https://example.com/a.png", qualityScore: 60 },
      { id: "var-B", imageUrl: "https://example.com/b.png", qualityScore: 90 },
      { id: "var-C", imageUrl: "https://example.com/c.png", qualityScore: 40 },
    ];
    const winnerIndex = 1;

    const renderWithActive = (activeIndex: number) => (
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={activeIndex}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
      />
    );

    const { rerender } = render(renderWithActive(0));

    const assertWinnerInvariant = (currentActive: number) => {
      const cards = screen.getAllByRole("listitem");

      // 1. Badge sempre no winnerIndex
      expect(within(cards[winnerIndex]).getByLabelText("Melhor score")).toBeInTheDocument();
      expect(within(cards[winnerIndex]).getByText("Melhor score")).toBeInTheDocument();

      // 2. Cardinalidade global
      expect(screen.getAllByLabelText("Melhor score", { exact: true })).toHaveLength(1);
      expect(screen.getAllByText("Melhor score", { exact: true })).toHaveLength(1);

      // 3. Outros cards sem badge
      [0, 1, 2].filter((i) => i !== winnerIndex).forEach((i) => {
        expect(within(cards[i]).queryByLabelText("Melhor score")).toBeNull();
      });

      // 4. aria-pressed/aria-current refletem activeIndex
      cards.forEach((card, i) => {
        const button = within(card).getByRole("button", { name: /^Selecionar variação/ });
        const isActive = i === currentActive;
        expect(button).toHaveAttribute("aria-pressed", String(isActive));
        if (isActive) {
          expect(button).toHaveAttribute("aria-current", "true");
        } else {
          expect(button).not.toHaveAttribute("aria-current");
        }
      });

      // 5. Aria-label do winner mantém sufixo
      const winnerButton = within(cards[winnerIndex]).getByRole("button", {
        name: /^Selecionar variação 2/,
      });
      expect(winnerButton.getAttribute("aria-label")).toBe(
        "Selecionar variação 2, score 90, melhor score"
      );
    };

    const captureSnapshot = (clickedIndex: number) => {
      const cards = screen.getAllByRole("listitem");
      const clickedButton = within(cards[clickedIndex]).getByRole("button", {
        name: /^Selecionar variação/,
      });
      const winnerButton = within(cards[winnerIndex]).getByRole("button", {
        name: /^Selecionar variação/,
      });
      return {
        clickedAriaPressed: clickedButton.getAttribute("aria-pressed"),
        winnerAriaPressed: winnerButton.getAttribute("aria-pressed"),
        winnerBadgePresent: within(cards[winnerIndex]).queryByLabelText("Melhor score") !== null,
        winnerBadgeText: within(cards[winnerIndex]).queryByText("Melhor score") !== null,
      };
    };

    const clickAndAssertSnapshot = async (
      clickIndex: number,
      newActiveIndex: number,
      expectedBefore: ReturnType<typeof captureSnapshot>,
      expectedAfter: ReturnType<typeof captureSnapshot>
    ) => {
      const beforeSnapshot = captureSnapshot(clickIndex);
      expect(beforeSnapshot).toEqual(expectedBefore);

      const cardsForClick = screen.getAllByRole("listitem");
      await user.click(
        within(cardsForClick[clickIndex]).getByRole("button", { name: /^Selecionar variação/ })
      );
      expect(onSelect).toHaveBeenLastCalledWith(clickIndex);
      rerender(renderWithActive(newActiveIndex));

      const afterSnapshot = captureSnapshot(clickIndex);
      expect(afterSnapshot).toEqual(expectedAfter);
    };

    assertWinnerInvariant(0);

    // CLIQUE 1: var-B (winner) — clicado === winner
    await clickAndAssertSnapshot(
      1,
      1,
      {
        clickedAriaPressed: "false",
        winnerAriaPressed: "false",
        winnerBadgePresent: true,
        winnerBadgeText: true,
      },
      {
        clickedAriaPressed: "true",
        winnerAriaPressed: "true",
        winnerBadgePresent: true,
        winnerBadgeText: true,
      }
    );
    assertWinnerInvariant(1);

    // CLIQUE 2: var-C — clicado ≠ winner; winner perde aria-pressed mas mantém badge
    await clickAndAssertSnapshot(
      2,
      2,
      {
        clickedAriaPressed: "false",
        winnerAriaPressed: "true",
        winnerBadgePresent: true,
        winnerBadgeText: true,
      },
      {
        clickedAriaPressed: "true",
        winnerAriaPressed: "false",
        winnerBadgePresent: true,
        winnerBadgeText: true,
      }
    );
    assertWinnerInvariant(2);

    // CLIQUE 3: var-A — badge persiste em var-B
    await clickAndAssertSnapshot(
      0,
      0,
      {
        clickedAriaPressed: "false",
        winnerAriaPressed: "false",
        winnerBadgePresent: true,
        winnerBadgeText: true,
      },
      {
        clickedAriaPressed: "true",
        winnerAriaPressed: "false",
        winnerBadgePresent: true,
        winnerBadgeText: true,
      }
    );
    assertWinnerInvariant(0);

    expect(onSelect).toHaveBeenCalledTimes(3);
    expect(onSelect.mock.calls.map((c) => c[0])).toEqual([1, 2, 0]);
    expect(onSelectWinner).not.toHaveBeenCalled();
  });

  it("badge 'Melhor score' não migra ao clicar em sequência em cards empatados não vencedores", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onSelectWinner = vi.fn();

    // Setup: var-A é winner único (95); var-B e var-C empatadas em 70 (perdedoras)
    const variations: VariationItem[] = [
      { id: "var-A", imageUrl: "https://example.com/a.png", qualityScore: 95 },
      { id: "var-B", imageUrl: "https://example.com/b.png", qualityScore: 70 },
      { id: "var-C", imageUrl: "https://example.com/c.png", qualityScore: 70 },
    ];
    const winnerIndex = 0;

    const renderWithActive = (activeIndex: number) => (
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={activeIndex}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
      />
    );

    const { rerender } = render(renderWithActive(0));

    const assertBadgeFixedOnWinner = (currentActive: number) => {
      const cards = screen.getAllByRole("listitem");

      // 1. Cardinalidade global: exatamente 1 badge no DOM
      expect(screen.getAllByLabelText("Melhor score", { exact: true })).toHaveLength(1);
      expect(screen.getAllByText("Melhor score", { exact: true })).toHaveLength(1);

      // 2. Badge presente em var-A (winner único)
      expect(within(cards[winnerIndex]).getByLabelText("Melhor score")).toBeInTheDocument();

      // 3. Badge AUSENTE nas duas empatadas
      expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
      expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

      // 4. Aria-labels: empatadas sem sufixo; winner com sufixo
      const aLabel = within(cards[0]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
      const bLabel = within(cards[1]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
      const cLabel = within(cards[2]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
      expect(aLabel).toBe("Selecionar variação 1, score 95, melhor score");
      expect(bLabel).toBe("Selecionar variação 2, score 70");
      expect(cLabel).toBe("Selecionar variação 3, score 70");

      // 5. aria-pressed reflete activeIndex; badge é independente
      expect(within(cards[currentActive]).getByRole("button", { name: /^Selecionar variação/ }))
        .toHaveAttribute("aria-pressed", "true");
    };

    // Estado inicial
    assertBadgeFixedOnWinner(0);

    // CLIQUE 1: var-B (empatada, perdedora)
    await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: /^Selecionar variação 2/ }));
    expect(onSelect).toHaveBeenLastCalledWith(1);
    rerender(renderWithActive(1));
    assertBadgeFixedOnWinner(1);

    // CLIQUE 2: var-C (outra empatada)
    await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
    expect(onSelect).toHaveBeenLastCalledWith(2);
    rerender(renderWithActive(2));
    assertBadgeFixedOnWinner(2);

    // CLIQUE 3: volta para var-B (toggle entre empatadas)
    await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: /^Selecionar variação 2/ }));
    expect(onSelect).toHaveBeenLastCalledWith(1);
    rerender(renderWithActive(1));
    assertBadgeFixedOnWinner(1);

    // CLIQUE 4: var-C novamente
    await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
    expect(onSelect).toHaveBeenLastCalledWith(2);
    rerender(renderWithActive(2));
    assertBadgeFixedOnWinner(2);

    // Auditoria final
    expect(onSelect).toHaveBeenCalledTimes(4);
    expect(onSelect.mock.calls.map((c) => c[0])).toEqual([1, 2, 1, 2]);
    expect(onSelectWinner).not.toHaveBeenCalled();
  });

  it("badge fica no menor índice quando 2 cards têm isWinner: true e usuário clica no empatado de maior índice", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onSelectWinner = vi.fn();

    // Setup: var-A (idx 0) E var-C (idx 2) com isWinner: true; var-B (idx 1) sem
    // Score var-B é maior (99) para provar que isWinner explícito tem precedência
    const variations: VariationItem[] = [
      { id: "var-A", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 70, curationStatus: "draft", isWinner: true },
      { id: "var-B", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 99, curationStatus: "draft", isWinner: false },
      { id: "var-C", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 70, curationStatus: "draft", isWinner: true },
    ];
    const expectedWinnerIndex = 0;

    const renderWithActive = (activeIndex: number) => (
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={activeIndex}
        onSelect={onSelect}
        onSelectWinner={onSelectWinner}
      />
    );

    const { rerender } = render(renderWithActive(0));

    const assertBadgeOnFirstWinner = (currentActive: number) => {
      const cards = screen.getAllByRole("listitem");

      // 1. Cardinalidade global = 1 (não duplica entre os 2 isWinner)
      expect(screen.getAllByLabelText("Melhor score", { exact: true })).toHaveLength(1);
      expect(screen.getAllByText("Melhor score", { exact: true })).toHaveLength(1);

      // 2. Badge SOMENTE em var-A (menor índice com isWinner)
      expect(within(cards[expectedWinnerIndex]).getByLabelText("Melhor score")).toBeInTheDocument();
      expect(within(cards[1]).queryByLabelText("Melhor score")).toBeNull();
      expect(within(cards[2]).queryByLabelText("Melhor score")).toBeNull();

      // 3. Aria-labels: só var-A tem sufixo, mesmo var-C tendo isWinner: true
      const aLabel = within(cards[0]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
      const bLabel = within(cards[1]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
      const cLabel = within(cards[2]).getByRole("button", { name: /^Selecionar variação/ }).getAttribute("aria-label");
      expect(aLabel).toBe("Selecionar variação 1, score 70, melhor score");
      expect(bLabel).toBe("Selecionar variação 2, score 99");
      expect(cLabel).toBe("Selecionar variação 3, score 70");

      // 4. aria-pressed reflete activeIndex; badge é independente
      expect(within(cards[currentActive]).getByRole("button", { name: /^Selecionar variação/ }))
        .toHaveAttribute("aria-pressed", "true");
    };

    // Estado inicial
    assertBadgeOnFirstWinner(0);

    // CLIQUE 1: var-C (winner empatado de MAIOR índice)
    await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
    expect(onSelect).toHaveBeenLastCalledWith(2);
    rerender(renderWithActive(2));
    assertBadgeOnFirstWinner(2);

    // CLIQUE 2: var-C novamente (re-confirma estabilidade)
    await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
    expect(onSelect).toHaveBeenLastCalledWith(2);
    rerender(renderWithActive(2));
    assertBadgeOnFirstWinner(2);

    // CLIQUE 3: var-B (não-winner, mas score 99) — não promove a winner
    await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: /^Selecionar variação 2/ }));
    expect(onSelect).toHaveBeenLastCalledWith(1);
    rerender(renderWithActive(1));
    assertBadgeOnFirstWinner(1);

    // CLIQUE 4: volta para var-C
    await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button", { name: /^Selecionar variação 3/ }));
    expect(onSelect).toHaveBeenLastCalledWith(2);
    rerender(renderWithActive(2));
    assertBadgeOnFirstWinner(2);

    // Auditoria final
    expect(onSelect).toHaveBeenCalledTimes(4);
    expect(onSelect.mock.calls.map((c) => c[0])).toEqual([2, 2, 1, 2]);
    expect(onSelectWinner).not.toHaveBeenCalled();
  });
});
