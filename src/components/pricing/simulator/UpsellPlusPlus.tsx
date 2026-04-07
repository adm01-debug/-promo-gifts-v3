/**
 * UpsellPlusPlus — Componente de sugestões inteligentes de upsell/cross-sell
 * Exibido no simulador de preços quando showUpsellSuggestions está ativado.
 * Sugere upgrades de técnica, produtos complementares e quantidades otimizadas.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Sparkles,
  PackagePlus,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductTechnique, ConfiguredEngraving } from "./types";

// ============================================
// TIPOS
// ============================================

export interface UpsellSuggestion {
  id: string;
  type: "technique_upgrade" | "add_position" | "quantity_tier" | "complementary";
  title: string;
  description: string;
  impact: string; // ex: "Reduz custo unitário em 12%"
  priority: "high" | "medium" | "low";
}

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
}

// ============================================
// LÓGICA DE SUGESTÕES
// ============================================

const QUANTITY_TIERS = [50, 100, 250, 500, 1000, 2500];

function generateSuggestions(
  currentEngravings: ConfiguredEngraving[],
  availableTechniques: ProductTechnique[],
  quantity: number,
  categoryName?: string | null
): UpsellSuggestion[] {
  const suggestions: UpsellSuggestion[] = [];

  // 1. Sugestão de posição adicional
  const usedLocations = new Set(
    currentEngravings.map((e) => e.technique.locationCode)
  );
  const unusedLocations = availableTechniques.filter(
    (t) => !usedLocations.has(t.locationCode)
  );

  if (unusedLocations.length > 0 && currentEngravings.length > 0) {
    const loc = unusedLocations[0];
    suggestions.push({
      id: `add-pos-${loc.locationCode}`,
      type: "add_position",
      title: `Adicionar gravação em ${loc.locationName}`,
      description: `O ${loc.componentName} tem espaço em "${loc.locationName}" disponível para personalização.`,
      impact: "Maior visibilidade da marca",
      priority: "high",
    });
  }

  // 2. Sugestão de upgrade de técnica (ex: serigrafia → bordado)
  const TECHNIQUE_RANKING: Record<string, number> = {
    TRF: 1, // transfer
    SER: 2, // serigrafia
    SUB: 3, // sublimação
    GRA: 4, // gravação laser
    BOR: 5, // bordado
  };

  for (const eng of currentEngravings) {
    const currentRank = TECHNIQUE_RANKING[eng.technique.techniqueCode] ?? 0;
    const upgrades = availableTechniques.filter(
      (t) =>
        t.locationCode === eng.technique.locationCode &&
        (TECHNIQUE_RANKING[t.techniqueCode] ?? 0) > currentRank
    );

    if (upgrades.length > 0) {
      const best = upgrades[0];
      suggestions.push({
        id: `upgrade-${eng.id}-${best.techniqueCode}`,
        type: "technique_upgrade",
        title: `Upgrade: ${eng.technique.techniqueName} → ${best.techniqueName}`,
        description: `Técnica premium com acabamento superior na posição "${best.locationName}".`,
        impact: "Maior durabilidade e percepção de qualidade",
        priority: "medium",
      });
    }
  }

  // 3. Sugestão de faixa de quantidade
  const nextTier = QUANTITY_TIERS.find((t) => t > quantity);
  if (nextTier && quantity > 0) {
    const diff = nextTier - quantity;
    if (diff <= quantity * 0.3) {
      // Só sugere se falta 30% ou menos
      suggestions.push({
        id: `qty-tier-${nextTier}`,
        type: "quantity_tier",
        title: `Aumente para ${nextTier} unidades`,
        description: `Faltam apenas ${diff} unidades para a próxima faixa de preço com desconto progressivo.`,
        impact: `Potencial redução no custo unitário`,
        priority: diff <= quantity * 0.15 ? "high" : "medium",
      });
    }
  }

  // 4. Sugestão de produto complementar baseado na categoria
  const COMPLEMENTARY: Record<string, string[]> = {
    Canetas: ["Cadernos", "Blocos de notas", "Estojos"],
    Mochilas: ["Squeezes", "Cadernos", "Necessaires"],
    Squeezes: ["Toalhas", "Mochilas", "Bonés"],
    Camisetas: ["Bonés", "Ecobags", "Squeeze"],
    Cadernos: ["Canetas", "Marcadores", "Pastas"],
    Bonés: ["Camisetas", "Mochilas", "Sacolas"],
  };

  if (categoryName) {
    const complements = COMPLEMENTARY[categoryName];
    if (complements?.length) {
      suggestions.push({
        id: `complementary-${categoryName}`,
        type: "complementary",
        title: `Combine com ${complements[0]}`,
        description: `Clientes que compram ${categoryName} frequentemente levam ${complements.slice(0, 2).join(" e ")}.`,
        impact: "Aumento do ticket médio",
        priority: "low",
      });
    }
  }

  return suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

// ============================================
// COMPONENTE
// ============================================

const ICON_MAP = {
  technique_upgrade: ArrowUpRight,
  add_position: PackagePlus,
  quantity_tier: TrendingUp,
  complementary: Zap,
};

const PRIORITY_STYLES = {
  high: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  medium: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  low: "border-l-muted bg-muted/30",
};

export function UpsellPlusPlus({
  product,
  currentEngravings,
  availableTechniques,
  quantity,
  className,
  onSuggestionClick,
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
          <Sparkles className="h-4 w-4 text-amber-500" />
          Sugestões inteligentes
          <Badge variant="secondary" className="text-xs">
            {suggestions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.slice(0, 3).map((s) => {
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

// Re-export for testing
export { generateSuggestions };
export default UpsellPlusPlus;
