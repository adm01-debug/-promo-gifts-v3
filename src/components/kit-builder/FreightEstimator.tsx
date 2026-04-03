/**
 * Freight Estimator
 * Estimates shipping cost based on total weight
 * Padronizado com layout compacto de sidebar do Design System
 */

import { useState } from 'react';
import { Truck, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/kit-builder';

interface FreightEstimatorProps {
  totalWeightGrams: number;
  kitQuantity: number;
}

// Tabela interna estimada por faixa de peso (SP Capital como referência)
const FREIGHT_TABLE = {
  sedex: [
    { maxKg: 1, price: 22.50 },
    { maxKg: 5, price: 35.00 },
    { maxKg: 10, price: 55.00 },
    { maxKg: 30, price: 95.00 },
    { maxKg: Infinity, price: 150.00 },
  ],
  pac: [
    { maxKg: 1, price: 15.00 },
    { maxKg: 5, price: 22.00 },
    { maxKg: 10, price: 35.00 },
    { maxKg: 30, price: 60.00 },
    { maxKg: Infinity, price: 95.00 },
  ],
  transportadora: [
    { maxKg: 5, price: 18.00 },
    { maxKg: 10, price: 28.00 },
    { maxKg: 30, price: 45.00 },
    { maxKg: 100, price: 80.00 },
    { maxKg: Infinity, price: 120.00 },
  ],
};

const METHOD_LABELS: Record<string, string> = {
  sedex: 'SEDEX',
  pac: 'PAC',
  transportadora: 'Transportadora',
};

export function FreightEstimator({ totalWeightGrams, kitQuantity }: FreightEstimatorProps) {
  const [method, setMethod] = useState<string>('transportadora');

  const totalWeightKg = (totalWeightGrams * kitQuantity) / 1000;
  const table = FREIGHT_TABLE[method as keyof typeof FREIGHT_TABLE] || FREIGHT_TABLE.transportadora;
  const perShipmentCost = table.find(r => totalWeightKg <= r.maxKg)?.price || table[table.length - 1].price;

  const noWeight = totalWeightGrams === 0;

  return (
    <Card>
      <CardContent className="p-3 space-y-2.5">
        <h3 className="font-semibold text-xs flex items-center gap-1.5">
          <Truck className="h-4 w-4 text-primary" />
          <span>Frete Estimado</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px]">
                <p className="text-xs">Valores estimados (ref: SP Capital). Consulte transportadora para cotação exata.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h3>

        {noWeight && (
          <div className="flex items-center gap-1.5 text-[10px] text-warning bg-warning/10 border border-warning/20 rounded-md p-2">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>Peso não informado. Estimativa imprecisa.</span>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Modalidade</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedex">SEDEX</SelectItem>
              <SelectItem value="pac">PAC</SelectItem>
              <SelectItem value="transportadora">Transportadora</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-md bg-secondary/50 p-1.5">
            <p className="text-[9px] text-muted-foreground">Peso</p>
            <p className="font-bold text-xs tabular-nums">{totalWeightKg.toFixed(1)}kg</p>
          </div>
          <div className="rounded-md bg-secondary/50 p-1.5">
            <p className="text-[9px] text-muted-foreground">{METHOD_LABELS[method]}</p>
            <p className="font-bold text-xs text-primary tabular-nums">{formatCurrency(perShipmentCost)}</p>
          </div>
          <div className="rounded-md bg-primary/10 p-1.5">
            <p className="text-[9px] text-muted-foreground">Por Kit</p>
            <p className="font-bold text-xs text-primary tabular-nums">{formatCurrency(perShipmentCost / kitQuantity)}</p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Badge variant="outline" className="text-[9px] gap-1 text-muted-foreground font-normal">
            <AlertCircle className="h-2.5 w-2.5" />
            Estimativa — consulte transportadora
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
