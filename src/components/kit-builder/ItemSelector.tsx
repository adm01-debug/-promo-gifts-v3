/**
 * Item Selector
 * Seletor de itens para compor o kit
 */

import { useState } from 'react';
import { Search, Plus, Check, AlertTriangle, X, Package, RefreshCw } from 'lucide-react';
import { VariantSelector } from './VariantSelector';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatVolume, formatCurrency } from '@/lib/kit-builder';
import type { KitItem, ItemFilters, CompatibilityResult } from '@/lib/kit-builder';

interface ItemWithCompatibility extends KitItem {
  compatibility: CompatibilityResult | null;
}

interface ItemSelectorProps {
  items: ItemWithCompatibility[];
  selectedItems: KitItem[];
  isLoading: boolean;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
  onAddItem: (item: KitItem) => CompatibilityResult;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateColor: (itemId: string, color: { name: string; hex?: string }) => void;
  boxSelected: boolean;
}

export function ItemSelector({
  items,
  selectedItems,
  isLoading,
  filters,
  onFiltersChange,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  boxSelected,
}: ItemSelectorProps) {
  const [searchDebounce, setSearchDebounce] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchDebounce(value);
    setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined });
    }, 300);
  };

  const handleAddItem = (item: KitItem) => {
    const result = onAddItem(item);
    if (!result.fits) {
      setLastError(result.reason || 'Item não cabe na caixa');
      setTimeout(() => setLastError(null), 3000);
    }
  };

  const selectedItemIds = new Set(selectedItems.map(i => i.id));

  return (
    <div className="space-y-4">
      {/* Alerta se caixa não selecionada */}
      {!boxSelected && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
          <p className="text-sm">Selecione uma caixa primeiro para verificar a compatibilidade dos itens.</p>
        </div>
      )}

      {/* Erro temporário */}
      {lastError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <X className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{lastError}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar item..."
            value={searchDebounce}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {boxSelected && (
          <div className="flex items-center gap-2">
            <Switch
              id="only-fitting"
              checked={filters.onlyFitting || false}
              onCheckedChange={(checked) => 
                onFiltersChange({ ...filters, onlyFitting: checked })
              }
            />
            <Label htmlFor="only-fitting" className="text-sm cursor-pointer">
              Apenas itens que cabem
            </Label>
          </div>
        )}
      </div>

      {/* Itens selecionados */}
      {selectedItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Itens no Kit ({selectedItems.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedItems.map(item => (
              <Badge
                key={item.id}
                variant="secondary"
                className="pl-2 pr-1 py-1 flex items-center gap-2"
              >
                <span className="font-medium">{item.quantity}x</span>
                <span className="max-w-[150px] truncate">{item.name}</span>
                <div className="flex items-center gap-1 ml-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  >
                    -
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive hover:text-destructive"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Lista de itens disponíveis */}
      <ScrollArea className="h-[350px] pr-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum item encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(item => {
              const isSelected = selectedItemIds.has(item.id);
              const fits = item.compatibility?.fits !== false;
              const cantFit = boxSelected && !fits;

              return (
                <Card
                  key={item.id}
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
                          onClick={() => onRemoveItem(item.id)}
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
                          onClick={() => handleAddItem(item)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
