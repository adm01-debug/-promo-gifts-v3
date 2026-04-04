// src/components/simulator/MarginCalculatorCard.tsx
// Calculadora de Margem integrada nos resultados

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Percent, 
  DollarSign,
  Target,
  Calculator,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import type { SimulationOption } from "@/types/simulation";

interface MarginCalculatorCardProps {
  bestOption: SimulationOption | null;
  quantity: number;
}

export function MarginCalculatorCard({ bestOption, quantity }: MarginCalculatorCardProps) {
  const [sellingPrice, setSellingPrice] = useState<string>("");
  const [targetMargin, setTargetMargin] = useState<number>(30);

  const calculations = useMemo(() => {
    if (!bestOption) return null;

    const costPerUnit = bestOption.grandTotalPerUnit;
    const sellPrice = parseFloat(sellingPrice) || 0;

    // Calculate margin from selling price
    const profitPerUnit = sellPrice - costPerUnit;
    const marginPercent = sellPrice > 0 ? (profitPerUnit / sellPrice) * 100 : 0;
    const markupPercent = costPerUnit > 0 ? (profitPerUnit / costPerUnit) * 100 : 0;
    const totalProfit = profitPerUnit * quantity;

    // Calculate suggested price from target margin
    const suggestedPrice = costPerUnit / (1 - targetMargin / 100);
    const suggestedProfit = (suggestedPrice - costPerUnit) * quantity;

    return {
      costPerUnit,
      sellPrice,
      profitPerUnit,
      marginPercent,
      markupPercent,
      totalProfit,
      suggestedPrice,
      suggestedProfit,
    };
  }, [bestOption, sellingPrice, targetMargin, quantity]);

  if (!bestOption || !calculations) return null;

  const isHealthyMargin = calculations.marginPercent >= 20;
  const isGoodMargin = calculations.marginPercent >= 30;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Calculadora de Margem
                <Badge variant="outline" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  Pro
                </Badge>
              </CardTitle>
              <CardDescription>
                Calcule sua margem baseada no custo de {formatCurrency(calculations.costPerUnit)}/un
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Column 1: Price Input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Preço de Venda/Un
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0,00"
                    className="pl-10 text-lg font-semibold h-12"
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {parseFloat(sellingPrice) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {/* Margin Result */}
                    <div className={cn(
                      "p-4 rounded-xl border-2 transition-colors",
                      isGoodMargin && "bg-success/10 border-success/30",
                      isHealthyMargin && !isGoodMargin && "bg-amber-500/10 border-amber-500/30",
                      !isHealthyMargin && "bg-destructive/10 border-destructive/30"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Margem</span>
                        <Badge className={cn(
                          "text-sm",
                          isGoodMargin && "bg-success text-success-foreground",
                          isHealthyMargin && !isGoodMargin && "bg-amber-500 text-primary-foreground",
                          !isHealthyMargin && "bg-destructive text-destructive-foreground"
                        )}>
                          {calculations.marginPercent.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Lucro/Un:</span>
                          <p className={cn(
                            "font-bold text-lg",
                            calculations.profitPerUnit >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {formatCurrency(calculations.profitPerUnit)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lucro Total:</span>
                          <p className={cn(
                            "font-bold text-lg",
                            calculations.totalProfit >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {formatCurrency(calculations.totalProfit)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                        Markup: {calculations.markupPercent.toFixed(1)}%
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Column 2: Target Margin */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Margem Desejada
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[targetMargin]}
                    onValueChange={([val]) => setTargetMargin(val)}
                    min={5}
                    max={70}
                    step={1}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 bg-muted px-3 py-2 rounded-lg min-w-[80px] justify-center">
                    <span className="font-bold text-lg">{targetMargin}</span>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Suggested Price */}
              <motion.div 
                className="p-4 rounded-xl bg-primary/5 border border-primary/20"
                animate={{ scale: [1, 1.01, 1] }}
                transition={{ duration: 0.3 }}
                key={targetMargin}
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Preço Sugerido</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-primary">
                      {formatCurrency(calculations.suggestedPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      por unidade
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="text-right">
                    <p className="text-lg font-semibold text-success">
                      {formatCurrency(calculations.suggestedProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      lucro total
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Quick Margin Buttons */}
              <div className="flex gap-2">
                {[15, 25, 30, 40, 50].map((margin) => (
                  <button
                    key={margin}
                    onClick={() => setTargetMargin(margin)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                      targetMargin === margin
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {margin}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Bar */}
          <div className="p-4 rounded-xl bg-muted/30 border flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Custo/Un:</span>
                <span className="font-semibold ml-1">{formatCurrency(calculations.costPerUnit)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Quantidade:</span>
                <span className="font-semibold ml-1">{quantity} un</span>
              </div>
              <div>
                <span className="text-muted-foreground">Custo Total:</span>
                <span className="font-semibold ml-1">{formatCurrency(calculations.costPerUnit * quantity)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Faturamento com margem de {targetMargin}%</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(calculations.suggestedPrice * quantity)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
