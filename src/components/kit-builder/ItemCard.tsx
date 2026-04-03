/**
 * Item Card
 * Card individual para exibir um item disponível no kit
 */

import { Plus, Check, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatVolume, formatCurrency } from '@/lib/kit-builder';
import type { KitItem, CompatibilityResult } from '@/lib/kit-builder';

interface ItemCardProps {
  item: KitItem & { compatibility: CompatibilityResult | null };
  isSelected: boolean;
  boxSelected: boolean;
  onAdd: (item: KitItem) => void;
  onRemove: (itemId: string) => void;
}

export function ItemCard({ item, isSelected, boxSelected, onAdd, onRemove }: ItemCardProps) {
  const fits = item.compatibility?.fits !== false;
  const cantFit = boxSelected && !fits;

  return (
    <Card
      className={cn(
        "transition-all",
        isSelected && "ring-2 ring-primary bg-primary/5",
        cantFit && "opacity-60",
        !cantFit && !isSelected && "hover:shadow-md hover:border-primary/30 cursor-pointer"
      )}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Imagem pequena */}
          <div className="w-14 h-14 rounded-md bg-secondary overflow-hidden flex-shrink-0">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{item.name}</h4>
            <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {formatVolume(item.volume)}
              </span>
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(item.price)}
              </span>
            </div>
          </div>
        </div>

        {/* Badge de compatibilidade e ação */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          {boxSelected && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={fits ? "secondary" : "destructive"}
                  className={cn(
                    "text-xs",
                    fits && "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                  )}
                >
                  {fits ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      CABE
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      NÃO CABE
                    </>
                  )}
                </Badge>
              </TooltipTrigger>
              {!fits && item.compatibility?.reason && (
                <TooltipContent>
                  <p className="max-w-[200px]">{item.compatibility.reason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {isSelected ? (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => onRemove(item.id)}
            >
              <X className="h-3 w-3 mr-1" />
              Remover
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="ml-auto"
              disabled={cantFit}
              onClick={() => onAdd(item)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
