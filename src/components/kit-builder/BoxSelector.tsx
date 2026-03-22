/**
 * Box Selector
 * Seletor de caixa/embalagem para o kit
 */

import { useState } from 'react';
import { Search, Package, Check, Ruler, Box } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatVolume, formatDimensions, formatCurrency } from '@/lib/kit-builder';
import type { KitBox, BoxFilters } from '@/lib/kit-builder';

interface BoxSelectorProps {
  boxes: KitBox[];
  selectedBox: KitBox | null;
  isLoading: boolean;
  filters: BoxFilters;
  onFiltersChange: (filters: BoxFilters) => void;
  onSelect: (box: KitBox) => void;
  onClear: () => void;
}

export function BoxSelector({
  boxes,
  selectedBox,
  isLoading,
  filters,
  onFiltersChange,
  onSelect,
  onClear,
}: BoxSelectorProps) {
  const [searchValue, setSearchValue] = useState('');

  // #1 FIX: Debounce is now handled by the hook via setBoxFiltersDebounced
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  // Se já tem uma caixa selecionada, mostra resumo
  if (selectedBox) {
    return (
      <Card className="border-primary bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Imagem */}
            <div className="w-24 h-24 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
              {selectedBox.imageUrl ? (
                <img
                  src={selectedBox.imageUrl}
                  alt={selectedBox.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="default" className="bg-primary">
                  <Check className="h-3 w-3 mr-1" />
                  Selecionada
                </Badge>
              </div>
              <h3 className="font-semibold text-lg truncate">{selectedBox.name}</h3>
              <p className="text-sm text-muted-foreground font-mono">{selectedBox.sku}</p>
              
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDimensions(selectedBox.internalWidth, selectedBox.internalHeight, selectedBox.internalDepth)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Box className="h-4 w-4 text-muted-foreground" />
                  <span>{formatVolume(selectedBox.internalVolume)}</span>
                </div>
                <div className="font-semibold text-primary">
                  {formatCurrency(selectedBox.price)}
                </div>
              </div>
            </div>

            {/* Ação */}
            <Button variant="outline" size="sm" onClick={onClear}>
              Trocar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar caixa ou embalagem..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de caixas */}
      <ScrollArea className="h-[400px] pr-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-36 w-full rounded-lg" />
            ))}
          </div>
        ) : boxes.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma caixa encontrada</p>
            <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {boxes.map(box => (
              <Card
                key={box.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                  "group"
                )}
                onClick={() => onSelect(box)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Imagem */}
                    <div className="w-20 h-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {box.imageUrl ? (
                        <img
                          src={box.imageUrl}
                          alt={box.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                        {box.name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono mb-2">{box.sku}</p>
                      
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{formatDimensions(box.internalWidth, box.internalHeight, box.internalDepth)}</span>
                        <span>•</span>
                        <span>{formatVolume(box.internalVolume)}</span>
                      </div>
                      
                      <p className="font-semibold text-primary mt-1">
                        {formatCurrency(box.price)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
