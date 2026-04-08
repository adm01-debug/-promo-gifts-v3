import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useProductsContext } from "@/contexts/ProductsContext";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Trash2, Share2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { FadeInView, HoverCard, StaggerList } from "@/components/common/MicroInteractions";
import { DataCard, DataCardGrid, MiniStatCard } from "@/components/ui/DataCard";
import { Package, Layers, TrendingDown, TrendingUp } from "lucide-react";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { favorites, clearFavorites, favoriteCount, toggleFavorite } =
    useFavoritesStore();
  const { getProductsByIds } = useProductsContext();

  const favoriteProducts = useMemo(
    () => getProductsByIds(favorites.map((f) => f.productId)),
    [getProductsByIds, favorites]
  );

  // Build a map of productId -> variant info for quick lookup
  const variantMap = useMemo(() => {
    const map = new Map<string, FavoriteVariantInfo>();
    favorites.forEach((f) => {
      if (f.variant) map.set(f.productId, f.variant);
    });
    return map;
  }, [favorites]);

  // Create products with variant thumbnail as primary image
  const productsWithVariant = useMemo(() => {
    return favoriteProducts.map((product) => {
      const variant = variantMap.get(product.id);
      if (variant?.thumbnail) {
        return {
          ...product,
          images: [variant.thumbnail, ...(product.images || [])],
        };
      }
      return product;
    });
  }, [favoriteProducts, variantMap]);

  const handleClearAll = () => {
    clearFavorites();
    toast.success("Todos os favoritos foram removidos");
  };

  const handleShareAll = () => {
    const productNames = favoriteProducts.map((p) => `• ${p.name}`).join("\n");
    const message = `Meus produtos favoritos:\n\n${productNames}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Meus Favoritos - PROMO BRINDES",
        text: message,
      });
    } else {
      navigator.clipboard.writeText(message);
      toast.success("Lista copiada para a área de transferência!");
    }
  };

  const handleRemoveFavorite = (productId: string, productName: string) => {
    toggleFavorite(productId);
    toast.success(`"${productName}" removido dos favoritos`);
  };

  return (
    <MainLayout>
      <PageSEO title="Favoritos" description="Seus produtos favoritos salvos para referência rápida." path="/favoritos" />
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-destructive fill-destructive" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                Meus Favoritos
              </h1>
              <p className="text-muted-foreground">
                {favoriteCount} {favoriteCount === 1 ? "produto salvo" : "produtos salvos"}
              </p>
            </div>
          </div>

          {favoriteProducts.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleShareAll}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar Lista
              </Button>

              <DeleteConfirmDialog
                trigger={
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Tudo
                  </Button>
                }
                title="Limpar todos os favoritos?"
                description={`Esta ação irá remover todos os ${favoriteCount} produtos da sua lista de favoritos. Esta ação não pode ser desfeita.`}
                onConfirm={handleClearAll}
                itemName="favoritos"
              />
            </div>
          )}
        </div>

        {/* Products grid */}
        {favoriteProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {favoriteProducts.map((product, index) => (
              <div
                key={product.id}
                className="animate-fade-in relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ProductCard
                  product={product}
                  onClick={() => navigate(`/produto/${product.id}`)}
                  onFavorite={() => handleRemoveFavorite(product.id, product.name)}
                />
                {/* Overlay badge showing it's favorited */}
                <div className="absolute top-3 right-3 z-10">
                  <Button
                    variant="secondary"
                    size="icon" aria-label="Favoritar"
                    className="h-8 w-8 bg-card/90 backdrop-blur-sm hover:bg-destructive/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(product.id, product.name);
                    }}
                  >
                    <Heart className="h-4 w-4 fill-destructive text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            variant="favorites"
            title="Nenhum favorito ainda"
            description="Navegue pelos produtos e clique no ícone de coração para adicionar produtos à sua lista de favoritos."
            action={{
              label: "Explorar Produtos",
              onClick: () => navigate("/"),
            }}
          />
        )}

        {/* Quick stats using DataCard */}
        {favoriteProducts.length > 0 && (
          <DataCardGrid columns={4}>
            <DataCard
              icon={Package}
              value={favoriteProducts.length}
              label="Produtos"
              variant="primary"
              size="sm"
            />
            <DataCard
              icon={Layers}
              value={new Set(favoriteProducts.map((p) => p.category.id)).size}
              label="Categorias"
              size="sm"
            />
            <DataCard
              icon={TrendingDown}
              value={new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(Math.min(...favoriteProducts.map((p) => p.price)))}
              label="Menor preço"
              variant="success"
              size="sm"
            />
            <DataCard
              icon={TrendingUp}
              value={new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(Math.max(...favoriteProducts.map((p) => p.price)))}
              label="Maior preço"
              variant="primary"
              size="sm"
            />
          </DataCardGrid>
        )}
      </div>
    </MainLayout>
  );
}