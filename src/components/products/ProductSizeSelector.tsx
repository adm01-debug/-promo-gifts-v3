import { useMemo } from "react";
import { Ruler, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SizeOption {
  code: string;
  stock: number;
  variantIds: string[];
}

interface ProductSizeSelectorProps {
  variations: any[];
  selectedSize: string | null;
  onSelectSize: (size: string | null) => void;
}

const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'EG', 'EGG', 'XS', 'S', 'L', 'XL', 'XXL', '2XL', '3XL'];

function getSizeOrder(code: string): number {
  const idx = SIZE_ORDER.indexOf(code.toUpperCase());
  return idx >= 0 ? idx : 999;
}

export function ProductSizeSelector({
  variations,
  selectedSize,
  onSelectSize,
}: ProductSizeSelectorProps) {
  const sizeOptions = useMemo<SizeOption[]>(() => {
    if (!variations?.length) return [];

    const sizeMap = new Map<string, SizeOption>();

    for (const v of variations) {
      const code = v.size_code;
      if (!code) continue;

      const existing = sizeMap.get(code);
      if (existing) {
        existing.stock += Math.max(0, v.stock ?? 0);
        existing.variantIds.push(v.id);
      } else {
        sizeMap.set(code, {
          code,
          stock: Math.max(0, v.stock ?? 0),
          variantIds: [v.id],
        });
      }
    }

    return Array.from(sizeMap.values()).sort(
      (a, b) => getSizeOrder(a.code) - getSizeOrder(b.code) || a.code.localeCompare(b.code)
    );
  }, [variations]);

  if (sizeOptions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
        <Ruler className="h-4 w-4 text-primary" />
        Tamanho
      </h3>

      <div className="flex flex-wrap gap-2">
        {sizeOptions.map((size) => {
          const isSelected = selectedSize === size.code;
          const isOutOfStock = size.stock === 0;

          return (
            <button
              key={size.code}
              onClick={() => onSelectSize(isSelected ? null : size.code)}
              disabled={isOutOfStock}
              className={cn(
                "relative min-w-[3rem] px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                  : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent",
                isOutOfStock && "opacity-40 cursor-not-allowed line-through"
              )}
            >
              {isSelected && (
                <Check className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0.5 rounded-full bg-primary text-primary-foreground" />
              )}
              {size.code}
            </button>
          );
        })}
      </div>

      {selectedSize && (
        <p className="text-xs text-muted-foreground">
          Tamanho selecionado: <strong>{selectedSize}</strong>
          {sizeOptions.find(s => s.code === selectedSize)?.stock != null && (
            <span className="ml-2 text-success">
              ({sizeOptions.find(s => s.code === selectedSize)!.stock.toLocaleString("pt-BR")} un. em estoque)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
