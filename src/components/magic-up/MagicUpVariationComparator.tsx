import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariationItem } from "@/hooks/useMagicUpState";

interface MagicUpVariationComparatorProps {
  variations: VariationItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onSelectWinner: (index: number) => void;
}

export function MagicUpVariationComparator({ variations, activeIndex, onSelect, onSelectWinner }: MagicUpVariationComparatorProps) {
  if (variations.length < 2) return null;
  const scores = variations.map((variation) => variation.qualityDiagnosis?.total || variation.qualityScore || 0);
  const bestScore = Math.max(...scores);
  const winnerIndex = variations.findIndex((variation, index) => variation.isWinner || scores[index] === bestScore);

  return (
    <section className="rounded-lg border bg-card p-3" aria-label="Comparador de variações">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Comparar variações</p>
        <Badge variant="secondary">Melhor score: {bestScore || "—"}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {variations.map((variation, index) => {
          const score = scores[index];
          const isWinner = index === winnerIndex;
          return (
            <div
              key={`${variation.id || variation.imageUrl}-${index}`}
              role="button"
              tabIndex={0}
              className={cn("group overflow-hidden rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", index === activeIndex ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40")}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(index);
                }
              }}
              aria-label={`Selecionar variação ${index + 1}`}
            >
              <div className="relative aspect-square bg-muted">
                <img src={variation.imageUrl} alt={`Variação ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                {isWinner && <Badge className="absolute left-1 top-1 text-[10px]">Melhor score</Badge>}
              </div>
              <div className="space-y-1 p-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium">Variação {index + 1}</span>
                  <span className="text-xs font-semibold text-primary">{score || "—"}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-full text-[11px]" onClick={(event) => { event.stopPropagation(); onSelectWinner(index); }} onKeyDown={(event) => event.stopPropagation()}>
                  Marcar vencedora
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
