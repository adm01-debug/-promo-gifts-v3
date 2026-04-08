import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Monitor, Package, Trash2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCollectionsContext } from "@/contexts/CollectionsContext";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { PresentationMode, type PresentationSlide } from "@/components/presentation/PresentationMode";
import { toast } from "sonner";

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    collections,
    getCollectionProducts,
    getCollectionProductItems,
    removeProductFromCollection,
  } = useCollectionsContext();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonStore();
  const [showPresentation, setShowPresentation] = useState(false);

  const collection = useMemo(() => {
    return collections.find((c) => c.id === id);
  }, [collections, id]);

  const products = useMemo(() => {
    if (!id) return [];
    return getCollectionProducts(id);
  }, [id, getCollectionProducts]);

  // Map productId -> variant info for display
  const variantMap = useMemo(() => {
    if (!id) return new Map();
    const items = getCollectionProductItems(id);
    const map = new Map<string, { color_name?: string | null; color_hex?: string | null; thumbnail?: string | null }>();
    items.forEach((item) => {
      if (item.variant) {
        map.set(item.productId, item.variant);
      }
    });
    return map;
  }, [id, getCollectionProductItems]);

  // Products with variant thumbnails injected
  const productsWithVariant = useMemo(() => {
    return products.map((product) => {
      const variant = variantMap.get(product.id);
      if (variant?.thumbnail) {
        return { ...product, images: [variant.thumbnail, ...product.images] };
      }
      return product;
    });
  }, [products, variantMap]);

  if (!collection) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <h2 className="font-display text-xl font-semibold mb-4">Coleção não encontrada</h2>
          <Button onClick={() => navigate("/colecoes")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para coleções
          </Button>
        </div>
      </MainLayout>
    );
  }

  const handleRemoveFromCollection = (productId: string) => {
    removeProductFromCollection(collection.id, productId);
    toast.success("Produto removido da coleção");
  };

  return (
    <>
    <MainLayout>
      <PageSEO title={`Coleção: ${collection.name}`} description={`Explore os produtos da coleção ${collection.name}.`} path={`/colecoes/${id}`} noIndex />
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            className="w-fit -ml-2"
            onClick={() => navigate("/colecoes")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para coleções
          </Button>

          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ backgroundColor: `${collection.color}20` }}
            >
              {collection.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-muted-foreground mt-1">{collection.description}</p>
              )}
              <Badge variant="secondary" className="mt-2">
                <Package className="h-3 w-3 mr-1" />
                {products.length} produtos
              </Badge>
            </div>
            {products.length > 0 && (
              <Button variant="outline" className="shrink-0 gap-2" onClick={() => setShowPresentation(true)}>
                <Monitor className="h-4 w-4" />
                Apresentar
              </Button>
            )}
          </div>
        </div>

        {/* Products */}
        {products.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Clique no botão de lixeira para remover um produto desta coleção
              </p>
            </div>
            
            <ProductGrid
              products={productsWithVariant}
              onProductClick={(productId) => navigate(`/produto/${productId}`)}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              isInCompare={isInCompare}
              onToggleCompare={toggleCompare}
              canAddToCompare={canAddMore}
            />

            {/* Quick remove buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
              {products.map((product) => {
                const variant = variantMap.get(product.id);
                const displayImage = variant?.thumbnail || product.images[0];
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <img
                      src={displayImage}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                        {variant?.color_hex && (
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-border"
                              style={{ backgroundColor: variant.color_hex }}
                            />
                            {variant.color_name && (
                              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                                {variant.color_name}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon" aria-label="Excluir"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveFromCollection(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">
              Coleção vazia
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Adicione produtos a esta coleção clicando no ícone de pasta nos cards de produto
            </p>
            <Button onClick={() => navigate("/")}>
              Explorar produtos
            </Button>
          </div>
        )}
      </div>
    </MainLayout>

    {showPresentation && products.length > 0 && (
      <PresentationMode
        title={collection.name}
        subtitle={collection.description || undefined}
        brandName="Promo Brindes"
        onClose={() => setShowPresentation(false)}
        slides={products.map((p) => {
          const variant = variantMap.get(p.id);
          return {
            id: p.id,
            title: p.name,
            subtitle: [
              p.sku ? `SKU: ${p.sku}` : null,
              variant?.color_name ? `Cor: ${variant.color_name}` : null,
            ].filter(Boolean).join(' • ') || undefined,
            imageUrl: variant?.thumbnail || p.images?.[0] || null,
            badge: p.brand || null,
          };
        })}
      />
    )}
    </>
  );
}
