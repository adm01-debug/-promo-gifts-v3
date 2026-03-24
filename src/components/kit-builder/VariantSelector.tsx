/**
 * Variant Selector for replaceable kit items (G9)
 * Fetches allowed variants and lets the user swap color/variant for an item.
 * Now passes full variant data (SKU, image, price, color) back to the parent.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Check, Loader2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { invokeExternalDb } from '@/lib/external-db';

interface VariantOption {
  id: string;
  color_name: string | null;
  color_hex: string | null;
  color_code: string | null;
  sku: string | null;
  selected_thumbnail: string | null;
  sale_price?: number | null;
  size_code?: string | null;
}

export interface VariantSelectionData {
  color: { name: string; hex?: string };
  sku?: string;
  imageUrl?: string | null;
  price?: number;
}

interface VariantSelectorProps {
  itemId: string;
  itemName: string;
  allowedVariantIds: string[];
  selectedColor?: { name: string; hex?: string };
  onSelectVariant: (itemId: string, data: VariantSelectionData) => void;
}

export function VariantSelector({
  itemId,
  itemName,
  allowedVariantIds,
  selectedColor,
  onSelectVariant,
}: VariantSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['kit-variant-options', itemId, allowedVariantIds],
    queryFn: async () => {
      if (!allowedVariantIds.length) return [];

      const result = await invokeExternalDb<VariantOption>({
        table: 'product_variants',
        operation: 'select',
        select: 'id, color_name, color_hex, color_code, sku, selected_thumbnail, sale_price, size_code',
        filters: { id: allowedVariantIds, is_active: true },
        limit: 50,
      });

      return result.records.filter(v => v.color_name);
    },
    enabled: open && allowedVariantIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  if (!allowedVariantIds.length) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs gap-1"
        >
          {selectedColor ? (
            <>
              {selectedColor.hex && (
                <span
                  className="w-3 h-3 rounded-full border border-border inline-block"
                  style={{ backgroundColor: selectedColor.hex }}
                />
              )}
              {selectedColor.name}
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" />
              Trocar
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
          Variantes disponíveis
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : variants.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhuma variante encontrada
          </p>
        ) : (
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {variants.map(variant => {
              const isActive = selectedColor?.name === variant.color_name;
              return (
                <button
                  key={variant.id}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors',
                    'hover:bg-accent',
                    isActive && 'bg-primary/10 text-primary'
                  )}
                  onClick={() => {
                    onSelectVariant(itemId, {
                      color: {
                        name: variant.color_name || 'Padrão',
                        hex: variant.color_hex || undefined,
                      },
                      sku: variant.sku || undefined,
                      imageUrl: variant.selected_thumbnail || undefined,
                      price: variant.sale_price ?? undefined,
                    });
                    setOpen(false);
                  }}
                >
                  {variant.color_hex ? (
                    <span
                      className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                      style={{ backgroundColor: variant.color_hex }}
                    />
                  ) : (
                    <Palette className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="truncate flex-1">
                    {variant.color_name || 'Padrão'}
                  </span>
                  {variant.sku && (
                    <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                      {variant.sku}
                    </span>
                  )}
                  {isActive && <Check className="h-3 w-3 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
