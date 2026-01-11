// src/components/simulator/UpsellSuggestion.tsx
// Sugestões de upsell para otimização de quantidade

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  TrendingDown, 
  Package, 
  ArrowRight,
  Sparkles,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import type { SimulationOption, Technique } from "@/types/simulation";

interface UpsellSuggestionProps {
  currentQuantity: number;
  productPrice: number;
  bestOption: SimulationOption | null;
  techniques: Technique[] | undefined;
  selectedTechniques: string[];
  onQuantityChange: (qty: number) => void;
}

// Pontos de quebra de preço típicos
const QUANTITY_BREAKPOINTS = [50, 100, 150, 200, 250, 300, 500, 750, 1000];

export function UpsellSuggestion({
  currentQuantity,
  productPrice,
  bestOption,
  techniques,
  selectedTechniques,
  onQuantityChange,
}: UpsellSuggestionProps) {
  const suggestions = useMemo(() => {
    if (!bestOption || selectedTechniques.length === 0 || !techniques) {
      return [];
    }

    const results: Array<{
      quantity: number;
      additionalUnits: number;
      newCostPerUnit: number;
      currentCostPerUnit: number;
      savingsPercent: number;
      savingsPerUnit: number;
      totalSavings: number;
      reason: string;
    }> = [];

    // Find the next breakpoints above current quantity
    const relevantBreakpoints = QUANTITY_BREAKPOINTS.filter(
      bp => bp > currentQuantity && bp <= currentQuantity * 2
    );

    // Adicionar sugestão baseada em mínimo da técnica
    const selectedTechData = techniques.filter(t => selectedTechniques.includes(t.id));
    const maxMinQty = Math.max(...selectedTechData.map(t => t.min_quantity), 0);

    if (maxMinQty > currentQuantity) {
      relevantBreakpoints.unshift(maxMinQty);
    }

    // Calcular para cada breakpoint
    relevantBreakpoints.slice(0, 3).forEach(targetQty => {
      // Recalcular custo para nova quantidade
      const selectedTechnique = techniques.find(t => t.id === bestOption.techniqueId);
      if (!selectedTechnique) return;

      const setupCost = bestOption.setupCost;
      const unitPersonalizationCost = bestOption.unitCost;
      
      // Novo custo total
      const newTotalProductCost = productPrice * targetQty;
      const newTotalPersonalizationCost = (unitPersonalizationCost * targetQty) + setupCost;
      const newGrandTotal = newTotalProductCost + newTotalPersonalizationCost;
      const newCostPerUnit = newGrandTotal / targetQty;

      const currentCostPerUnit = bestOption.grandTotalPerUnit;
      const savingsPerUnit = currentCostPerUnit - newCostPerUnit;
      const savingsPercent = (savingsPerUnit / currentCostPerUnit) * 100;

      // Só sugerir se a economia for significativa (>2%)
      if (savingsPercent >= 2) {
        let reason = "";
        if (targetQty === maxMinQty) {
          reason = "Quantidade mínima da técnica";
        } else if (savingsPercent >= 10) {
          reason = "Economia significativa";
        } else if (savingsPercent >= 5) {
          reason = "Diluição do setup";
        } else {
          reason = "Melhor custo-benefício";
        }

        results.push({
          quantity: targetQty,
          additionalUnits: targetQty - currentQuantity,
          newCostPerUnit,
          currentCostPerUnit,
          savingsPercent,
          savingsPerUnit,
          totalSavings: savingsPerUnit * targetQty,
          reason,
        });
      }
    });

    return results.sort((a, b) => b.savingsPercent - a.savingsPercent);
  }, [currentQuantity, productPrice, bestOption, techniques, selectedTechniques]);

  if (suggestions.length === 0) return null;

  const topSuggestion = suggestions[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        className="overflow-hidden"
      >
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Lightbulb className="h-5 w-5 text-amber-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-sm">Sugestão de Otimização</h4>
                <Badge className="bg-amber-500/20 text-amber-600 text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  Economia de {topSuggestion.savingsPercent.toFixed(0)}%
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mt-1">
                Adicione <span className="font-semibold text-foreground">+{topSuggestion.additionalUnits} unidades</span> para 
                reduzir o custo unitário de {formatCurrency(topSuggestion.currentCostPerUnit)} para{" "}
                <span className="font-semibold text-success">{formatCurrency(topSuggestion.newCostPerUnit)}</span>
              </p>

              {/* Comparison */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-card/50">
                  <p className="text-xs text-muted-foreground">Atual</p>
                  <p className="font-mono text-sm">{currentQuantity} un</p>
                  <p className="text-xs font-medium">{formatCurrency(topSuggestion.currentCostPerUnit)}/un</p>
                </div>
                
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-amber-500" />
                </div>

                <div className="p-2 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-xs text-muted-foreground">Sugerido</p>
                  <p className="font-mono text-sm font-semibold">{topSuggestion.quantity} un</p>
                  <p className="text-xs font-medium text-success">{formatCurrency(topSuggestion.newCostPerUnit)}/un</p>
                </div>
              </div>

              {/* Savings highlight */}
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-success/10">
                <TrendingDown className="h-4 w-4 text-success" />
                <span className="text-sm">
                  Economia de <span className="font-bold text-success">{formatCurrency(topSuggestion.savingsPerUnit)}/un</span>
                  {" "}= <span className="font-bold text-success">{formatCurrency(topSuggestion.totalSavings)}</span> no total
                </span>
              </div>

              {/* Action */}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => onQuantityChange(topSuggestion.quantity)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Aplicar {topSuggestion.quantity} un
                </Button>

                {suggestions.length > 1 && (
                  <div className="flex gap-1">
                    {suggestions.slice(1, 3).map((suggestion) => (
                      <Button
                        key={suggestion.quantity}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => onQuantityChange(suggestion.quantity)}
                      >
                        {suggestion.quantity} un
                        <span className="ml-1 text-success">-{suggestion.savingsPercent.toFixed(0)}%</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reason badge */}
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3" />
                {topSuggestion.reason}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
