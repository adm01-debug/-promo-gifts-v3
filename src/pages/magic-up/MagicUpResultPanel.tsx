/**
 * MagicUp Result Panel — Right side with generated image variations
 */
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdImageResult } from "@/components/magic-up/AdImageResult";
import { cn } from "@/lib/utils";
import type { useMagicUpState } from "@/hooks/useMagicUpState";

type MagicUpStateReturn = ReturnType<typeof useMagicUpState>;

interface MagicUpResultPanelProps {
  m: MagicUpStateReturn;
}

export function MagicUpResultPanel({ m }: MagicUpResultPanelProps) {
  return (
    <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
      {m.variations.length > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline" size="icon" aria-label="Voltar" className="h-8 w-8"
            disabled={m.activeVariation === 0}
            onClick={() => m.setActiveVariation(m.activeVariation - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1.5">
            {m.variations.map((_, i) => (
              <button
                key={i}
                onClick={() => m.setActiveVariation(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === m.activeVariation ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
          <Button
            variant="outline" size="icon" aria-label="Avançar" className="h-8 w-8"
            disabled={m.activeVariation === m.variations.length - 1}
            onClick={() => m.setActiveVariation(m.activeVariation + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <AdImageResult
        imageUrl={m.currentVariation?.imageUrl || null}
        isLoading={m.generating}
        productName={m.selectedProduct?.name}
        sceneName={m.selectedScene?.title}
        onDownload={m.handleDownload}
        onShare={m.handleShare}
        onRegenerate={m.handleGenerate}
        onToggleFavorite={m.currentVariation?.id ? m.handleToggleFavorite : undefined}
        isFavorite={m.currentVariation?.isFavorite}
        history={m.history}
        onSelectHistory={m.handleSelectHistory}
        onDeleteHistory={m.handleDeleteHistory}
        onToggleHistoryFavorite={m.handleToggleHistoryFavorite}
      />

      {m.variations.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {m.variations.map((v, i) => (
            <button
              key={i}
              onClick={() => m.setActiveVariation(i)}
              className={cn(
                "w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all",
                i === m.activeVariation
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              )}
            >
              <img src={v.imageUrl} alt={`Variação ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
