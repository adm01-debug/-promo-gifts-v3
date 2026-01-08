import { useState, useMemo } from "react";
import { Calculator, TrendingDown, Package, Percent, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PriceTier {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  discount: number;
}

interface VolumePriceCalculatorProps {
  basePrice: number;
  productName?: string;
  priceTiers?: PriceTier[];
  minQuantity?: number;
  className?: string;
  compact?: boolean;
}

// Default price tiers if none provided
const DEFAULT_TIERS: PriceTier[] = [
  { minQty: 1, maxQty: 49, unitPrice: 0, discount: 0 },
  { minQty: 50, maxQty: 99, unitPrice: 0, discount: 5 },
  { minQty: 100, maxQty: 249, unitPrice: 0, discount: 10 },
  { minQty: 250, maxQty: 499, unitPrice: 0, discount: 15 },
  { minQty: 500, maxQty: 999, unitPrice: 0, discount: 20 },
  { minQty: 1000, maxQty: null, unitPrice: 0, discount: 25 },
];

export function VolumePriceCalculator({
  basePrice,
  productName,
  priceTiers,
  minQuantity = 1,
  className,
  compact = false,
}: VolumePriceCalculatorProps) {
  const [quantity, setQuantity] = useState(minQuantity);

  // Calculate tiers with actual prices
  const tiers = useMemo(() => {
    const baseTiers = priceTiers || DEFAULT_TIERS;
    return baseTiers.map(tier => ({
      ...tier,
      unitPrice: tier.unitPrice || basePrice * (1 - tier.discount / 100),
    }));
  }, [basePrice, priceTiers]);

  // Find current tier based on quantity
  const currentTier = useMemo(() => {
    return tiers.find(
      tier =>
        quantity >= tier.minQty &&
        (tier.maxQty === null || quantity <= tier.maxQty)
    ) || tiers[0];
  }, [quantity, tiers]);

  // Calculate prices
  const unitPrice = currentTier.unitPrice;
  const totalPrice = unitPrice * quantity;
  const savings = (basePrice - unitPrice) * quantity;
  const savingsPercent = currentTier.discount;

  // Find next tier for upsell
  const nextTier = useMemo(() => {
    const currentIndex = tiers.findIndex(t => t === currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }, [tiers, currentTier]);

  const unitsToNextTier = nextTier ? nextTier.minQty - quantity : 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2 cursor-help", className)}>
              <Calculator className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {formatCurrency(unitPrice)}
                  <span className="text-muted-foreground">/un</span>
                </span>
                {savingsPercent > 0 && (
                  <Badge variant="secondary" className="text-xs w-fit">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {savingsPercent}% off
                  </Badge>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-64 p-3">
            <div className="space-y-2">
              <p className="font-medium text-sm">Tabela de Preços por Volume</p>
              <div className="space-y-1">
                {tiers.slice(0, 4).map((tier, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex justify-between text-xs",
                      tier === currentTier && "font-bold text-primary"
                    )}
                  >
                    <span>
                      {tier.minQty}
                      {tier.maxQty ? `-${tier.maxQty}` : "+"} un
                    </span>
                    <span>{formatCurrency(tier.unitPrice)}</span>
                    {tier.discount > 0 && (
                      <span className="text-green-600">-{tier.discount}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-5 w-5 text-primary" />
          Calculadora de Preços
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quantity Input */}
        <div className="space-y-2">
          <Label htmlFor="quantity" className="text-sm">
            Quantidade
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="quantity"
              type="number"
              min={minQuantity}
              value={quantity}
              onChange={e => setQuantity(Math.max(minQuantity, parseInt(e.target.value) || minQuantity))}
              className="w-24"
            />
            <Slider
              value={[quantity]}
              onValueChange={([val]) => setQuantity(val)}
              min={minQuantity}
              max={1500}
              step={10}
              className="flex-1"
            />
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-3 p-3 rounded-lg bg-muted/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Preço unitário</span>
            <div className="flex items-center gap-2">
              {savingsPercent > 0 && (
                <span className="text-sm line-through text-muted-foreground">
                  {formatCurrency(basePrice)}
                </span>
              )}
              <span className="font-semibold text-lg">{formatCurrency(unitPrice)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Package className="h-4 w-4" />
              {quantity} unidades
            </span>
            <span className="font-bold text-xl text-primary">
              {formatCurrency(totalPrice)}
            </span>
          </div>

          {savings > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm text-green-600 flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                Economia total
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {formatCurrency(savings)} ({savingsPercent}%)
              </Badge>
            </div>
          )}
        </div>

        {/* Upsell to next tier */}
        {nextTier && unitsToNextTier <= 50 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700">
            <div className="flex items-start gap-2">
              <Percent className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Adicione mais {unitsToNextTier} unidades
                </p>
                <p className="text-amber-700 dark:text-amber-400">
                  e ganhe {nextTier.discount}% de desconto!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Price tiers table */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Faixas de preço</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-xs">
            {tiers.map((tier, i) => (
              <div
                key={i}
                className={cn(
                  "p-2 rounded text-center transition-colors",
                  tier === currentTier
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="font-medium">
                  {tier.minQty}
                  {tier.maxQty ? `-${tier.maxQty}` : "+"}
                </div>
                <div className="text-[10px] opacity-80">
                  {tier.discount > 0 ? `-${tier.discount}%` : "Base"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini version for product cards
export function MiniVolumeIndicator({
  basePrice,
  maxDiscount = 25,
}: {
  basePrice: number;
  maxDiscount?: number;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="cursor-help gap-1">
            <TrendingDown className="h-3 w-3" />
            Até {maxDiscount}% off
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Descontos progressivos por volume</p>
          <p className="text-xs text-muted-foreground">
            A partir de 50 unidades
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
