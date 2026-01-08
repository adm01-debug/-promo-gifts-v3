import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calculator, 
  TrendingDown, 
  Clock, 
  Palette,
  Ruler,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Package
} from 'lucide-react';
import { 
  useCustomizationPricing, 
  PriceCalculation,
  PriceTier 
} from '@/hooks/useCustomizationPricing';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface QuantityPriceCalculatorProps {
  productBasePrice?: number;
  productName?: string;
  onSelectTechnique?: (techniqueCode: string, calculation: PriceCalculation) => void;
  className?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

// Componente de faixa de preço individual
function PriceTierBadge({ tier, isActive }: { tier: PriceTier; isActive: boolean }) {
  return (
    <div 
      className={cn(
        "flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted/50 text-muted-foreground"
      )}
    >
      <span className="font-medium">
        {formatNumber(tier.minQuantity)}
        {tier.maxQuantity ? ` - ${formatNumber(tier.maxQuantity)}` : '+'}
      </span>
      <span className="font-bold">{formatCurrency(tier.unitPrice)}</span>
    </div>
  );
}

// Componente de card de técnica
function TechniqueCard({
  calculation,
  tiers,
  isSelected,
  onSelect,
  productBasePrice,
  quantity,
}: {
  calculation: PriceCalculation;
  tiers: PriceTier[];
  isSelected: boolean;
  onSelect: () => void;
  productBasePrice: number;
  quantity: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const productTotal = productBasePrice * quantity;
  const grandTotalWithProduct = productTotal + calculation.grandTotal;
  const unitTotalWithProduct = grandTotalWithProduct / quantity;

  return (
    <Card 
      className={cn(
        "transition-all cursor-pointer hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {calculation.technique}
              {isSelected && (
                <Badge variant="default" className="ml-2">
                  <Check className="w-3 h-3 mr-1" />
                  Selecionado
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Código: {calculation.techniqueCode}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(calculation.unitPrice)}
            </p>
            <p className="text-xs text-muted-foreground">por unidade</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações principais */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Palette className="w-4 h-4" />
            <span>{calculation.maxColors} cor{calculation.maxColors > 1 ? 'es' : ''}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Ruler className="w-4 h-4" />
            <span>{calculation.maxArea.width}x{calculation.maxArea.height}cm</span>
          </div>
          {calculation.slaDays && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{calculation.slaDays} dias</span>
            </div>
          )}
        </div>

        {/* Economia */}
        {calculation.savings && calculation.savings.percentageOff > 0 && (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Economia de {calculation.savings.percentageOff}% 
              ({formatCurrency(calculation.savings.comparedToMin)} no total)
            </span>
          </div>
        )}

        {/* Resumo de preços */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gravação ({formatNumber(quantity)} un)</span>
            <span>{formatCurrency(calculation.totalPrice)}</span>
          </div>
          {calculation.setupPrice > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Setup</span>
              <span>{formatCurrency(calculation.setupPrice)}</span>
            </div>
          )}
          {productBasePrice > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                <Package className="w-3 h-3 inline mr-1" />
                Produtos ({formatNumber(quantity)} un)
              </span>
              <span>{formatCurrency(productTotal)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span className="text-primary">
              {formatCurrency(productBasePrice > 0 ? grandTotalWithProduct : calculation.grandTotal)}
            </span>
          </div>
          {productBasePrice > 0 && (
            <div className="text-xs text-center text-muted-foreground">
              = {formatCurrency(unitTotalWithProduct)} por unidade (produto + gravação)
            </div>
          )}
        </div>

        {/* Faixas de preço expansíveis */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Ocultar faixas de preço
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Ver todas as faixas de preço
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="grid gap-1.5">
              {tiers.map((tier) => (
                <PriceTierBadge
                  key={tier.tierIndex}
                  tier={tier}
                  isActive={quantity >= tier.minQuantity && (!tier.maxQuantity || quantity <= tier.maxQuantity)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function QuantityPriceCalculator({
  productBasePrice = 0,
  productName,
  onSelectTechnique,
  className,
}: QuantityPriceCalculatorProps) {
  const { priceTables, isLoading, error, calculateAllPrices, getTiers } = useCustomizationPricing();
  const [quantity, setQuantity] = useState(100);
  const [selectedTechniqueCode, setSelectedTechniqueCode] = useState<string | null>(null);

  // Quantidades predefinidas para seleção rápida
  const quickQuantities = [50, 100, 250, 500, 1000, 2500, 5000];

  // Calcular preços para todas as técnicas
  const calculations = useMemo(() => {
    return calculateAllPrices(quantity);
  }, [calculateAllPrices, quantity]);

  // Selecionar técnica
  const handleSelectTechnique = (techniqueCode: string) => {
    setSelectedTechniqueCode(techniqueCode);
    const calc = calculations.find(c => c.techniqueCode === techniqueCode);
    if (calc && onSelectTechnique) {
      onSelectTechnique(techniqueCode, calc);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardHeader>
          <CardTitle className="text-destructive">Erro ao carregar preços</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Empty state
  if (priceTables.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Calculadora de Preços</CardTitle>
          <CardDescription>Nenhuma tabela de preços disponível</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle>Calculadora de Preços por Tiragem</CardTitle>
        </div>
        <CardDescription>
          {productName 
            ? `Simule preços de gravação para: ${productName}`
            : 'Selecione a quantidade e veja os preços por técnica de gravação'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Seletor de quantidade */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Quantidade</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={50000}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-28 text-right"
              />
              <span className="text-sm text-muted-foreground">unidades</span>
            </div>
          </div>

          {/* Slider */}
          <Slider
            value={[quantity]}
            onValueChange={([val]) => setQuantity(val)}
            min={1}
            max={10000}
            step={1}
            className="w-full"
          />

          {/* Botões de quantidade rápida */}
          <div className="flex flex-wrap gap-2">
            {quickQuantities.map((qty) => (
              <Button
                key={qty}
                variant={quantity === qty ? "default" : "outline"}
                size="sm"
                onClick={() => setQuantity(qty)}
              >
                {formatNumber(qty)}
              </Button>
            ))}
          </div>
        </div>

        {/* Header com info do produto */}
        {productBasePrice > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm">
              Preço do produto: <strong>{formatCurrency(productBasePrice)}</strong> por unidade
            </span>
          </div>
        )}

        {/* Lista de técnicas */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {calculations.length} técnica{calculations.length !== 1 ? 's' : ''} disponíve{calculations.length !== 1 ? 'is' : 'l'}
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {calculations.map((calc) => (
              <TechniqueCard
                key={calc.techniqueCode}
                calculation={calc}
                tiers={getTiers(calc.techniqueCode)}
                isSelected={selectedTechniqueCode === calc.techniqueCode}
                onSelect={() => handleSelectTechnique(calc.techniqueCode)}
                productBasePrice={productBasePrice}
                quantity={quantity}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuantityPriceCalculator;
