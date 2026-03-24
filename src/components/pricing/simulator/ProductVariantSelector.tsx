import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Palette, Check, Package } from 'lucide-react';

export interface ProductVariant {
  code: string;
  name: string;
  hex?: string;
  stock?: number;
  size_code?: string | null;
}

interface ProductVariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant | null) => void;
  label?: string;
}

export function ProductVariantSelector({
  variants,
  selectedVariant,
  onSelect,
  label = 'Cor do Produto',
}: ProductVariantSelectorProps) {
  const sortedVariants = useMemo(() => {
    return [...variants].sort((a, b) => {
      // Ordenar por estoque (com estoque primeiro)
      const aStock = a.stock ?? 0;
      const bStock = b.stock ?? 0;
      if (aStock > 0 && bStock === 0) return -1;
      if (aStock === 0 && bStock > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [variants]);

  if (!variants || variants.length === 0) {
    return null;
  }

  // Se só tem uma variante, não precisa mostrar seletor
  if (variants.length === 1) {
    return (
      <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
        <div
          className="w-6 h-6 rounded-full border-2 border-border"
          style={{ backgroundColor: variants[0].hex || '#888' }}
        />
        <span className="text-sm">
          Cor: <strong>{variants[0].name}</strong>
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        {label}
      </label>

      <div className="flex flex-wrap gap-2">
        {sortedVariants.map((variant) => {
          const isSelected = selectedVariant?.code === variant.code;
          const isOutOfStock = (variant.stock ?? 1) === 0;

          return (
            <button
              key={variant.code}
              onClick={() => onSelect(isSelected ? null : variant)}
              disabled={isOutOfStock}
              className={cn(
                'group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-accent',
                isOutOfStock && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Color swatch */}
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 transition-all',
                  isSelected ? 'border-primary' : 'border-muted-foreground/30'
                )}
                style={{ backgroundColor: variant.hex || '#888' }}
              >
                {isSelected && (
                  <Check className="w-3 h-3 text-white absolute top-1/2 left-[14px] -translate-y-1/2" />
                )}
              </div>

              <span className="text-sm font-medium">
                {variant.name}
                {variant.size_code && <span className="text-muted-foreground ml-1">({variant.size_code})</span>}
              </span>

              {isOutOfStock && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Sem estoque
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {selectedVariant && (
        <p className="text-xs text-muted-foreground">
          Selecionado: <strong>{selectedVariant.name}</strong>
          {selectedVariant.stock !== undefined && selectedVariant.stock > 0 && (
            <span className="ml-2 text-green-600">({selectedVariant.stock} em estoque)</span>
          )}
        </p>
      )}
    </div>
  );
}
