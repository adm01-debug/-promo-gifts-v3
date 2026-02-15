/**
 * MockupProductSelector — Product selector for mockup generator
 * 
 * Replicates exact same visual and logic as QuoteProductSelector + QuoteProductColorSelector.
 * Flow: Search products -> Select product -> Choose color/variant -> Confirmed.
 */

import { useState, useMemo, useRef, useCallback } from "react";
import Fuse from "fuse.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, Package, X, SearchX, ArrowLeft, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Product, ProductColor } from "@/hooks/useProducts";
import { useDebounce } from "@/hooks/useDebounce";
import { useExternalVariantStock, type ExternalVariantStock } from "@/hooks/useExternalVariantStock";

export interface MockupProductSelection {
  product: Product;
  variant: ExternalVariantStock | null;
  colorName?: string;
  colorHex?: string;
  /** Image URL to use for the mockup (variant-specific if available) */
  imageUrl: string;
}

interface MockupProductSelectorProps {
  selection: MockupProductSelection | null;
  onSelect: (selection: MockupProductSelection | null) => void;
  disabled?: boolean;
}

// Fuse.js config — identical to QuoteProductSelector
const fuseOptions: Fuse.IFuseOptions<Product> = {
  keys: [
    { name: 'name', weight: 0.45 },
    { name: 'sku', weight: 0.3 },
    { name: 'category_name', weight: 0.15 },
    { name: 'brand', weight: 0.1 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

export function MockupProductSelector({ selection, onSelect, disabled }: MockupProductSelectorProps) {
  const { products } = useProductsContext();
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'>('default');
  const [scrollState, setScrollState] = useState({ top: false, bottom: true });
  
  // Internal state: product picked but color not yet chosen
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollParentRef.current;
    if (!el) return;
    const atTop = el.scrollTop > 8;
    const atBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 8;
    setScrollState({ top: atTop, bottom: atBottom });
  }, []);

  const debouncedQuery = useDebounce(searchQuery, 300);
  const isFilterPending = searchQuery.length >= 2 && searchQuery !== debouncedQuery;

  const fuse = useMemo(
    () => new Fuse(products, fuseOptions),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return products;
    return fuse.search(debouncedQuery).map(r => r.item);
  }, [fuse, debouncedQuery, products]);

  const sortedProducts = useMemo(() => {
    if (sortBy === 'default') return filteredProducts;
    const sorted = [...filteredProducts];
    switch (sortBy) {
      case 'name-asc': return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc': return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'price-asc': return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc': return sorted.sort((a, b) => b.price - a.price);
      default: return sorted;
    }
  }, [filteredProducts, sortBy]);

  const rowVirtualizer = useVirtualizer({
    count: sortedProducts.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const isSearching = debouncedQuery.length >= 2;
  const resultCount = sortedProducts.length;

  const handleProductPick = (product: Product) => {
    setPendingProduct(product);
    setSearchQuery("");
  };

  const handleColorSelect = (variant: ExternalVariantStock | null, product: Product) => {
    const imageUrl = variant?.selected_thumbnail
      ? `${variant.selected_thumbnail}/thumbnail`
      : product.images?.[0] || '/placeholder.svg';
    
    onSelect({
      product,
      variant,
      colorName: variant?.color_name ?? undefined,
      colorHex: variant?.color_hex ?? undefined,
      imageUrl,
    });
    setPendingProduct(null);
  };

  const handleClear = () => {
    onSelect(null);
    setPendingProduct(null);
    setSearchQuery("");
  };

  // ─── State: Product + Color confirmed ──────────────────────────────
  if (selection) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <div className="w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0">
          <img
            src={selection.imageUrl}
            alt={selection.product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate text-sm">{selection.product.name}</h4>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono tracking-wide">
              {selection.product.sku || 'N/A'}
            </span>
            {selection.colorName && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                {selection.colorHex && (
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-border/50"
                    style={{ backgroundColor: selection.colorHex }}
                  />
                )}
                {selection.colorName}
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // ─── State: Product picked, choosing color ─────────────────────────
  if (pendingProduct) {
    return (
      <ColorSelector
        product={pendingProduct}
        onSelect={(variant) => handleColorSelect(variant, pendingProduct)}
        onBack={() => setPendingProduct(null)}
      />
    );
  }

  // ─── State: Product list (search) ──────────────────────────────────
  return (
    <div className="flex flex-col border rounded-lg overflow-hidden" style={{ maxHeight: '420px' }}>
      {/* Search */}
      <div className="p-3 space-y-2 shrink-0 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-11 text-sm border-primary/30 focus-visible:ring-primary/20"
            disabled={disabled}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {isSearching
              ? `${resultCount} resultado${resultCount !== 1 ? 's' : ''}`
              : `${products.length} produtos disponíveis`}
          </p>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-[11px] border rounded-md px-2 py-1 bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <option value="default">Relevância</option>
            <option value="name-asc">Nome A→Z</option>
            <option value="name-desc">Nome Z→A</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </div>
      </div>

      {/* Virtualized product list */}
      <div className="relative flex-1 min-h-0">
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-6 z-10 transition-opacity duration-200"
          style={{
            opacity: scrollState.top ? 1 : 0,
            background: 'linear-gradient(to bottom, hsl(var(--background)), transparent)',
          }}
        />
        <div
          ref={scrollParentRef}
          className="pr-2 overflow-auto h-full"
          style={{ maxHeight: '340px' }}
          onScroll={handleScroll}
        >
          {isFilterPending ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                  <Skeleton className="w-12 h-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <SearchX className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-base">Nenhum produto encontrado</p>
              {isSearching && (
                <p className="text-xs mt-1.5">Tente ajustar o termo de busca</p>
              )}
              {searchQuery && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearchQuery("")}>
                  Limpar busca
                </Button>
              )}
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const product = sortedProducts[virtualRow.index];
                return (
                  <div
                    key={product.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="py-0.5 px-1"
                  >
                    <div
                      onClick={() => handleProductPick(product)}
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:bg-accent/60 hover:border-border cursor-pointer transition-all duration-200 h-full"
                    >
                      {/* Thumbnail */}
                      <div className="w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0">
                        <img
                          src={product.images?.[0] || '/placeholder.svg'}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <h4 className="font-medium truncate text-sm leading-tight" title={product.name}>
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground font-mono tracking-wide">
                            {product.sku || 'N/A'}
                          </span>
                          {product.colors.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {product.colors.slice(0, 4).map((color, i) => (
                                <div
                                  key={i}
                                  className="w-2.5 h-2.5 rounded-full border border-border/50"
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                />
                              ))}
                              {product.colors.length > 4 && (
                                <span className="text-[9px] text-muted-foreground ml-0.5">+{product.colors.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price + Stock */}
                      <div className="text-right shrink-0 pl-2">
                        <p className="text-sm font-semibold text-primary tabular-nums whitespace-nowrap">
                          {formatCurrency(product.price)}
                        </p>
                        {product.stock > 0 ? (
                          <p className="text-[10px] text-emerald-500 whitespace-nowrap">
                            ⊕ {product.stock >= 1000 ? `${(product.stock / 1000).toFixed(1)}k` : product.stock} un
                          </p>
                        ) : (
                          <p className="text-[10px] text-destructive whitespace-nowrap">
                            △ Sem estoque
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 z-10 transition-opacity duration-200"
          style={{
            opacity: scrollState.bottom ? 1 : 0,
            background: 'linear-gradient(to top, hsl(var(--background)), transparent)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Color Selector Sub-component ────────────────────────────────────

function ColorSelector({
  product,
  onSelect,
  onBack,
}: {
  product: Product;
  onSelect: (variant: ExternalVariantStock | null) => void;
  onBack: () => void;
}) {
  const { data: variants, isLoading } = useExternalVariantStock(product.id);

  const sortedVariants = useMemo(() => {
    if (!variants) return [];
    return [...variants].sort((a, b) => {
      const aStock = a.stock_quantity ?? 0;
      const bStock = b.stock_quantity ?? 0;
      if (aStock > 0 && bStock === 0) return -1;
      if (aStock === 0 && bStock > 0) return 1;
      return (a.color_name ?? '').localeCompare(b.color_name ?? '');
    });
  }, [variants]);

  const totalStock = useMemo(() => {
    return sortedVariants.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0);
  }, [sortedVariants]);

  const formatStock = (qty: number) => {
    if (qty >= 1000) return `${(qty / 1000).toFixed(1)}k`;
    return qty.toString();
  };

  // No variants: auto-select without color
  if (!isLoading && (!variants || variants.length === 0)) {
    // Use effect-like behavior: call onSelect(null) after render
    setTimeout(() => onSelect(null), 0);
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card animate-pulse">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <Package className="h-3 w-3" />
          {formatStock(totalStock)} total
        </Badge>
      </div>

      {/* No color option */}
      <button
        onClick={() => onSelect(null)}
        className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-left text-sm text-muted-foreground"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 via-green-400 to-blue-400 border border-border shrink-0" />
        <span>Adicionar sem cor específica</span>
      </button>

      {/* Color grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
        {sortedVariants.map((variant) => {
          const stock = variant.stock_quantity ?? 0;
          const isOutOfStock = stock === 0;
          const isLowStock = stock > 0 && stock < 100;

          return (
            <button
              key={variant.id}
              onClick={() => onSelect(variant)}
              className={cn(
                'relative flex items-center gap-2.5 p-3 rounded-lg border transition-all text-left',
                'hover:border-primary/50 hover:bg-accent',
                isOutOfStock
                  ? 'opacity-60 border-border bg-muted/30'
                  : 'border-border bg-card'
              )}
            >
              {variant.selected_thumbnail ? (
                <img
                  src={`${variant.selected_thumbnail}/thumbnail`}
                  alt={variant.color_name ?? ''}
                  className="w-10 h-10 rounded-md object-cover border border-border shrink-0"
                  onError={(e) => {
                    const t = e.currentTarget;
                    if (t.src.includes('/thumbnail')) {
                      t.src = variant.selected_thumbnail!;
                    } else {
                      t.style.display = 'none';
                    }
                  }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-md border border-border shrink-0"
                  style={{ backgroundColor: variant.color_hex || '#CCC' }}
                />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {variant.color_name || 'Sem nome'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isOutOfStock ? (
                    <span className="text-[10px] text-destructive flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Sem estoque
                    </span>
                  ) : (
                    <span className={cn(
                      'text-[10px] font-medium',
                      isLowStock ? 'text-amber-600' : 'text-green-600'
                    )}>
                      <Package className="h-2.5 w-2.5 inline mr-0.5" />
                      {formatStock(stock)} un
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
