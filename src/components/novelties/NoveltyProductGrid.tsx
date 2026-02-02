import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Clock, Grid3X3, List, Filter } from "lucide-react";
import { useNoveltyProducts, useNoveltiesWithDetails } from "@/hooks/useNovelties";
import { NoveltyBadge } from "@/components/products/NoveltyBadge";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type SortMode = "recent" | "expiring" | "name";

interface NoveltyCardProps {
  product: {
    id?: string;
    product_id?: string;
    name?: string;
    product_name?: string;
    sku?: string;
    product_sku?: string | null;
    primary_image_url?: string | null;
    product_image?: string | null;
    base_price?: number | null;
    category_name?: string | null;
    days_remaining?: number;
  };
  viewMode: ViewMode;
  onClick: () => void;
}

function NoveltyCard({ product, viewMode, onClick }: NoveltyCardProps) {
  const productId = product.id || product.product_id;
  const productName = product.name || product.product_name || "Produto";
  const productSku = product.sku || product.product_sku;
  const productImage = product.primary_image_url || product.product_image;
  const daysRemaining = product.days_remaining || 30;

  if (viewMode === "list") {
    return (
      <Card 
        className="group cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200"
        onClick={onClick}
      >
        <CardContent className="p-3 flex items-center gap-3">
          {/* Imagem pequena */}
          <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted overflow-hidden">
            {productImage ? (
              <img 
                src={productImage} 
                alt={productName}
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
              {productName}
            </h4>
            {productSku && (
              <p className="text-xs text-muted-foreground">SKU: {productSku}</p>
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
          {productImage ? (
            <img 
              src={productImage} 
              alt={productName}
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
            {productName}
          </h4>
          
          <div className="flex items-center justify-between gap-2">
            {productSku && (
              <p className="text-[11px] text-muted-foreground truncate">
                {productSku}
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
  const [limit, setLimit] = useState(24);

  // Usar hook com detalhes para ter days_remaining
  const { data: noveltiesDetails, isLoading: loadingDetails } = useNoveltiesWithDetails({ limit: 100 });
  // Fallback para produtos simples
  const { data: noveltyProducts, isLoading: loadingProducts } = useNoveltyProducts({ limit });

  const isLoading = loadingDetails && loadingProducts;
  
  // Preferir dados com detalhes, fallback para produtos simples
  const products = noveltiesDetails?.length ? noveltiesDetails : noveltyProducts || [];

  // Ordenar produtos
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortMode) {
      case "expiring":
        const daysA = 'days_remaining' in a ? a.days_remaining : 30;
        const daysB = 'days_remaining' in b ? b.days_remaining : 30;
        return (daysA || 30) - (daysB || 30);
      case "name":
        const nameA = ('name' in a ? a.name : a.product_name) || "";
        const nameB = ('name' in b ? b.name : b.product_name) || "";
        return nameA.localeCompare(nameB, 'pt-BR');
      case "recent":
      default:
        return 0; // Já vem ordenado por data
    }
  });

  const handleProductClick = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 24);
  };

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
          <>
            <div className={cn(
              viewMode === "grid" 
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
                : "space-y-3"
            )}>
              {sortedProducts.map((product, index) => (
                <div 
                  key={product.product_id || ('id' in product ? product.id : index)}
                  className="stagger-item"
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                >
                  <NoveltyCard
                    product={product}
                    viewMode={viewMode}
                    onClick={() => handleProductClick(product.product_id || ('id' in product ? product.id! : ""))}
                  />
                </div>
              ))}
            </div>

            {/* Load more */}
            {sortedProducts.length >= limit && (
              <div className="flex justify-center mt-6">
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore}
                  className="gap-2"
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Nenhuma novidade encontrada
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
