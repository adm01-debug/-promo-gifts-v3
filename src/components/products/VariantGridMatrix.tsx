/**
 * VariantGridMatrix — Grade visual Cor × Tamanho
 * 
 * Exibe uma tabela onde:
 *  - Linhas = cores (com swatch)
 *  - Colunas = tamanhos (size_code)
 *  - Células = estoque + estado selecionado
 * 
 * Se o produto só tiver cores (sem tamanho), mostra layout simplificado.
 * Reutilizável no admin e na visualização do detalhe.
 */

import { useMemo } from "react";
import { Check, Package, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// ── Types ──

export interface VariantGridItem {
  id: string;
  color_name: string;
  color_hex: string;
  size_code?: string | null;
  stock: number;
  sku?: string;
  image?: string | null;
  price?: number | null;
}

interface VariantGridMatrixProps {
  variants: VariantGridItem[];
  selectedId?: string | null;
  onSelect?: (variant: VariantGridItem) => void;
  /** Admin mode: shows edit button indicator */
  mode?: "view" | "admin";
  compact?: boolean;
}

// ── Size ordering ──

const SIZE_ORDER = [
  "PP", "P", "M", "G", "GG", "XG", "XXG", "EG", "EGG",
  "XS", "S", "L", "XL", "XXL", "2XL", "3XL",
  "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46",
  "100ml", "200ml", "300ml", "350ml", "400ml", "500ml", "600ml", "750ml", "1L",
];

function getSizeOrder(code: string): number {
  const upper = code.toUpperCase().trim();
  const idx = SIZE_ORDER.indexOf(upper);
  if (idx >= 0) return idx;
  const num = parseFloat(upper);
  if (!isNaN(num)) return 1000 + num;
  return 2000;
}

function isLightColor(hex?: string | null): boolean {
  if (!hex) return true;
  const c = hex.replace("#", "");
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function formatStock(stock: number): string {
  if (stock >= 1000) return `${(stock / 1000).toFixed(1)}k`;
  return stock.toLocaleString("pt-BR");
}

function stockColor(stock: number): string {
  if (stock === 0) return "text-destructive";
  if (stock < 100) return "text-warning";
  return "text-success";
}

// ── Component ──

export function VariantGridMatrix({
  variants,
  selectedId,
  onSelect,
  mode = "view",
  compact = false,
}: VariantGridMatrixProps) {
  const { colors, sizes, matrix, hasSizes } = useMemo(() => {
    // Extract unique colors maintaining order
    const colorMap = new Map<string, { name: string; hex: string }>();
    const sizeSet = new Set<string>();

    for (const v of variants) {
      if (!colorMap.has(v.color_name)) {
        colorMap.set(v.color_name, { name: v.color_name, hex: v.color_hex });
      }
      if (v.size_code) sizeSet.add(v.size_code);
    }

    const colors = Array.from(colorMap.values());
    const sizes = Array.from(sizeSet).sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
    const hasSizes = sizes.length > 0;

    // Build matrix: color_name -> size_code -> variant
    const matrix = new Map<string, Map<string, VariantGridItem>>();
    for (const v of variants) {
      const sizeKey = v.size_code || "__none__";
      if (!matrix.has(v.color_name)) {
        matrix.set(v.color_name, new Map());
      }
      matrix.get(v.color_name)!.set(sizeKey, v);
    }

    return { colors, sizes, matrix, hasSizes };
  }, [variants]);

  if (variants.length === 0) return null;

  // ── Single-axis (only colors, no sizes) ──
  if (!hasSizes) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Variações de Cor ({colors.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => {
            const variant = matrix.get(color.name)?.get("__none__");
            if (!variant) return null;
            const isSelected = selectedId === variant.id;
            const stock = Math.max(0, variant.stock);

            return (
              <Tooltip key={variant.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelect?.(variant)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/40",
                      stock === 0 && "opacity-40"
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: color.hex || "hsl(var(--muted))" }}
                    />
                    <span className="font-medium">{color.name}</span>
                    <span className={cn("text-xs font-mono", stockColor(stock))}>
                      {formatStock(stock)}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {variant.sku && <p className="font-mono text-xs">{variant.sku}</p>}
                  <p>{stock} un. em estoque</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Multi-axis grid (Color × Size) ──
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Ruler className="h-4 w-4 text-primary" />
        Grade Cor × Tamanho
        <Badge variant="secondary" className="text-[10px] px-1.5">
          {colors.length} cores × {sizes.length} tamanhos
        </Badge>
      </h4>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className={cn(
                "sticky left-0 z-10 bg-muted/80 backdrop-blur-sm text-left font-semibold text-muted-foreground border-b border-r border-border",
                compact ? "px-2 py-1.5" : "px-3 py-2"
              )}>
                Cor
              </th>
              {sizes.map((size) => (
                <th
                  key={size}
                  className={cn(
                    "text-center font-semibold text-muted-foreground border-b border-border whitespace-nowrap",
                    compact ? "px-2 py-1.5" : "px-3 py-2"
                  )}
                >
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((color, rowIdx) => (
              <tr
                key={color.name}
                className={cn(
                  "transition-colors hover:bg-accent/30",
                  rowIdx % 2 === 0 ? "bg-card" : "bg-muted/20"
                )}
              >
                {/* Color label cell */}
                <td className={cn(
                  "sticky left-0 z-10 border-r border-border font-medium whitespace-nowrap",
                  compact ? "px-2 py-1.5" : "px-3 py-2.5",
                  rowIdx % 2 === 0 ? "bg-card" : "bg-muted/20"
                )}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-border shrink-0"
                      style={{
                        backgroundColor: color.hex || "hsl(var(--muted))",
                        border: isLightColor(color.hex)
                          ? "1px solid hsl(var(--border))"
                          : undefined,
                      }}
                    />
                    <span className="truncate max-w-[100px]">{color.name}</span>
                  </div>
                </td>

                {/* Stock cells per size */}
                {sizes.map((size) => {
                  const variant = matrix.get(color.name)?.get(size);

                  if (!variant) {
                    return (
                      <td
                        key={size}
                        className={cn(
                          "text-center border-border",
                          compact ? "px-2 py-1.5" : "px-3 py-2.5"
                        )}
                      >
                        <span className="text-muted-foreground/30">—</span>
                      </td>
                    );
                  }

                  const stock = Math.max(0, variant.stock);
                  const isSelected = selectedId === variant.id;

                  return (
                    <td
                      key={size}
                      className={cn(
                        "text-center border-border",
                        compact ? "px-1 py-1" : "px-2 py-2"
                      )}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onSelect?.(variant)}
                            className={cn(
                              "w-full min-w-[3rem] py-1.5 px-2 rounded-md transition-all text-xs font-medium",
                              isSelected
                                ? "bg-primary text-primary-foreground ring-2 ring-primary/30 shadow-sm"
                                : stock > 0
                                  ? "bg-secondary/60 hover:bg-secondary text-foreground hover:shadow-sm"
                                  : "bg-destructive/5 text-destructive/60 cursor-default",
                              stock > 0 && !isSelected && "hover:scale-105"
                            )}
                          >
                            {isSelected && (
                              <Check className="inline-block h-3 w-3 mr-0.5 -mt-0.5" />
                            )}
                            {formatStock(stock)}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="space-y-0.5">
                            <p className="font-semibold">{color.name} — {size}</p>
                            {variant.sku && <p className="font-mono text-muted-foreground">{variant.sku}</p>}
                            <p className={stockColor(stock)}>
                              {stock > 0 ? `${stock.toLocaleString("pt-BR")} un. disponíveis` : "Sem estoque"}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {/* Footer with totals per size */}
          <tfoot>
            <tr className="bg-muted/60 font-semibold">
              <td className={cn(
                "sticky left-0 z-10 bg-muted/60 border-t border-r border-border text-muted-foreground",
                compact ? "px-2 py-1.5" : "px-3 py-2"
              )}>
                Total
              </td>
              {sizes.map((size) => {
                let total = 0;
                for (const color of colors) {
                  const v = matrix.get(color.name)?.get(size);
                  if (v) total += Math.max(0, v.stock);
                }
                return (
                  <td
                    key={size}
                    className={cn(
                      "text-center border-t border-border",
                      compact ? "px-2 py-1.5" : "px-3 py-2",
                      stockColor(total)
                    )}
                  >
                    {formatStock(total)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
