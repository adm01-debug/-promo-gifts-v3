import { useEffect, useState, useCallback } from "react";
import { ProductListItem } from "./ProductListItem";
import { BulkActionBar } from "./BulkActionBar";
import { AddToCollectionModal } from "@/components/collections/AddToCollectionModal";
import type { Product } from "@/hooks/useProducts";
import type { ActiveColorFilter } from "@/utils/color-image-resolver";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProductListProps {
  products: Product[];
  onProductClick?: (productId: string) => void;
  onViewProduct?: (product: Product) => void;
  onShareProduct?: (product: Product) => void;
  onFavoriteProduct?: (product: Product) => void;
  isFavorite?: (productId: string) => boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: (productId: string) => boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  highlightColors?: string[];
  activeColorFilter?: ActiveColorFilter | null;
}

function ProductListItemWrapper({
  product,
  index,
  isSelected,
  onToggleSelect,
  ...props
}: {
  product: Product;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
} & Omit<React.ComponentProps<typeof ProductListItem>, 'product'>) {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), Math.min(index * 40, 400));
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={cn(
        "relative transition-all duration-300 ease-out group/row",
        hasAnimated ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3",
        isSelected && "ring-2 ring-primary/40 rounded-xl"
      )}
    >
      {/* Checkbox — appears on hover or when item is selected */}
      <button
        className={cn(
          "absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center",
          "w-6 h-6 rounded-md border-2 transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSelected
            ? "bg-primary border-primary text-primary-foreground scale-100 opacity-100"
            : "border-muted-foreground/30 bg-card opacity-0 group-hover/row:opacity-100 hover:border-primary/50"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(product.id);
        }}
        aria-label={isSelected ? "Desselecionar" : "Selecionar"}
      >
        {isSelected && (
          <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
            <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className={cn(isSelected ? "ml-4" : "ml-0 group-hover/row:ml-4", "transition-all duration-200")}>
        <ProductListItem product={product} {...props} />
      </div>
    </div>
  );
}

export function ProductList({
  products,
  onProductClick,
  onViewProduct,
  onShareProduct,
  onFavoriteProduct,
  isFavorite,
  onToggleFavorite,
  isInCompare,
  onToggleCompare,
  canAddToCompare = true,
  highlightColors,
  activeColorFilter,
}: ProductListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  // Clear selection when products change significantly
  useEffect(() => {
    setSelectedIds(new Set());
  }, [products.length]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(products.map((p) => p.id)));
  }, [products]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkFavorite = useCallback(() => {
    if (!onToggleFavorite) return;
    let added = 0;
    selectedIds.forEach((id) => {
      if (!isFavorite?.(id)) {
        onToggleFavorite(id);
        added++;
      }
    });
    toast.success(`${added} produto${added > 1 ? "s" : ""} adicionado${added > 1 ? "s" : ""} aos favoritos`);
    clearSelection();
  }, [selectedIds, onToggleFavorite, isFavorite, clearSelection]);

  const handleBulkCompare = useCallback(() => {
    if (!onToggleCompare) return;
    const ids = Array.from(selectedIds).slice(0, 4);
    ids.forEach((id) => {
      if (!isInCompare?.(id)) onToggleCompare(id);
    });
    toast.success(`${ids.length} produto${ids.length > 1 ? "s" : ""} adicionado${ids.length > 1 ? "s" : ""} à comparação`);
    clearSelection();
  }, [selectedIds, onToggleCompare, isInCompare, clearSelection]);

  const handleBulkCollection = useCallback(() => {
    setCollectionModalOpen(true);
  }, []);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-3xl">📦</span>
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          Nenhum produto encontrado
        </h3>
        <p className="text-muted-foreground max-w-md">
          Tente ajustar os filtros ou realizar uma nova busca para encontrar os produtos desejados.
        </p>
      </div>
    );
  }

  // Get first selected product for collection modal
  const firstSelectedId = selectedIds.size > 0 ? Array.from(selectedIds)[0] : "";
  const firstSelectedProduct = products.find((p) => p.id === firstSelectedId);

  return (
    <>
      <div className="flex flex-col gap-2">
        {products.map((product, index) => (
          <ProductListItemWrapper
            key={product.id}
            product={product}
            index={index}
            isSelected={selectedIds.has(product.id)}
            onToggleSelect={toggleSelect}
            onClick={onProductClick ? () => onProductClick(product.id) : undefined}
            onView={onViewProduct}
            onShare={onShareProduct}
            onFavorite={onFavoriteProduct}
            isFavorited={isFavorite ? isFavorite(product.id) : false}
            onToggleFavorite={onToggleFavorite}
            isInCompare={isInCompare ? isInCompare(product.id) : false}
            onToggleCompare={onToggleCompare}
            canAddToCompare={canAddToCompare}
            highlightColors={highlightColors}
            activeColorFilter={activeColorFilter}
          />
        ))}
      </div>

      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={products.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkFavorite={handleBulkFavorite}
        onBulkCompare={handleBulkCompare}
        onBulkCollection={handleBulkCollection}
      />

      {firstSelectedProduct && (
        <AddToCollectionModal
          open={collectionModalOpen}
          onOpenChange={(open) => {
            setCollectionModalOpen(open);
            if (!open) clearSelection();
          }}
          productId={firstSelectedId}
          productName={`${selectedIds.size} produtos selecionados`}
        />
      )}
    </>
  );
}
