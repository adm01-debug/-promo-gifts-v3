import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Trash2, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRecentlyViewedStore } from "@/stores/useRecentlyViewedStore";
import { useProductsContext } from "@/contexts/ProductsContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

interface RecentlyViewedPopoverProps {
  maxVisible?: number;
}

export function RecentlyViewedPopover({ maxVisible = 50 }: RecentlyViewedPopoverProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const {
    items,
    itemCount,
    isLoading,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
    syncWithCloud
  } = useRecentlyViewedStore();
  const { getProductsByIds } = useProductsContext();

  useEffect(() => {
    if (user?.id) {
      syncWithCloud(user.id);
    }
  }, [user?.id, syncWithCloud]);

  const allProducts = useMemo(
    () => getProductsByIds(items.map((i) => i.productId)),
    [getProductsByIds, items]
  );

  const filteredProducts = useMemo(() => {
    let result = allProducts;
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.id.toLowerCase().includes(query)
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
                size="icon" aria-label="Produtos vistos recentemente"
                className={cn(
                  "relative h-10 w-10 rounded-full border-border/50 transition-colors",
                  itemCount > 0 ? "hover:border-primary/50" : "opacity-60 hover:opacity-100"
                )}
              >
                <Eye className="h-4 w-4" />
                {itemCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-1.5 -right-1.5 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full"
                  >
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">
            Produtos vistos recentemente{itemCount > 0 ? ` (${itemCount})` : ""}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden" sideOffset={8}>
        <div className="flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4 text-primary" />
              <span>Vistos recentemente</span>
              {itemCount > 0 && (
                <Badge variant="secondary" className="h-4.5 px-1.5 text-[10px] bg-primary/10 text-primary border-none">
                  {itemCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mr-1" />}
              {itemCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => clearRecentlyViewed(user?.id)}
                        aria-label="Limpar todo o histórico"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-destructive text-destructive-foreground border-none text-[10px]">
                      Limpar todo o histórico
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Search Bar */}
          {itemCount > 0 && (
            <div className="p-2 border-b border-border/40 bg-background/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar histórico..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                />
                {search && (
                  <button 
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List Area */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {itemCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center mb-2">
                  <Eye className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  Nenhum produto visualizado ainda
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
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
                  <div key={product.id} className="relative group flex flex-col items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative w-full">
                            <button
                              onClick={() => {
                                navigate(`/produto/${product.id}`);
                              }}
                              className={cn(
                                "w-full aspect-square rounded-lg overflow-hidden border border-border/60",
                                "bg-card cursor-pointer hover:border-primary/40 transition-all duration-200",
                                "hover:shadow-sm"
                              )}
                            >
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                loading="lazy" 
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromRecentlyViewed(product.id, user?.id);
                              }}
                              className={cn(
                                "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full",
                                "bg-background shadow-md border border-border text-muted-foreground",
                                "flex items-center justify-center z-10",
                                "opacity-0 group-hover:opacity-100 transition-all duration-200",
                                "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                              )}
                              title="Remover este item"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[150px] text-[10px] py-1 px-2 border-none bg-primary text-primary-foreground">
                          {product.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className="w-full text-[9px] text-muted-foreground text-center mt-1.5 truncate leading-tight font-medium">
                      {product.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {itemCount > 0 && (
            <div className="p-2 bg-muted/10 border-t border-border/40 text-[9px] text-center text-muted-foreground/60">
              Sincronizado com sua conta Lovable Cloud
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
