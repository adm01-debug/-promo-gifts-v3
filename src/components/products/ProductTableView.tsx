/**
 * ProductTableView — Tabela compacta para análise comparativa rápida.
 * Mostra SKU, nome, fornecedor, preço, estoque e cores em colunas.
 */
import { memo, useState, useCallback } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Package, Heart, GitCompare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";
import { getCdnUrl } from "@/utils/image-utils";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { VariantPickerDialog, type VariantActionMode } from "./VariantPickerDialog";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";
import { toast } from "sonner";
import { showErrorToast } from "@/utils/undoToast";

interface ProductTableViewProps {
  products: Product[];
  onProductClick?: (productId: string) => void;
  isFavorite?: (id: string) => boolean;
  onToggleFavorite?: (id: string) => void;
  isInCompare?: (id: string) => boolean;
  onToggleCompare?: (id: string) => { added: boolean; isFull: boolean };
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

type SortCol = "name" | "sku" | "price" | "stock" | "supplier";
type SortDir = "asc" | "desc";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

const stockColor = (status: string) => {
  if (status === "in-stock") return "text-emerald-400";
  if (status === "low-stock") return "text-amber-400";
  return "text-red-400";
};

function SortHeader({
  label,
  col,
  activeCol,
  activeDir,
  onSort,
  className,
}: {
  label: string;
  col: SortCol;
  activeCol: SortCol;
  activeDir: SortDir;
  onSort: (col: SortCol) => void;
  className?: string;
}) {
  const isActive = activeCol === col;
  return (
    <button
      className={cn(
        "flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors",
        isActive && "text-primary",
        className
      )}
      onClick={() => onSort(col)}
    >
      {label}
      {isActive ? (
        activeDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

export const ProductTableView = memo(function ProductTableView({
  products,
  onProductClick,
  isFavorite,
  onToggleFavorite,
  isInCompare,
  onToggleCompare,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: ProductTableViewProps) {
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  
  // Shared variant picker state
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [variantPickerMode, setVariantPickerMode] = useState<VariantActionMode>('favorite');
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const favStore = useFavoritesStore();
  const compStore = useComparisonStore();

  const openVariantPicker = useCallback((product: Product, mode: VariantActionMode) => {
    setVariantPickerProduct(product);
    setVariantPickerMode(mode);
    setVariantPickerOpen(true);
  }, []);

  const handleVariantComplete = useCallback((variant: ExternalVariantStock | null) => {
    if (!variantPickerProduct) return;
    const variantInfo = variant ? {
      color_name: variant.color_name,
      color_hex: variant.color_hex,
      size_code: variant.size_code,
      variant_id: variant.id,
      thumbnail: variant.selected_thumbnail,
    } : undefined;

    if (variantPickerMode === 'favorite') {
      favStore.addFavorite(variantPickerProduct.id, variantInfo);
      toast.success(`"${variantPickerProduct.name}" favoritado${variant?.color_name ? ` — ${variant.color_name}` : ''}`);
    } else if (variantPickerMode === 'compare') {
      const result = compStore.addToCompare(variantPickerProduct.id, variantInfo);
      if (!result) {
        showErrorToast({ title: "Limite de 4 produtos para comparação atingido" });
      } else {
        toast.success(`"${variantPickerProduct.name}" adicionado à comparação${variant?.color_name ? ` — ${variant.color_name}` : ''}`);
      }
    }
  }, [variantPickerMode, variantPickerProduct, favStore, compStore]);

  const handleSort = useCallback((col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }, [sortCol]);

  const sorted = [...products].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortCol) {
      case "name": return dir * a.name.localeCompare(b.name);
      case "sku": return dir * (a.sku || "").localeCompare(b.sku || "");
      case "price": return dir * (a.price - b.price);
      case "stock": return dir * ((a.stock || 0) - (b.stock || 0));
      case "supplier": return dir * (a.supplier?.name || "").localeCompare(b.supplier?.name || "");
      default: return 0;
    }
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            {selectionMode && <th className="w-10 px-2 py-2.5" />}
            <th className="w-12 px-2 py-2.5" />
            <th className="text-left px-3 py-2.5">
              <SortHeader label="Produto" col="name" activeCol={sortCol} activeDir={sortDir} onSort={handleSort} />
            </th>
            <th className="text-left px-3 py-2.5 hidden md:table-cell">
              <SortHeader label="SKU" col="sku" activeCol={sortCol} activeDir={sortDir} onSort={handleSort} />
            </th>
            <th className="text-left px-3 py-2.5 hidden lg:table-cell">
              <SortHeader label="Fornecedor" col="supplier" activeCol={sortCol} activeDir={sortDir} onSort={handleSort} />
            </th>
            <th className="text-left px-3 py-2.5 hidden sm:table-cell">Cores</th>
            <th className="text-right px-3 py-2.5">
              <SortHeader label="Preço" col="price" activeCol={sortCol} activeDir={sortDir} onSort={handleSort} className="justify-end" />
            </th>
            <th className="text-right px-3 py-2.5">
              <SortHeader label="Estoque" col="stock" activeCol={sortCol} activeDir={sortDir} onSort={handleSort} className="justify-end" />
            </th>
            <th className="w-24 px-2 py-2.5 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((product) => {
            const thumbUrl = product.og_image_url || product.images[0]
              ? getCdnUrl(product.og_image_url || product.images[0], "card")
              : "/placeholder.svg";
            const isSelected = selectionMode && selectedIds?.has(product.id);
            return (
              <tr
                key={product.id}
                className={cn(
                  "border-b border-border/30 hover:bg-accent/30 cursor-pointer transition-colors group",
                  isSelected && "bg-primary/5 ring-1 ring-primary/30"
                )}
                onClick={() => selectionMode ? onToggleSelect?.(product.id) : onProductClick?.(product.id)}
              >
                {/* Selection checkbox */}
                {selectionMode && (
                  <td className="px-2 py-1.5">
                    <SelectionCheckbox
                      checked={!!isSelected}
                      onChange={() => onToggleSelect?.(product.id)}
                      size="sm"
                    />
                  </td>
                )}
                {/* Thumb */}
                <td className="px-2 py-1.5">
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-muted/30 border border-border/30">
                    <img src={thumbUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
                  </div>
                </td>
                {/* Name */}
                <td className="px-3 py-1.5">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 text-[13px]">
                    {product.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground md:hidden">{product.sku}</p>
                </td>
                {/* SKU */}
                <td className="px-3 py-1.5 hidden md:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">{product.sku}</span>
                </td>
                {/* Supplier */}
                <td className="px-3 py-1.5 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">{product.supplier?.name}</span>
                </td>
                {/* Colors */}
                <td className="px-3 py-1.5 hidden sm:table-cell">
                  <div className="flex items-center gap-0.5">
                    {product.colors.slice(0, 6).map((c, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div
                            className="w-4 h-4 rounded-full border border-border/50"
                            style={{ backgroundColor: c.hex }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{c.name}</TooltipContent>
                      </Tooltip>
                    ))}
                    {product.colors.length > 6 && (
                      <span className="text-[10px] text-muted-foreground ml-0.5">+{product.colors.length - 6}</span>
                    )}
                  </div>
                </td>
                {/* Price */}
                <td className="px-3 py-1.5 text-right">
                  <span className="font-display font-bold text-foreground text-[13px]">
                    {formatPrice(product.price)}
                  </span>
                </td>
                {/* Stock */}
                <td className="px-3 py-1.5 text-right">
                  <span className={cn("flex items-center gap-1 justify-end text-xs font-medium", stockColor(product.stockStatus))}>
                    <Package className="h-3 w-3" />
                    {(product.stock || 0).toLocaleString("pt-BR")}
                  </span>
                </td>
                {/* Actions */}
                <td className="px-2 py-1.5">
                  <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-7 w-7 rounded-full", isFavorite?.(product.id) && "text-destructive")}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFavorite?.(product.id)) {
                          onToggleFavorite?.(product.id);
                        } else {
                          openVariantPicker(product, 'favorite');
                        }
                      }}
                      aria-label="Favoritar"
                    >
                      <Heart className={cn("h-3 w-3", isFavorite?.(product.id) && "fill-current")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-7 w-7 rounded-full", isInCompare?.(product.id) && "text-primary")}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInCompare?.(product.id)) {
                          onToggleCompare?.(product.id);
                        } else {
                          openVariantPicker(product, 'compare');
                        }
                      }}
                      aria-label="Comparar"
                    >
                      <GitCompare className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={(e) => { e.stopPropagation(); onProductClick?.(product.id); }}
                      aria-label="Abrir"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {variantPickerProduct && (
        <VariantPickerDialog
          open={variantPickerOpen}
          onOpenChange={setVariantPickerOpen}
          productId={variantPickerProduct.id}
          productName={variantPickerProduct.name}
          mode={variantPickerMode}
          onComplete={handleVariantComplete}
        />
      )}
    </div>
  );
});
