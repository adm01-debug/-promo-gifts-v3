import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Monitor, Package, Trash2, Search, SortAsc,
  FileText, ArrowUpDown, Clock,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollectionsContext } from "@/contexts/CollectionsContext";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortOption = "name" | "sku" | "added";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("added");

  const collection = useMemo(() => {
    return collections.find((c) => c.id === id);
  }, [collections, id]);

  const products = useMemo(() => {
    if (!id) return [];
    return getCollectionProducts(id);
  }, [id, getCollectionProducts]);

  const variantMap = useMemo(() => {
    if (!id) return new Map();
    const items = getCollectionProductItems(id);
    const map = new Map<
      string,
      { color_name?: string | null; color_hex?: string | null; thumbnail?: string | null }
    >();
    items.forEach((item) => {
      if (item.variant) {
        map.set(item.productId, item.variant);
      }
    });
    return map;
  }, [id, getCollectionProductItems]);

  // Filter + sort
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "sku") {
      filtered = [...filtered].sort((a, b) => (a.sku || "").localeCompare(b.sku || ""));
    }
    return filtered;
  }, [products, searchQuery, sortBy]);

  const productsWithVariant = useMemo(() => {
    return filteredProducts.map((product) => {
      const variant = variantMap.get(product.id);
      if (variant?.thumbnail) {
        return { ...product, images: [variant.thumbnail, ...product.images] };
      }
      return product;
    });
  }, [filteredProducts, variantMap]);

  const updatedAgo = useMemo(() => {
    if (!collection?.updatedAt) return null;
    try {
      return formatDistanceToNow(new Date(collection.updatedAt), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return null;
    }
  }, [collection?.updatedAt]);

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

  const handleCreateQuote = () => {
    // Navigate to quotes page with products pre-loaded via URL state
    const productIds = products.map((p) => p.id);
    navigate("/orcamentos/novo", {
      state: {
        fromCollection: collection.name,
        preloadProducts: products.map((p) => ({
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          product_image_url: p.images?.[0] || null,
          unit_price: p.price || 0,
          quantity: 1,
          color_name: variantMap.get(p.id)?.color_name || null,
          color_hex: variantMap.get(p.id)?.color_hex || null,
        })),
      },
    });
  };

  const sortLabel = sortBy === "name" ? "Nome" : sortBy === "sku" ? "SKU" : "Adicionados";

  return (
    <>
      <MainLayout>
        <PageSEO
          title={`Coleção: ${collection.name}`}
          description={`Explore os produtos da coleção ${collection.name}.`}
          path={`/colecoes/${id}`}
          noIndex
        />
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col gap-3">
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
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl shrink-0 border-[1.5px] border-primary/20"
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
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    <Package className="h-3 w-3 mr-1" />
                    {products.length} produtos
                  </Badge>
                  {updatedAgo && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Atualizado {updatedAgo}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {products.length > 0 && (
                  <>
                    <Button
                      variant="default"
                      className="gap-2"
                      onClick={handleCreateQuote}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Criar Orçamento</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setShowPresentation(true)}
                    >
                      <Monitor className="h-4 w-4" />
                      <span className="hidden sm:inline">Apresentar</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search + Sort toolbar */}
          {products.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na coleção..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {sortLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("added")}>
                    Ordem de adição
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    Nome A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("sku")}>
                    SKU
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length === products.length
                  ? `${products.length} produtos`
                  : `${filteredProducts.length} de ${products.length}`}
              </p>
            </div>
          )}

          {/* Products */}
          {products.length > 0 ? (
            <div className="space-y-4">
              {filteredProducts.length > 0 ? (
                <ProductGrid
                  products={productsWithVariant}
                  onProductClick={(productId) => navigate(`/produto/${productId}`)}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                  isInCompare={isInCompare}
                  onToggleCompare={toggleCompare}
                  canAddToCompare={canAddMore}
                />
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-display text-lg font-semibold mb-1">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Nenhum produto corresponde a "{searchQuery}"
                  </p>
                </div>
              )}

              {/* Quick remove list */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Gerenciar produtos ({products.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {products.map((product) => {
                    const variant = variantMap.get(product.id);
                    const displayImage = variant?.thumbnail || product.images[0];
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-3 rounded-xl border-[1.5px] border-primary/15 bg-card hover:border-primary/30 transition-colors"
                      >
                        <img
                          src={displayImage}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                          loading="lazy"
                        />
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
                          size="icon"
                          aria-label="Remover da coleção"
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
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                Coleção vazia
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Adicione produtos a esta coleção clicando no ícone de pasta nos cards de produto
              </p>
              <Button onClick={() => navigate("/")}>Explorar produtos</Button>
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
              subtitle:
                [
                  p.sku ? `SKU: ${p.sku}` : null,
                  variant?.color_name ? `Cor: ${variant.color_name}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ") || undefined,
              imageUrl: variant?.thumbnail || p.images?.[0] || null,
              badge: p.brand || null,
            };
          })}
        />
      )}
    </>
  );
}
