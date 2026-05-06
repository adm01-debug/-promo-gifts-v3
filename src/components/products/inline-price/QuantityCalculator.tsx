import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, Info, Calculator } from 'lucide-react';
import React from 'react';

interface QuantityCalculatorProps {
  customQuantity: number;
  onQuantityChange: (qty: number) => void;
  minQuantity: number;
  unitPrice: number;
  total: number;
  discount: number;
  formatPrice: (price: number) => string;
  compact?: boolean;
}

export function QuantityCalculator({
  customQuantity,
  onQuantityChange,
  minQuantity,
  unitPrice,
  total,
  discount,
  formatPrice,
  compact = false,
}: QuantityCalculatorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    onQuantityChange(Math.max(minQuantity, parseInt(e.target.value) || minQuantity));

  if (compact) {
    return (
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-foreground">Calcule seu pedido</h4>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
            </TooltipTrigger>
            <TooltipContent>Digite a quantidade desejada para ver o preço aplicado</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <Label
              htmlFor="custom-qty"
              className="text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              Quantidade
            </Label>
            <Input
              id="custom-qty"
              type="number"
              min={minQuantity}
              value={customQuantity}
              onChange={handleChange}
              className="h-11 text-base font-bold"
            />
          </div>
          <ArrowRight className="mt-5 h-4 w-4 shrink-0 text-muted-foreground/40" />
          <div className="flex-[1.5] space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Resultado
            </Label>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-3">
              <span className="whitespace-nowrap text-base font-bold text-success">
                {formatPrice(total)}
              </span>
              <span className="whitespace-nowrap text-[11px] text-muted-foreground/60">
                ({formatPrice(unitPrice)}/un)
              </span>
            </div>
          </div>
        </div>
        <Button className="h-11 w-full gap-2 font-bold" size="lg">
          <Calculator className="h-4 w-4" />
          Adicionar {customQuantity.toLocaleString('pt-BR')} un ao Orçamento
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold">Calcule seu pedido</h4>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>Digite a quantidade desejada para ver o preço aplicado</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 space-y-2">
          <Label htmlFor="custom-qty-col" className="text-sm">
            Quantidade
          </Label>
          <Input
            id="custom-qty-col"
            type="number"
            min={minQuantity}
            value={customQuantity}
            onChange={handleChange}
            className="h-12"
          />
        </div>
        <div className="flex items-end">
          <ArrowRight className="mb-4 hidden h-5 w-5 text-muted-foreground sm:block" />
        </div>
        <div className="flex-1 space-y-2">
          <Label className="text-sm">Resultado</Label>
          <div className="flex h-12 items-center justify-between rounded-xl border border-success/20 bg-success/10 px-4">
            <div>
              <span className="text-lg font-bold text-success">{formatPrice(total)}</span>
              {discount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-success/20 text-xs text-success">
                  -{discount}%
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">({formatPrice(unitPrice)}/un)</span>
          </div>
        </div>
      </div>
      <Button className="w-full gap-2" size="lg">
        <Calculator className="h-4 w-4" />
        Adicionar {customQuantity.toLocaleString('pt-BR')} un ao Orçamento
      </Button>
    </div>
  );
}
