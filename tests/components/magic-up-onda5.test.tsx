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
});