import { ProductListItem } from "./ProductListItem";
import type { Product } from "@/hooks/useProducts";

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
        <div
          key={product.id}
          className="animate-fade-in"
          style={{
            animationDelay: `${Math.min(index * 30, 300)}ms`,
            animationFillMode: 'both',
          }}
        >
          <ProductListItem
            product={product}
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
          />
        </div>
      ))}
    </div>
  );
}