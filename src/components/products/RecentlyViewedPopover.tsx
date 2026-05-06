import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, X, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRecentlyViewedStore } from '@/stores/useRecentlyViewedStore';
import { useProductsContext } from '@/contexts/ProductsContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

interface RecentlyViewedPopoverProps {
  maxVisible?: number;
}

export function RecentlyViewedPopover({ maxVisible = 50 }: RecentlyViewedPopoverProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const {
    items,
    itemCount,
    isLoading,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
    syncWithCloud,
  } = useRecentlyViewedStore();
  const { getProductsByIds } = useProductsContext();

  useEffect(() => {
    if (user?.id) {
      syncWithCloud(user.id);
    }
  }, [user?.id, syncWithCloud]);

  const allProducts = useMemo(
    () => getProductsByIds(items.map((i) => i.productId)),
    [getProductsByIds, items],
  );

  const filteredProducts = useMemo(() => {
    let result = allProducts;
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query),
      );
    }
    return result.slice(0, maxVisible);
  }, [allProducts, search, maxVisible]);

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Produtos vistos recentemente"
                className={cn(
                  'relative h-10 w-10 rounded-full border-border/50 transition-colors',
                  itemCount > 0 ? 'hover:border-primary/50' : 'opacity-60 hover:opacity-100',
                )}
              >
                <Eye className="h-4 w-4" />
                {itemCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary p-0 text-[10px] font-bold text-primary-foreground"
                  >
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
            Produtos vistos recentemente{itemCount > 0 ? ` (${itemCount})` : ''}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" className="w-80 overflow-hidden p-0" sideOffset={8}>
        <div className="flex max-h-[480px] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4 text-primary" />
              <span>Vistos recentemente</span>
              {itemCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4.5 border-none bg-primary/10 px-1.5 text-[10px] text-primary"
                >
                  {itemCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin text-muted-foreground" />}
              {itemCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => clearRecentlyViewed(user?.id)}
                        aria-label="Limpar todo o histórico"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="border-none bg-destructive text-[10px] text-destructive-foreground">
                      Limpar todo o histórico
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Search Bar */}
          {itemCount > 0 && (
            <div className="border-b border-border/40 bg-background/50 p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filtrar histórico..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 border-none bg-muted/40 pl-8 text-xs focus-visible:ring-1 focus-visible:ring-primary/20"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List Area */}
          <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
            {itemCount === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted/40">
                  <Eye className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  Nenhum produto visualizado ainda
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground/60">
                  Seus itens aparecerão aqui conforme você navega.
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-muted-foreground">Nenhum resultado para "{search}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 pb-2" data-testid="recently-viewed-grid">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="group relative flex flex-col items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative w-full">
                            <button
                              onClick={() => {
                                navigate(`/produto/${product.id}`);
                              }}
                              className={cn(
                                'aspect-square w-full overflow-hidden rounded-xl border border-border/60',
                                'cursor-pointer bg-card transition-all duration-200 hover:border-primary/40',
                                'hover:shadow-sm',
                              )}
                            >
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromRecentlyViewed(product.id, user?.id);
                              }}
                              className={cn(
                                'absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full',
                                'border border-border bg-background text-muted-foreground shadow-md',
                                'z-10 flex items-center justify-center',
                                'opacity-0 transition-all duration-200 group-hover:opacity-100',
                                'hover:border-destructive hover:bg-destructive hover:text-destructive-foreground',
                              )}
                              title="Remover este item"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="max-w-[150px] border-none bg-primary px-2 py-1 text-[10px] text-primary-foreground"
                        >
                          {product.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className="mt-1.5 w-full truncate text-center text-[9px] font-medium leading-tight text-muted-foreground">
                      {product.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {itemCount > 0 && (
            <div className="border-t border-border/40 bg-muted/10 p-2 text-center text-[9px] text-muted-foreground/60">
              Sincronizado com sua conta Lovable Cloud
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
