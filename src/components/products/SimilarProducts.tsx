/**
 * SimilarProducts — Carousel infinito de produtos visualmente semelhantes
 * 
 * Exibe produtos com aparência/especificações similares independente do fornecedor.
 * Carregamento progressivo: mostra lotes de 12 e carrega mais ao se aproximar do fim.
 * Os dados virão de uma tabela dedicada no banco externo (a ser conectada via hook).
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Layers, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Product } from "@/hooks/useProducts";

export interface SimilarProductItem {
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
  /** Todos os itens semelhantes (o componente pagina internamente) */
  items?: SimilarProductItem[];
  /** Total disponível no servidor (para contagem no header) */
  totalCount?: number;
  /** Callback para carregar mais itens */
  onLoadMore?: () => void;
  /** Se há mais itens para carregar */
  hasMore?: boolean;
  /** Se está carregando mais */
  isLoadingMore?: boolean;
  /** Tamanho de cada página */
  pageSize?: number;
}

// ==========================================
// MOCK DATA — será removido quando o hook real estiver pronto
// ==========================================
const MOCK_SUFFIXES = [
  'Premium', 'Classic', 'Slim', 'Pro', 'Eco', 'Sport', 'Max', 'Mini',
  'Ultra', 'Lite', 'Plus', 'Elite', 'Basic', 'Deluxe', 'Gold', 'Silver',
  'Original', 'Compact', 'XL', 'Modern', 'Retro', 'Urban', 'Active', 'Fresh',
  'Vibe', 'Wave', 'Core', 'Flex', 'Prime', 'Nova',
];

function generateMockItems(product: Product, count = 30): SimilarProductItem[] {
  const baseName = product.name.split(' ').slice(0, 3).join(' ');
  const suppliers = ['Masterway', 'XBZ', 'ControlBrindes', 'Uatt', 'Simkan', 'Innovare'];

  return Array.from({ length: count }, (_, i) => ({
    id: `mock-similar-${i}`,
    name: `${baseName} ${MOCK_SUFFIXES[i % MOCK_SUFFIXES.length]}`,
    sku: `${parseInt(product.sku || '10000') + i + 1}`,
    price: +(product.price * (0.6 + Math.random() * 0.8)).toFixed(2),
    image_url: product.images[i % product.images.length] || product.images[0] || '',
    supplier_name: suppliers[i % suppliers.length],
    category_name: product.category.name,
    colors_count: Math.floor(Math.random() * 12) + 2,
    stock: Math.floor(Math.random() * 800) + 20,
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
        "group relative flex-shrink-0 w-[180px] snap-start",
        "rounded-xl bg-card border border-border/50 overflow-hidden",
        "transition-all duration-300 cursor-pointer",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      onClick={onClick}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute bottom-1.5 left-1.5">
          <Badge
            variant="secondary"
            className="text-[9px] px-1.5 py-0 bg-background/80 backdrop-blur-sm border-none shadow-sm"
          >
            {item.supplier_name}
          </Badge>
        </div>
      </div>
      <div className="p-2.5 space-y-1">
        <p className="text-[10px] text-muted-foreground truncate">{item.category_name}</p>
        <h4 className="font-medium text-xs text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors min-h-[2rem]">
          {item.name}
        </h4>
        <div className="flex items-center justify-between pt-0.5">
          <span className="font-display font-bold text-sm text-foreground">
            R$ {item.price.toFixed(2).replace('.', ',')}
          </span>
          {item.colors_count != null && item.colors_count > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {item.colors_count} cores
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">REF: {item.sku}</p>
      </div>
    </div>
  );
}

// Skeleton card for loading state
function SimilarProductSkeleton() {
  return (
    <div className="flex-shrink-0 w-[180px] rounded-xl bg-card border border-border/50 overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-2.5 space-y-2">
        <div className="h-2 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3.5 bg-muted rounded w-1/3 mt-1" />
      </div>
    </div>
  );
}

// ==========================================
// CAROUSEL PRINCIPAL — carregamento progressivo
// ==========================================
export function SimilarProducts({
  currentProduct,
  items,
  totalCount,
  onLoadMore,
  hasMore: hasMoreProp,
  isLoadingMore = false,
  pageSize = 12,
}: SimilarProductsProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Mock: pagina internamente enquanto não há hook real
  const [mockPage, setMockPage] = useState(1);
  const allMock = useRef<SimilarProductItem[]>([]);
  if (!items && allMock.current.length === 0) {
    allMock.current = generateMockItems(currentProduct, 30);
  }

  const displayedItems = items || allMock.current.slice(0, mockPage * pageSize);
  const hasMore = items ? (hasMoreProp ?? false) : displayedItems.length < allMock.current.length;
  const total = totalCount ?? (items ? displayedItems.length : allMock.current.length);

  // Intersection observer para carregar mais ao chegar perto do fim
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          if (onLoadMore) {
            onLoadMore();
          } else {
            // Mock progressive loading
            setMockPage((p) => p + 1);
          }
        }
      },
      { root: scrollRef.current, rootMargin: '0px 200px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = useCallback(
    (direction: 'left' | 'right') => {
      const el = scrollRef.current;
      if (!el) return;
      const scrollAmount = 192 * 3; // 3 cards
      el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      setTimeout(updateScrollButtons, 400);
    },
    [updateScrollButtons]
  );

  if (displayedItems.length === 0 && !isLoadingMore) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center">
            <Layers className="h-4.5 w-4.5 text-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              Produtos Semelhantes
            </h2>
            <p className="text-xs text-muted-foreground">
              {displayedItems.length} de {total} produtos similares de diferentes fornecedores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
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
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {displayedItems.map((item, index) => (
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

          {/* Loading skeletons */}
          {isLoadingMore &&
            Array.from({ length: 4 }).map((_, i) => (
              <SimilarProductSkeleton key={`skel-${i}`} />
            ))}

          {/* Sentinel — triggers load-more when scrolled into view */}
          {hasMore && (
            <div ref={sentinelRef} className="flex-shrink-0 w-1" aria-hidden="true" />
          )}
        </div>

        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        )}
      </div>
    </section>
  );
}
