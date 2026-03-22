/**
 * Freight Estimator
 * Estimates shipping cost based on total weight
 */

import { useState } from 'react';
import { Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/kit-builder';

interface FreightEstimatorProps {
  totalWeightGrams: number;
  kitQuantity: number;
}

// Simple internal freight table (per kg ranges)
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

export function FreightEstimator({ totalWeightGrams, kitQuantity }: FreightEstimatorProps) {
  const [method, setMethod] = useState<string>('transportadora');
  const [customCep, setCustomCep] = useState('');

  const totalWeightKg = (totalWeightGrams * kitQuantity) / 1000;
  const table = FREIGHT_TABLE[method as keyof typeof FREIGHT_TABLE] || FREIGHT_TABLE.transportadora;
  const perShipmentCost = table.find(r => totalWeightKg <= r.maxKg)?.price || table[table.length - 1].price;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          Estimativa de Frete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Modalidade</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedex">SEDEX</SelectItem>
                <SelectItem value="pac">PAC</SelectItem>
                <SelectItem value="transportadora">Transportadora</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-[130px]">
            <Label className="text-xs">CEP (opcional)</Label>
            <Input
              placeholder="00000-000"
              value={customCep}
              onChange={e => setCustomCep(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-[11px] text-muted-foreground">Peso Total</p>
            <p className="font-bold text-sm">{totalWeightKg.toFixed(1)}kg</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-[11px] text-muted-foreground">{method.toUpperCase()}</p>
            <p className="font-bold text-sm text-primary">{formatCurrency(perShipmentCost)}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <p className="text-[11px] text-muted-foreground">Por Kit</p>
            <p className="font-bold text-sm text-primary">{formatCurrency(perShipmentCost / kitQuantity)}</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          * Valores estimados com base em tabela interna. Consulte transportadora para cotação exata.
        </p>
      </CardContent>
    </Card>
  );
}
