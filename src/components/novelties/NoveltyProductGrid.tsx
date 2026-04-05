import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Clock, Grid3X3, List, Filter } from "lucide-react";
import { useNoveltiesWithDetails, type NoveltyWithDetails } from "@/hooks/useNovelties";
import { NoveltyBadge } from "@/components/products/NoveltyBadge";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type SortMode = "recent" | "expiring" | "name";

interface NoveltyCardProps {
  product: NoveltyWithDetails;
  viewMode: ViewMode;
  onClick: () => void;
}

function NoveltyCard({ product, viewMode, onClick }: NoveltyCardProps) {
  const daysRemaining = product.days_remaining;

  if (viewMode === "list") {
    return (
      <Card 
        className="group cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200"
        onClick={onClick}
      >
        <CardContent className="p-3 flex items-center gap-3">
          {/* Imagem pequena */}
          <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted overflow-hidden">
            {product.product_image ? (
              <img src={product.product_image} 
                alt={product.product_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <NoveltyBadge daysRemaining={daysRemaining} size="sm" />
              {daysRemaining <= 7 && (
                <Badge variant="outline" className="text-[10px] text-warning border-warning/50">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                  {daysRemaining}d
                </Badge>
              )}
            </div>
            <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {product.product_name}
            </h4>
            {product.product_sku && (
              <p className="text-xs text-muted-foreground">SKU: {product.product_sku}</p>
            )}
          </div>

          {/* Preço */}
          {product.base_price && (
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold">
                R$ {product.base_price.toFixed(2)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/50 hover:border-primary/30 overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Imagem */}
        <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted/30">
          {product.product_image ? (
            <img src={product.product_image} 
              alt={product.product_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/20" />
            </div>
          )}
          
          {/* Badge overlay */}
          <div className="absolute top-2 left-2">
            <NoveltyBadge daysRemaining={daysRemaining} size="sm" />
          </div>

          {/* Dias restantes (se expirando) */}
          {daysRemaining <= 7 && (
            <div className="absolute top-2 right-2">
              <Badge 
                variant="secondary" 
                className="bg-warning text-warning-foreground text-[10px] px-1.5"
              >
                <Clock className="h-2.5 w-2.5 mr-0.5" />
                {daysRemaining}d
              </Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5">
          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
            {product.product_name}
          </h4>
          
          <div className="flex items-center justify-between gap-2">
            {product.product_sku && (
              <p className="text-[11px] text-muted-foreground truncate">
                {product.product_sku}
              </p>
            )}
            {product.category_name && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                {product.category_name}
              </Badge>
            )}
          </div>

          {product.base_price && (
            <p className="text-sm font-semibold text-primary">
              R$ {product.base_price.toFixed(2)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NoveltyCardSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Skeleton className="aspect-square" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoveltyProductGrid() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  // Usar hook com detalhes para ter days_remaining
  const { data: novelties, isLoading, error } = useNoveltiesWithDetails({ limit: 100 });

  const products = novelties || [];

  // Ordenar produtos
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortMode) {
      case "expiring":
        return (a.days_remaining || 30) - (b.days_remaining || 30);
      case "name":
        return (a.product_name || "").localeCompare(b.product_name || "", 'pt-BR');
      case "recent":
      default:
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
    }
  });

  const handleProductClick = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  if (error) {
    console.error('Erro ao carregar novidades:', error);
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            Produtos Novidade
            <Badge variant="secondary" className="text-xs">
              {products.length}
            </Badge>
          </CardTitle>

          {/* Controles */}
          <div className="flex items-center gap-2">
            {/* Ordenação */}
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="expiring">Expirando</SelectItem>
                <SelectItem value="name">Nome A-Z</SelectItem>
              </SelectContent>
            </Select>

            {/* Toggle view mode */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className={cn(
            viewMode === "grid" 
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
              : "space-y-3"
          )}>
            {Array.from({ length: 8 }).map((_, i) => (
              <NoveltyCardSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className={cn(
            viewMode === "grid" 
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
              : "space-y-3"
          )}>
            {sortedProducts.map((product, index) => (
              <div 
                key={product.novelty_id}
                className="stagger-item"
                style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
              >
                <NoveltyCard
                  product={product}
                  viewMode={viewMode}
                  onClick={() => handleProductClick(product.product_id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Nenhuma novidade encontrada
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Produtos novos aparecerão aqui automaticamente
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
