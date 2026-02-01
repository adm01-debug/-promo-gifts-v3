import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Heart,
  Package,
  Truck,
  Shield,
  Tag,
  Layers,
  Sparkles,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProductGallery } from "@/components/products/ProductGallery";
import { KitComposition } from "@/components/products/KitComposition";
import { ProductCategoryBadges } from "@/components/products/ProductCategoryBadges";
import { ShareActions } from "@/components/products/ShareActions";
import { RelatedProducts, RecommendedProducts } from "@/components/products/RelatedProducts";
import { ProductCustomizationOptions } from "@/components/products/ProductCustomizationOptions";
import { ProductPersonalizationRules } from "@/components/products/ProductPersonalizationRules";
import { ProductIntelligence } from "@/components/products/ProductIntelligence";
import { ProductDimensions } from "@/components/products/ProductDimensions";
import { SupplierComparisonModal } from "@/components/compare/SupplierComparisonModal";
import { InlinePriceCalculator } from "@/components/products/InlinePriceCalculator";
import { ProductInfoBar } from "@/components/products/ProductInfoBar";
import { FutureStockModal } from "@/components/products/FutureStockModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useProductAnalytics } from "@/hooks/useProductAnalytics";
import { cn } from "@/lib/utils";
import { useProduct, type Product } from "@/hooks/useProducts";

