import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Trash2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCollectionsContext } from "@/contexts/CollectionsContext";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { toast } from "sonner";

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    collections,
    getCollectionProducts,
    removeProductFromCollection,
  } = useCollectionsContext();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonStore();

  const collection = useMemo(() => {
    return collections.find((c) => c.id === id);
  }, [collections, id]);

  const products = useMemo(() => {
    if (!id) return [];
    return getCollectionProducts(id);
  }, [id, getCollectionProducts]);

  if (!collection) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-4">Coleção não encontrada</h2>
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
    <MainLayout>
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
              products={products}
              onProductClick={(productId) => navigate(`/produto/${productId}`)}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              isInCompare={isInCompare}
              onToggleCompare={toggleCompare}
              canAddToCompare={canAddMore}
            />

            {/* Quick remove buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveFromCollection(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
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
  );
}
