/**
 * SimilarProducts — Carousel de produtos visualmente semelhantes
 * 
 * Exibe até 12 produtos com aparência/especificações similares,
 * independente do fornecedor. Os dados virão de uma tabela dedicada
 * no banco externo (a ser conectada via hook).
 */

import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";

interface SimilarProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string;
  supplier_name: string;
  category_name: string;
  colors_count?: number;
  stock?: number;
}

interface SimilarProductsProps {
  currentProduct: Product;
  /** Produtos semelhantes — futuramente virão do hook useSimilarProducts */
  items?: SimilarProductItem[];
  maxItems?: number;
}

// ==========================================
// MOCK DATA — será removido quando o hook real estiver pronto
// ==========================================
function generateMockSimilarProducts(product: Product): SimilarProductItem[] {
  // Gera 24 itens mock (3 páginas de 8) para testar navegação
  const suffixes = [
    'Premium', 'Classic', 'Slim', 'Pro', 'Eco', 'Sport', 'Max', 'Mini',
    'Ultra', 'Lite', 'Plus', 'Elite', 'Basic', 'Prime', 'Flex', 'Core',
    'Wave', 'Edge', 'Bold', 'Nova', 'Zen', 'Apex', 'Vibe', 'Rush',
  ];

  return suffixes.map((suffix, i) => ({
    id: `mock-similar-${i}`,
    name: `${product.name.split(' ').slice(0, 2).join(' ')} ${suffix}`,
    sku: `${parseInt(product.sku || '10000') + i + 1}`,
    price: product.price * (0.7 + Math.random() * 0.6),
    image_url: product.images[0] || '',
    supplier_name: ['Fornecedor A', 'Fornecedor B', 'Fornecedor C', 'Fornecedor D'][i % 4],
    category_name: product.category.name,
    colors_count: Math.floor(Math.random() * 10) + 2,
    stock: Math.floor(Math.random() * 500) + 50,
  }));
}

// ==========================================
// MINI CARD
// ==========================================
function SimilarProductCard({ 
  item, 
  onClick,
  index,
}: { 
  item: SimilarProductItem; 
  onClick: () => void;
  index: number;
}) {
  return (
    <div
      className={cn(
        "group relative flex-shrink-0 snap-start",
        "w-[calc((100%-1.75rem*7)/8)]",
        "rounded-xl bg-card border border-border/50 overflow-hidden",
        "transition-all duration-300 cursor-pointer",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Supplier badge */}
        <div className="absolute bottom-1.5 left-1.5">
          <Badge 
            variant="secondary" 
            className="text-[9px] px-1.5 py-0 bg-background/80 backdrop-blur-sm border-none shadow-sm"
          >
            {item.supplier_name}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="text-[10px] text-muted-foreground truncate">{item.category_name}</p>
        <h4 className="font-medium text-xs text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors min-h-[2rem]">
          {item.name}
        </h4>
        <div className="flex items-center justify-between pt-0.5">
          <span className="font-display font-bold text-sm text-foreground">
            R$ {item.price.toFixed(2).replace('.', ',')}
          </span>
          {item.colors_count && item.colors_count > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {item.colors_count} cores
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">
          REF: {item.sku}
        </p>
      </div>
    </div>
  );
}

// ==========================================
// CAROUSEL PRINCIPAL
// ==========================================
export function SimilarProducts({ 
  currentProduct, 
  items,
  maxItems = 12,
}: SimilarProductsProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Usa mock data se items não foi fornecido (temporário)
  const similarItems = (items || generateMockSimilarProducts(currentProduct)).slice(0, maxItems);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const containerWidth = el.clientWidth;
    const scrollAmount = containerWidth; // scroll one full "page" of 8 cards
    el.scrollBy({ 
      left: direction === 'left' ? -scrollAmount : scrollAmount, 
      behavior: 'smooth' 
    });
    setTimeout(updateScrollButtons, 400);
  }, [updateScrollButtons]);

  if (similarItems.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center">
            <Layers className="h-4.5 w-4.5 text-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              Produtos Semelhantes
            </h2>
            <p className="text-xs text-muted-foreground">
              {similarItems.length} produtos com aparência similar de diferentes fornecedores
            </p>
          </div>
        </div>

        {/* Scroll arrows */}
        <div className="flex items-center gap-1 shrink-0 ml-4">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Left gradient fade */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className={cn(
            "flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory",
            "pb-2 -mb-2" // Extra padding for hover shadow
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {similarItems.map((item, index) => (
            <SimilarProductCard
              key={item.id}
              item={item}
              index={index}
              onClick={() => {
                if (!item.id.startsWith('mock-')) {
                  navigate(`/produto/${item.id}`);
                }
              }}
            />
          ))}
        </div>

        {/* Right gradient fade */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        )}
      </div>
    </section>
  );
}