type ProductVariation = any;
type KitItem = any;
import { DynamicBreadcrumbs } from "@/components/navigation/DynamicBreadcrumbs";
import { FadeInView, SlideIn, HoverCard } from "@/components/common/MicroInteractions";
import { GlassCard } from "@/components/common/GlassElements";
import { EmptyState } from "@/components/common/EmptyState";
import { PopularityBadge, LowStockAlert, TrustBadgesRow } from "@/components/common/SocialProof";
import { FloatingCompareBar } from "@/components/compare/FloatingCompareBar";
import { useRecentlyViewedContext } from "@/contexts/RecentlyViewedContext";
import { useProductsContext } from "@/contexts/ProductsContext";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackProductView } = useProductAnalytics();

  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [selectedKitItems, setSelectedKitItems] = useState<KitItem[]>([]);
  const [supplierCompareOpen, setSupplierCompareOpen] = useState(false);
  const [futureStockOpen, setFutureStockOpen] = useState(false);
  const { addToRecentlyViewed } = useRecentlyViewedContext();
  const { products: allProducts } = useProductsContext();

  // Buscar produto no banco (mesma fonte da vitrine)
  const { data: product, isLoading } = useProduct(id || "");

  // Track product view and add to recently viewed
  useEffect(() => {
    if (product) {
      trackProductView({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        viewType: "detail",
      });
      addToRecentlyViewed(product.id);
    }
  }, [product, trackProductView, addToRecentlyViewed]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Carregando produto…</div>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <EmptyState
          variant="products"
          title="Produto não encontrado"
          description="O produto que você está procurando não existe ou foi removido do catálogo."
          action={{
            label: "Voltar para Vitrine",
            onClick: () => navigate("/"),
          }}
        />
      </MainLayout>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getStockStatusInfo = (status: string) => {
    switch (status) {
      case "in-stock":
        return { label: "Em estoque", class: "bg-success/10 text-success border-success/20" };
      case "low-stock":
        return { label: "Estoque baixo", class: "bg-warning/10 text-warning border-warning/20" };
      case "out-of-stock":
        return { label: "Sem estoque", class: "bg-destructive/10 text-destructive border-destructive/20" };
      default:
        return { label: "Consultar", class: "bg-muted text-muted-foreground" };
    }
  };

  const minQuantity = product.minQuantity || 1;
  const stockInfo = getStockStatusInfo(product.stockStatus);

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos",
      description: product.name,
    });
  };

  // Quando nenhuma variação selecionada, mostrar imagens gerais do produto
  // Quando variação selecionada, a galeria cuida de mostrar as mídias da cor
  const displayImages = product.images;

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Dynamic Breadcrumbs */}
        <DynamicBreadcrumbs />

        {/* Social Proof & Stock Alerts */}
        <div className="flex flex-wrap items-center gap-3">
          {product.featured && <PopularityBadge variant="trending" />}
          {product.stockStatus === "low-stock" && (
            <LowStockAlert quantity={product.stock} />
          )}
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Left column - Gallery */}
          <div className="space-y-6" style={{ animationDelay: '100ms' }}>
            <ProductGallery
              images={displayImages}
              video={product.video}
              productName={product.name}
              colors={product.variations?.map((variation) => ({
                name: variation.color.name,
                hex: variation.color.hex,
                sku: variation.sku,
                stock: variation.stock,
                image: variation.image,
                images: variation.images,
                videos: variation.videos,
              }))}
              onColorSelect={(index) => {
                if (index === -1) {
                  setSelectedVariation(null); // Voltar para visualização geral
                } else if (product.variations?.[index]) {
                  setSelectedVariation(product.variations[index]);
                }
              }}
              selectedColorIndex={product.variations?.findIndex(v => v.id === selectedVariation?.id) ?? -1}
            />
          </div>

          {/* Right column - Info */}
          <div className="space-y-6" style={{ animationDelay: '200ms' }}>
            {/* Header */}
            <div className="space-y-4">
              {/* Category/Group Badges - Ícones das categorias */}
              <ProductCategoryBadges 
                category={product.category} 
                groups={product.groups}
              />

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {product.featured && (
                  <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground px-3 py-1 shadow-lg">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Destaque
                  </Badge>
                )}
                {product.newArrival && (
                  <Badge className="bg-gradient-to-r from-info to-info/80 text-info-foreground px-3 py-1">
                    Novidade
                  </Badge>
                )}
                {product.onSale && (
                  <Badge className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground px-3 py-1">
                    Promoção
                  </Badge>
                )}
                {product.isKit && (
                  <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground px-3 py-1">
                    <Layers className="h-3.5 w-3.5 mr-1.5" />
                    KIT
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                {product.name}
              </h1>

              {/* SKU, Supplier, Estoque Futuro, Comparar Fornecedores */}
              <ProductInfoBar
                sku={selectedVariation?.sku || product.sku}
                supplierName={product.supplier.name}
                onOpenFutureStock={() => setFutureStockOpen(true)}
                onOpenSupplierComparison={() => setSupplierCompareOpen(true)}
              />
            </div>

            {/* Price & Stock Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-secondary/20 border border-border p-6 shadow-lg">
              {/* Decorative gradient */}
              {product.featured && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
              )}
              
              <div className="relative space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      A partir de
                    </p>
                    <span className="text-4xl font-display font-bold text-foreground">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-lg text-muted-foreground ml-1">/un</span>
                  </div>
                  {/* Estoque granular por cor */}
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {product.variations && product.variations.length > 0 ? (
                      <>
                        {product.variations.slice(0, 5).map((variation) => {
                          const isSelected = selectedVariation?.id === variation.id;
                          return (
                            <button
                              key={variation.id}
                              onClick={() => setSelectedVariation(variation)}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
                                !isSelected && "bg-secondary/50 border border-border hover:bg-secondary",
                                variation.stock === 0 && "opacity-50"
                              )}
                              style={isSelected ? {
                                backgroundColor: `${variation.color.hex}20`,
                                border: `1px solid ${variation.color.hex}`,
                                boxShadow: `0 0 0 2px ${variation.color.hex}30`
                              } : undefined}
                            >
                              <div
                                className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                                style={{ backgroundColor: variation.color.hex }}
                              />
                              <span className={cn(
                                variation.stock === 0 ? "text-destructive" : variation.stock < 100 ? "text-warning" : "text-foreground"
                              )}>
                                {variation.stock.toLocaleString("pt-BR")}
                              </span>
                            </button>
                          );
                        })}
                        {product.variations.length > 5 && (
                          <span className="text-xs text-muted-foreground">+{product.variations.length - 5}</span>
                        )}
                      </>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border",
                        stockInfo.class
                      )}>
                        <Package className="h-4 w-4" />
                        {product.stock.toLocaleString("pt-BR")} un.
                      </span>
                    )}
                  </div>
                </div>

                <Separator className="bg-border/50" />

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="h-4 w-4 text-primary" />
                    </div>
                    <span>Mín. {minQuantity} un.</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-info" />
                    </div>
                    <span>Consultar prazo</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-success" />
                    </div>
                    <span>Garantia</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Descrição
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Materials */}
            {product.materials && product.materials.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Materiais
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.materials.map((material) => (
                    <Badge 
                      key={material} 
                      variant="secondary"
                      className="px-4 py-1.5 text-sm rounded-full"
                    >
                      {material}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Dimensions & Weight */}
            <ProductDimensions dimensions={product.dimensions} />

            {/* Inline Price Calculator */}
            <InlinePriceCalculator
              productId={product.id}
              productName={product.name}
              basePrice={product.price}
              minQuantity={product.minQuantity || 1}
            />

            {/* Variações removidas daqui - agora estão na galeria */}

            {/* Kit Composition */}
            {product.isKit && product.kitItems && (
              <KitComposition
                items={product.kitItems}
                onSelectItems={setSelectedKitItems}
              />
            )}

            {/* Customization Options */}
            <ProductCustomizationOptions 
              productId={id || ""} 
              productSku={product.sku} 
            />

            {/* Personalization Rules */}
            <ProductPersonalizationRules 
              productId={id || ""} 
              productSku={product.sku}
              productName={product.name}
            />

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <ShareActions product={product} />
              
              <Button
                variant="outline"
                size="lg"
                onClick={handleFavorite}
                className={cn(
                  "rounded-full px-6 transition-all duration-300",
                  isFavorite && "bg-destructive/10 border-destructive/50 hover:bg-destructive/20"
                )}
              >
                <Heart
                  className={cn(
                    "h-5 w-5 mr-2 transition-all duration-300",
                    isFavorite && "fill-destructive text-destructive scale-110"
                  )}
                />
                {isFavorite ? "Favoritado" : "Favoritar"}
              </Button>
            </div>

            {/* Tags */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Indicado para
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.publicoAlvo.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="px-3 py-1.5 text-sm rounded-full hover:bg-secondary transition-colors cursor-default"
                  >
                    👤 {tag}
                  </Badge>
                ))}
                {product.tags.datasComemorativas.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="px-3 py-1.5 text-sm rounded-full hover:bg-secondary transition-colors cursor-default"
                  >
                    📅 {tag}
                  </Badge>
                ))}
                {product.tags.endomarketing.slice(0, 3).map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="px-3 py-1.5 text-sm rounded-full hover:bg-secondary transition-colors cursor-default"
                  >
                    🎯 {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Product Intelligence */}
        <div className="pt-8 border-t border-border">
          <ProductIntelligence 
            productId={product.id}
            productSku={product.sku}
            productName={product.name}
          />
        </div>

        {/* Related & Recommended Products */}
        <div className="space-y-12 pt-8 border-t border-border">
          <RelatedProducts 
            currentProduct={product} 
            allProducts={allProducts} 
            maxItems={4} 
          />
          
          <RecommendedProducts 
            currentProduct={product} 
            allProducts={allProducts} 
            maxItems={4} 
          />
        </div>

        {/* Supplier Comparison Modal */}
        <SupplierComparisonModal
          productId={id || ""}
          open={supplierCompareOpen}
          onOpenChange={setSupplierCompareOpen}
        />

        {/* Future Stock Modal */}
        <FutureStockModal
          open={futureStockOpen}
          onOpenChange={setFutureStockOpen}
          productId={product.id}
          productName={product.name}
          productSku={product.sku}
          colors={product.colors || []}
        />

        {/* Trust Badges */}
        <TrustBadgesRow className="pt-8" />
      </div>

      {/* Floating Compare Bar */}
      <FloatingCompareBar />
    </MainLayout>
  );
}
