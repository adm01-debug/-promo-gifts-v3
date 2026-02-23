import { useEffect, useState } from "react";
import { ProductListItem } from "./ProductListItem";
import type { Product } from "@/hooks/useProducts";
import type { ActiveColorFilter } from "@/utils/color-image-resolver";

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
  ...props
}: {
  product: Product;
  index: number;
} & Omit<React.ComponentProps<typeof ProductListItem>, 'product'>) {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasAnimated(true);
    }, Math.min(index * 40, 400));
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        hasAnimated
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 -translate-x-3'
      }`}
    >
      <ProductListItem product={product} {...props} />
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

  return (
    <div className="flex flex-col gap-3">
      {products.map((product, index) => (
        <ProductListItemWrapper
          key={product.id}
          product={product}
          index={index}
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
  );
}