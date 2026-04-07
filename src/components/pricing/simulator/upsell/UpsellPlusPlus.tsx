/**
 * UpsellPlusPlus — Componente visual de sugestões inteligentes de upsell/cross-sell.
 * Exibido no simulador de preços quando há oportunidades de upgrade.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Sparkles,
  PackagePlus,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductTechnique, ConfiguredEngraving } from "../types";
import {
  generateSuggestions,
  type UpsellSuggestion,
  type UpsellType,
  type UpsellPriority,
} from "./upsell-engine";

// ============================================
// PROPS
// ============================================

interface UpsellPlusPlusProps {
  product: {
    id: string;
    name: string;
    price: number;
    category_name?: string | null;
  };
  currentEngravings: ConfiguredEngraving[];
  availableTechniques: ProductTechnique[];
  quantity: number;
  className?: string;
  onSuggestionClick?: (suggestion: UpsellSuggestion) => void;
  /** Máximo de sugestões exibidas (padrão: 3) */
  maxVisible?: number;
}

// ============================================
// VISUAIS
// ============================================

const ICON_MAP: Record<UpsellType, typeof Sparkles> = {
  technique_upgrade: ArrowUpRight,
  add_position: PackagePlus,
  quantity_tier: TrendingUp,
  complementary: Zap,
};

const PRIORITY_STYLES: Record<UpsellPriority, string> = {
  high: "border-l-accent bg-accent/10",
  medium: "border-l-primary bg-primary/5",
  low: "border-l-muted bg-muted/30",
};

// ============================================
// COMPONENTE
// ============================================

export function UpsellPlusPlus({
  product,
  currentEngravings,
  availableTechniques,
  quantity,
  className,
  onSuggestionClick,
  maxVisible = 3,
}: UpsellPlusPlusProps) {
  const suggestions = useMemo(
    () =>
      generateSuggestions(
        currentEngravings,
        availableTechniques,
        quantity,
        product.category_name
      ),
    [currentEngravings, availableTechniques, quantity, product.category_name]
  );

  if (suggestions.length === 0) return null;

  return (
    <Card className={cn("border-dashed", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-accent" />
          Sugestões inteligentes
          <Badge variant="secondary" className="text-xs">
            {suggestions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.slice(0, maxVisible).map((s) => {
          const Icon = ICON_MAP[s.type];
          return (
            <button
              key={s.id}
              onClick={() => onSuggestionClick?.(s)}
              className={cn(
                "w-full text-left rounded-md border-l-4 p-3 transition-colors hover:opacity-90",
                PRIORITY_STYLES[s.priority]
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{s.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.description}
                  </p>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {s.impact}
                  </Badge>
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default UpsellPlusPlus;
