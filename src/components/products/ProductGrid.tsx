import { ProductCard } from "./ProductCard";
import type { Product } from "@/hooks/useProducts";
import { useEffect, useState, useRef } from "react";

export interface ProductGridProps {
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
  /** Esconder badges de categoria nos cards (útil em layouts compactos) */
  hideCategoryBadges?: boolean;
}

function ProductCardWrapper({ 
  product, 
  index, 
  isVisible,
  hideCategoryBadges,
  ...props 
}: { 
  product: Product; 
  index: number; 
  isVisible: boolean;
  hideCategoryBadges?: boolean;
} & Omit<React.ComponentProps<typeof ProductCard>, 'product'>) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && !hasAnimated) {
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, index * 80); // Stagger delay
      return () => clearTimeout(timer);
    }
  }, [isVisible, hasAnimated, index]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        hasAnimated 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-8 scale-95'
      }`}
      style={{
        transitionDelay: hasAnimated ? '0ms' : `${index * 80}ms`,
      }}
    >
      <ProductCard product={product} hideCategoryBadges={hideCategoryBadges} {...props} />
    </div>
  );
}

export function ProductGrid({ 
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
  hideCategoryBadges = true,
}: ProductGridProps) {
  const [isGridVisible, setIsGridVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset animation state when products change
    setIsGridVisible(false);
    const timer = setTimeout(() => setIsGridVisible(true), 50);
    return () => clearTimeout(timer);
  }, [products]);

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
    <div 
      ref={gridRef}
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
    >
      {products.map((product, index) => (
        <ProductCardWrapper
          key={product.id}
          product={product}
          index={index}
          isVisible={isGridVisible}
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
          hideCategoryBadges={hideCategoryBadges}
        />
      ))}
    </div>
  );
}