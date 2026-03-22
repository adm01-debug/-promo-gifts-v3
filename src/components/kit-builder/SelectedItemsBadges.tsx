/**
 * Selected Items Badges
 * Exibe os itens selecionados como badges compactos
 */

import { X } from 'lucide-react';
import { VariantSelector, type VariantSelectionData } from './VariantSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { KitItem } from '@/lib/kit-builder';

interface SelectedItemsBadgesProps {
  items: KitItem[];
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateVariant: (itemId: string, data: VariantSelectionData) => void;
}

export function SelectedItemsBadges({
  items,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateVariant,
}: SelectedItemsBadgesProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Itens no Kit ({items.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <Badge
            key={item.id}
            variant="secondary"
            className="pl-2 pr-1 py-1 flex items-center gap-2"
          >
            <span className="font-medium">{item.quantity}x</span>
            <span className="max-w-[150px] truncate">{item.name}</span>
            {item.isReplaceable && item.allowedVariantIds && item.allowedVariantIds.length > 0 && (
              <VariantSelector
                itemId={item.id}
                itemName={item.name}
                allowedVariantIds={item.allowedVariantIds}
                selectedColor={item.selectedColor}
                onSelectVariant={onUpdateVariant}
              />
            )}
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
  );
}
