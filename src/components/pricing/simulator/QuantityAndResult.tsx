import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Clock, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomizationPricing } from '@/hooks/useCustomizationPricing';
import { formatCurrency, formatNumber } from './utils';
import type { Product, ProductTechnique } from './types';

interface QuantityAndResultProps {
  product: Product;
  technique: ProductTechnique;
  colors: number;
  sizeModifier: number;
  quantity: number;
  onQuantityChange: (qty: number) => void;
}

export function QuantityAndResult({
  product,
  technique,
  colors,
  sizeModifier,
  quantity,
  onQuantityChange,
}: QuantityAndResultProps) {
  const { priceTables, calculatePrice, getTiers } = useCustomizationPricing();

  const matchingTable = useMemo(() => {
    const codeMatch = priceTables.find(
      (t) =>
        t.table_code.toLowerCase().includes(technique.techniqueCode.toLowerCase()) ||
        technique.techniqueCode.toLowerCase().includes(t.table_code.toLowerCase())
    );
    if (codeMatch) return codeMatch;

    return priceTables.find(
      (t) =>
        t.customization_type_name.toLowerCase().includes(technique.techniqueName.toLowerCase()) ||
        technique.techniqueName.toLowerCase().includes(t.customization_type_name.toLowerCase())
    );
  }, [priceTables, technique]);

  const priceCalc = useMemo(() => {
    if (!matchingTable) return null;
    const calc = calculatePrice(matchingTable.table_code, quantity);
    if (!calc) return null;

    let modifiedUnitPrice = calc.unitPrice;
    if (colors > 1 && matchingTable.price_by_color) {
      modifiedUnitPrice *= 1 + (colors - 1) * 0.1;
    }
    modifiedUnitPrice *= sizeModifier;

    return {
      ...calc,
      unitPrice: modifiedUnitPrice,
      totalPrice: modifiedUnitPrice * quantity,
      grandTotal: modifiedUnitPrice * quantity + calc.setupPrice + calc.handlingPrice,
    };
  }, [matchingTable, calculatePrice, quantity, colors, sizeModifier]);

  const tiers = matchingTable ? getTiers(matchingTable.table_code) : [];
  const productTotal = product.price * quantity;
  const customizationTotal = priceCalc?.grandTotal || 0;
  const grandTotal = productTotal + customizationTotal;
  const unitTotal = grandTotal / quantity;

  const quickQuantities = [50, 100, 250, 500, 1000, 2500, 5000];

  return (
    <div className="space-y-6">
      {/* Quantity selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Quantidade</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={50000}
              value={quantity}
              onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-28 text-right"
            />
            <span className="text-sm text-muted-foreground">unidades</span>
          </div>
        </div>

        <Slider
          value={[quantity]}
          onValueChange={([val]) => onQuantityChange(val)}
          min={1}
          max={10000}
          step={1}
        />

        <div className="flex flex-wrap gap-2">
          {quickQuantities.map((qty) => (
            <Button
              key={qty}
              variant={quantity === qty ? 'default' : 'outline'}
              size="sm"
              onClick={() => onQuantityChange(qty)}
            >
              {formatNumber(qty)}
            </Button>
          ))}
        </div>
      </div>

      {/* Result */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Resumo do Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!matchingTable ? (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-5 h-5 mb-2" />
              <p className="font-medium">Tabela de preços não encontrada</p>
              <p className="text-sm mt-1">
                Não encontramos tabela de preços para "{technique.techniqueName}". Verifique se a
                técnica está cadastrada nas tabelas de customização.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Produtos ({formatNumber(quantity)} x {formatCurrency(product.price)})
                  </span>
                  <span>{formatCurrency(productTotal)}</span>
                </div>

                {priceCalc && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Gravação ({formatNumber(quantity)} x {formatCurrency(priceCalc.unitPrice)})
                      </span>
                      <span>{formatCurrency(priceCalc.totalPrice)}</span>
                    </div>

                    {priceCalc.setupPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Setup</span>
                        <span>{formatCurrency(priceCalc.setupPrice)}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="pt-2 border-t flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(grandTotal)}</span>
                </div>

                <div className="text-sm text-center text-muted-foreground">
                  = {formatCurrency(unitTotal)} por unidade
                </div>
              </div>

              {priceCalc?.savings && priceCalc.savings.percentageOff > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Economia de {priceCalc.savings.percentageOff}% (
                    {formatCurrency(priceCalc.savings.comparedToMin)})
                  </span>
                </div>
              )}

              {priceCalc?.slaDays && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Prazo estimado: {priceCalc.slaDays} dias úteis</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Price tiers */}
      {tiers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Faixas de preço</h4>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {tiers.slice(0, 10).map((tier) => {
              const isActive =
                quantity >= tier.minQuantity &&
                (!tier.maxQuantity || quantity <= tier.maxQuantity);
              return (
                <div
                  key={tier.tierIndex}
                  className={cn(
                    'p-2 rounded-lg text-center text-xs transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <p className="font-medium">
                    {formatNumber(tier.minQuantity)}
                    {tier.maxQuantity ? ` - ${formatNumber(tier.maxQuantity)}` : '+'}
                  </p>
                  <p className="font-bold">{formatCurrency(tier.unitPrice)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
