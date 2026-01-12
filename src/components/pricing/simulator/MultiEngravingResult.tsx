import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Clock, TrendingDown, AlertCircle, Package, Paintbrush } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomizationPricing } from '@/hooks/useCustomizationPricing';
import { formatCurrency, formatNumber } from './utils';
import type { Product, ConfiguredEngraving } from './types';

interface MultiEngravingResultProps {
  product: Product;
  engravings: ConfiguredEngraving[];
  quantity: number;
  onQuantityChange: (qty: number) => void;
}

interface EngravingCalculation {
  engraving: ConfiguredEngraving;
  unitPrice: number;
  totalPrice: number;
  setupPrice: number;
  slaDays: number | null;
  tableFound: boolean;
}

export function MultiEngravingResult({
  product,
  engravings,
  quantity,
  onQuantityChange,
}: MultiEngravingResultProps) {
  const { priceTables, calculatePrice } = useCustomizationPricing();

  // Calcular preço de cada gravação
  const engravingCalculations = useMemo((): EngravingCalculation[] => {
    return engravings.map((engraving) => {
      // Tentar encontrar tabela de preços correspondente
      const tableCode = engraving.tableCode || engraving.technique.techniqueCode;
      
      // Buscar tabela que corresponde
      const matchingTable = priceTables.find((t) => {
        const code = tableCode.toLowerCase();
        const tc = t.table_code.toLowerCase();
        const fullCode = (t.table_fullcode || '').toLowerCase();
        
        // Match por cores e área se disponível
        const colorMatch = !t.price_by_color || t.max_colors >= engraving.colors;
        const codeMatch = tc.includes(code) || code.includes(tc) || fullCode.includes(code);
        
        // Match por área se especificado
        if (engraving.sizeOption) {
          const [width, height] = engraving.sizeOption.split('x').map(Number);
          const areaMatch = t.max_area_width_cm === width && t.max_area_height_cm === height;
          return codeMatch && colorMatch && areaMatch;
        }
        
        return codeMatch && colorMatch;
      });

      if (!matchingTable) {
        // Fallback: buscar por nome da técnica
        const nameMatch = priceTables.find((t) =>
          t.customization_type_name.toLowerCase().includes(engraving.technique.techniqueName.toLowerCase()) ||
          engraving.technique.techniqueName.toLowerCase().includes(t.customization_type_name.toLowerCase())
        );

        if (nameMatch) {
          const calc = calculatePrice(nameMatch.table_code, quantity);
          if (calc) {
            let modifiedUnitPrice = calc.unitPrice;
            // Modificar por cores se aplicável
            if (engraving.colors > 1 && nameMatch.price_by_color) {
              modifiedUnitPrice *= 1 + (engraving.colors - 1) * 0.1;
            }

            return {
              engraving,
              unitPrice: modifiedUnitPrice,
              totalPrice: modifiedUnitPrice * quantity,
              setupPrice: calc.setupPrice,
              slaDays: calc.slaDays,
              tableFound: true,
            };
          }
        }

        return {
          engraving,
          unitPrice: 0,
          totalPrice: 0,
          setupPrice: 0,
          slaDays: null,
          tableFound: false,
        };
      }

      const calc = calculatePrice(matchingTable.table_code, quantity);
      if (!calc) {
        return {
          engraving,
          unitPrice: 0,
          totalPrice: 0,
          setupPrice: 0,
          slaDays: null,
          tableFound: false,
        };
      }

      let modifiedUnitPrice = calc.unitPrice;
      // Modificar por cores se aplicável
      if (engraving.colors > 1 && matchingTable.price_by_color) {
        modifiedUnitPrice *= 1 + (engraving.colors - 1) * 0.1;
      }

      return {
        engraving,
        unitPrice: modifiedUnitPrice,
        totalPrice: modifiedUnitPrice * quantity,
        setupPrice: calc.setupPrice,
        slaDays: calc.slaDays,
        tableFound: true,
      };
    });
  }, [engravings, priceTables, calculatePrice, quantity]);

  // Totais
  const productTotal = product.price * quantity;
  const customizationTotal = engravingCalculations.reduce(
    (sum, calc) => sum + calc.totalPrice + calc.setupPrice,
    0
  );
  const grandTotal = productTotal + customizationTotal;
  const unitTotal = grandTotal / quantity;

  // Prazo máximo
  const maxSlaDays = Math.max(
    ...engravingCalculations.map((c) => c.slaDays || 0).filter(Boolean),
    0
  );

  // Verificar se há tabelas não encontradas
  const hasUnfoundTables = engravingCalculations.some((c) => !c.tableFound);

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

      {/* Warning if tables not found */}
      {hasUnfoundTables && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-5 h-5 mb-2" />
          <p className="font-medium">Algumas tabelas de preço não foram encontradas</p>
          <p className="text-sm mt-1">
            Verifique se as técnicas selecionadas estão cadastradas nas tabelas de customização.
          </p>
        </div>
      )}

      {/* Result */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Resumo do Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Produto */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Package className="w-4 h-4 text-muted-foreground" />
              Produto
            </div>
            <div className="flex justify-between text-sm pl-6">
              <span className="text-muted-foreground">
                {formatNumber(quantity)} × {formatCurrency(product.price)}
              </span>
              <span>{formatCurrency(productTotal)}</span>
            </div>
          </div>

          {/* Gravações */}
          {engravings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Paintbrush className="w-4 h-4 text-muted-foreground" />
                Personalizações ({engravings.length})
              </div>
              
              {engravingCalculations.map((calc, idx) => (
                <div key={calc.engraving.id} className="pl-6 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {idx + 1}. {calc.engraving.technique.techniqueName}
                      {calc.engraving.colors > 0 && ` (${calc.engraving.colors}c)`}
                    </span>
                    <span className={cn(!calc.tableFound && "text-amber-600")}>
                      {calc.tableFound ? formatCurrency(calc.totalPrice) : 'N/D'}
                    </span>
                  </div>
                  {calc.tableFound && calc.unitPrice > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(quantity)} × {formatCurrency(calc.unitPrice)}
                      {calc.setupPrice > 0 && ` + Setup ${formatCurrency(calc.setupPrice)}`}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Subtotal personalização */}
              <div className="flex justify-between text-sm pt-2 pl-6 border-t border-dashed">
                <span className="text-muted-foreground">Subtotal gravações</span>
                <span>{formatCurrency(customizationTotal)}</span>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="pt-2 border-t flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(grandTotal)}</span>
          </div>

          <div className="text-sm text-center text-muted-foreground">
            = {formatCurrency(unitTotal)} por unidade
          </div>

          {/* Prazo */}
          {maxSlaDays > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
              <Clock className="w-4 h-4" />
              <span>Prazo estimado: {maxSlaDays} dias úteis</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
