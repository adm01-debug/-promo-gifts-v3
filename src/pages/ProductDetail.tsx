import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getCdnUrl } from "@/utils/image-utils";
import {
  Heart,
  Package,
  Truck,
  Shield,
  Tag,
  Layers,
  Sparkles,
  Palette,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductStickyHeader } from "@/components/products/ProductStickyHeader";
import { ProductSectionNav } from "@/components/products/ProductSectionNav";
import { KitComposition } from "@/components/products/KitComposition";
import { ProductCategoryBadges } from "@/components/products/ProductCategoryBadges";
import { GenderBadge } from "@/components/products/GenderBadge";
import { ShareActions } from "@/components/products/ShareActions";
import { RelatedProducts, RecommendedProducts } from "@/components/products/RelatedProducts";
import { ProductCustomizationOptions } from "@/components/products/ProductCustomizationOptions";
import { ProductPersonalizationRules } from "@/components/products/ProductPersonalizationRules";
import { ProductIntelligence } from "@/components/products/ProductIntelligence";
import { PriceHistoryChart } from "@/components/products/PriceHistoryChart";
import { ProductDimensions } from "@/components/products/ProductDimensions";
import { SupplierComparisonModal } from "@/components/compare/SupplierComparisonModal";
import { InlinePriceCalculator } from "@/components/products/InlinePriceCalculator";
import { ProductInfoBar } from "@/components/products/ProductInfoBar";
import { ProductSizeSelector } from "@/components/products/ProductSizeSelector";
import { VariantGridMatrix } from "@/components/products/VariantGridMatrix";
import { FutureStockModal } from "@/components/products/FutureStockModal";
import { PackagingBadge } from "@/components/products/PackagingBadge";
import { PackagingModal } from "@/components/products/PackagingModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useProductAnalytics } from "@/hooks/useProductAnalytics";
import { cn } from "@/lib/utils";
import { useProduct, useRelatedProducts, type Product } from "@/hooks/useProducts";
import { sortVariationsByColor } from "@/utils/colorSorting";
import { ProductDetailSkeleton } from "@/components/products/ProductDetailSkeleton";

type ProductVariation = any;
import type { KitComponent } from "@/types/product-catalog";
type KitItem = KitComponent;
import { DynamicBreadcrumbs } from "@/components/navigation/DynamicBreadcrumbs";
import { FadeInView, SlideIn, HoverCard } from "@/components/common/MicroInteractions";
import { GlassCard } from "@/components/common/GlassElements";
import { EmptyState } from "@/components/common/EmptyState";
import { PopularityBadge, LowStockAlert, TrustBadgesRow, TrustBadge } from "@/components/common/SocialProof";
import { QuickAddToQuote } from "@/components/products/QuickAddToQuote";
import { FloatingCompareBar } from "@/components/compare/FloatingCompareBar";
import { MobileProductActions } from "@/components/mobile/MobileProductActions";
import { useRecentlyViewedStore } from "@/stores/useRecentlyViewedStore";
import { useProductsContext } from "@/contexts/ProductsContext";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
// useProducts removed - using useRelatedProducts instead

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackProductView } = useProductAnalytics();

  const { isFavorite: isFavoriteCheck, toggleFavorite } = useFavoritesStore();
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedKitItems, setSelectedKitItems] = useState<KitItem[]>([]);
  const [supplierCompareOpen, setSupplierCompareOpen] = useState(false);
  const [futureStockOpen, setFutureStockOpen] = useState(false);
  const [packagingModalOpen, setPackagingModalOpen] = useState(false);
  const { addToRecentlyViewed } = useRecentlyViewedStore();
  const { registerProducts } = useProductsContext();

  // Buscar produto no banco (mesma fonte da vitrine)
  const { data: product, isLoading, isError } = useProduct(id || "");
  
  // Fetch related products (same supplier or category) — lightweight, limited query
  const { data: relatedProductsList = [] } = useRelatedProducts(product, 20);

  // Register related products into lazy cache
  useEffect(() => {
    if (relatedProductsList.length > 0) registerProducts(relatedProductsList);
  }, [relatedProductsList, registerProducts]);

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
        <ProductDetailSkeleton />
      </MainLayout>
    );
  }

  if (isError || !product) {
    return (
      <MainLayout>
        <EmptyState
          variant="products"
          title={isError ? "Erro ao carregar produto" : "Produto não encontrado"}
          description={isError 
            ? "Não foi possível carregar os dados do produto. Tente novamente em alguns instantes."
            : "O produto que você está procurando não existe ou foi removido do catálogo."
          }
          action={{
            label: isError ? "Tentar novamente" : "Voltar para Vitrine",
            onClick: () => isError ? window.location.reload() : navigate("/"),
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

  const isFavorite = id ? isFavoriteCheck(id) : false;

  const handleFavorite = () => {
    if (!id) return;
    toggleFavorite(id);
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
      {/* SEO — Briefing v3: meta tags dinâmicas por produto */}
      <Helmet>
        <title>{product.name} | PromoHub</title>
        <meta name="description" content={product.description || `${product.name} - Brinde Promocional`} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description || `${product.name} - Brinde Promocional`} />
        <meta property="og:image" content={product.og_image_url ? getCdnUrl(product.og_image_url, 'large') : (product.images[0] || '')} />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={product.name} />
        <meta name="twitter:image" content={product.og_image_url ? getCdnUrl(product.og_image_url, 'large') : (product.images[0] || '')} />
      </Helmet>

      {/* Sticky Header — appears on scroll */}
      <ProductStickyHeader
        productId={product.id}
        productName={product.name}
        productSku={product.sku}
        productPrice={product.price}
        productImage={product.images?.[0] || '/placeholder.svg'}
        minQuantity={product.minQuantity || 1}
        isFavorite={isFavorite}
        onToggleFavorite={handleFavorite}
      />

      <div className="space-y-4 md:space-y-8 animate-fade-in pb-20 md:pb-0">
        {/* Breadcrumbs handled by MainLayout PersistentBreadcrumbs */}

        {/* Social Proof & Stock Alerts */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {product.featured && <PopularityBadge variant="trending" />}
          {product.stockStatus === "low-stock" && (
            <LowStockAlert quantity={product.stock} />
          )}
        </div>

        {/* Main content - Single column on mobile */}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-10">
          {/* Left column - Gallery */}
          <div className="space-y-4 md:space-y-6" style={{ animationDelay: '100ms' }}>
            <ProductGallery
              images={displayImages}
              video={product.video}
              productVideos={product.productVideos}
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
          <div className="space-y-4 md:space-y-6" style={{ animationDelay: '200ms' }}>
            {/* Header */}
            <div className="space-y-3 md:space-y-4">
              {/* Category/Group Badges - Ícones das categorias + Link Personalização */}
              <ProductCategoryBadges 
                category={product.category} 
                groups={product.groups}
                productId={product.id}
                productName={product.name}
                productSku={product.sku}
                productPrice={product.price}
                productImageUrl={product.images?.[0]}
                productMinQuantity={product.minQuantity || 1}
              />

              {/* Status Badges - Compact on mobile */}
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {product.featured && (
                  <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground px-2 md:px-3 py-0.5 md:py-1 text-[11px] md:text-sm shadow-lg">
                    <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1" />
                    Destaque
                  </Badge>
                )}
                {product.newArrival && (
                  <Badge className="bg-gradient-to-r from-info to-info/80 text-info-foreground px-2 md:px-3 py-0.5 md:py-1 text-[11px] md:text-sm">
                    Novidade
                  </Badge>
                )}
                {product.onSale && (
                  <Badge className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground px-2 md:px-3 py-0.5 md:py-1 text-[11px] md:text-sm">
                    Promoção
                  </Badge>
                )}
                {product.isKit && (
                  <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground px-2 md:px-3 py-0.5 md:py-1 text-[11px] md:text-sm">
                    <Layers className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1" />
                    KIT
                  </Badge>
                )}
                {/* Gender Badge */}
                {product.gender && (
                  <GenderBadge gender={product.gender} size="md" />
                )}
                
                {/* Badge de Embalagem Especial */}
                <PackagingBadge
                  hasCommercialPackaging={product.hasCommercialPackaging}
                  packingType={product.packingType}
                  repackingType={product.repackingType}
                  packagingContext={product.packagingContext}
                  onClick={() => setPackagingModalOpen(true)}
                />
              </div>

              {/* Title - Smaller on mobile */}
              <h1 className="font-display text-xl sm:text-2xl lg:text-4xl font-bold text-foreground leading-tight">
                {product.name}
              </h1>

              {/* SKU, Supplier, Estoque Futuro, Comparar Fornecedores */}
              <ProductInfoBar
                sku={selectedVariation?.sku || product.sku}
                supplierName={product.supplier.name}
                supplierId={product.supplier.id}
                onOpenFutureStock={() => setFutureStockOpen(true)}
                onOpenSupplierComparison={() => setSupplierCompareOpen(true)}
              />
            </div>

            {/* Price & Stock Card */}
            <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-card via-card to-secondary/20 border border-border p-4 md:p-6 shadow-lg">
              {/* Decorative gradient */}
              {product.featured && (
                <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
              )}
              
              <div className="relative space-y-3 md:space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground mb-0.5 md:mb-1">
                      A partir de
                    </p>
                    <span className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-base md:text-lg text-muted-foreground ml-1">/un</span>
                  </div>
                </div>
                
                {/* Estoque granular por cor - TODAS as variações ordenadas */}
                {product.variations && product.variations.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {sortVariationsByColor(product.variations).map((variation) => {
                        const isSelected = selectedVariation?.id === variation.id;
                        return (
                          <button
                            key={variation.id}
                            onClick={() => setSelectedVariation(variation)}
                            title={`${variation.color.name}: ${Math.max(0, variation.stock).toLocaleString("pt-BR")} un.`}
                            aria-label={`Cor ${variation.color.name}, ${Math.max(0, variation.stock)} unidades`}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all",
                              !isSelected && "bg-secondary/50 border border-border hover:bg-secondary hover:scale-105",
                              Math.max(0, variation.stock) === 0 && "opacity-50"
                            )}
                            style={isSelected ? {
                              backgroundColor: `${variation.color.hex}20`,
                              border: `1px solid ${variation.color.hex}`,
                              boxShadow: `0 0 0 2px ${variation.color.hex}30`
                            } : undefined}
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm shrink-0"
                              style={{ backgroundColor: variation.color.hex }}
                            />
                            <span className={cn(
                              Math.max(0, variation.stock) === 0 ? "text-destructive" : Math.max(0, variation.stock) < 100 ? "text-warning" : "text-foreground"
                            )}>
                              {Math.max(0, variation.stock) >= 1000 
                                ? `${(Math.max(0, variation.stock) / 1000).toFixed(1)}k` 
                                : Math.max(0, variation.stock).toLocaleString("pt-BR")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Legenda de estoque */}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-foreground inline-block" /> &gt;100</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" /> &lt;100</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" /> Esgotado</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end mt-3">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border",
                      stockInfo.class
                    )}>
                      <Package className="h-4 w-4" />
                      {Math.max(0, product.stock).toLocaleString("pt-BR")} un.
                    </span>
                  </div>
                )}

                <Separator className="bg-border/50" />

                {/* Info Grid - 2 cols on mobile, 3 on desktop */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Tag className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                    </div>
                    <span className="truncate">Mín. {minQuantity}</span>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                      <Truck className="h-3 w-3 md:h-4 md:w-4 text-info" />
                    </div>
                    <span className="truncate">Consultar</span>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground col-span-2 md:col-span-1">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <Shield className="h-3 w-3 md:h-4 md:w-4 text-success" />
                    </div>
                    <span className="truncate">Garantia</span>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* CTA Principal - Orçar Agora */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <QuickAddToQuote
                    productId={id || ""}
                    productName={product.name}
                    productSku={product.sku}
                    productImageUrl={product.images?.[0]}
                    productPrice={product.price}
                    minQuantity={product.minQuantity || 1}
                    variant="button"
                    className="flex-1 h-11 rounded-xl bg-orange hover:bg-orange-active text-orange-foreground font-semibold text-sm shadow-md"
                  />
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl gap-2 text-sm font-medium"
                    onClick={() => navigate('/simulador', { 
                      state: { 
                        preSelectedProduct: {
                          id: product.id,
                          name: product.name,
                          sku: product.sku,
                          price: product.price,
                          imageUrl: product.images?.[0],
                          categoryName: product.category?.name,
                        } 
                      } 
                    })}
                  >
                    <Palette className="h-4 w-4" />
                    Simular Personalização
                  </Button>
                </div>

                {/* Trust Badges inline */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                  <TrustBadge type="verified" />
                  <TrustBadge type="fast" />
                  <TrustBadge type="quality" />
                </div>
              </div>
            </div>

            {/* Section Navigation */}
            <ProductSectionNav
              tabs={[
                { id: "sec-personalizacao", label: "Personalização" },
                { id: "sec-descricao", label: "Descrição" },
                { id: "sec-precos", label: "Tabela de Preços" },
                { id: "sec-specs", label: "Especificações" },
                { id: "sec-indicado", label: "Indicado para" },
              ]}
            />

            {/* Customization Options — elevated for B2B decision-making */}
            <div id="sec-personalizacao" className="scroll-mt-28">
            <ProductCustomizationOptions 
              productId={id || ""} 
              productSku={product.sku} 
            />

            {/* Personalization Rules — elevated */}
            <ProductPersonalizationRules 
              productId={id || ""} 
              productSku={product.sku}
              productName={product.name}
            />
            </div>

            {/* Description */}
            <div id="sec-descricao" className="space-y-3 scroll-mt-28">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Descrição
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Variant Grid: Cor × Tamanho (se multi-eixo) ou Size Selector (se só tamanhos) */}
            {product.variations && product.variations.length > 0 && (
              product.variations.some((v: any) => v.size_code) ? (
                <VariantGridMatrix
                  variants={product.variations.map((v: any) => ({
                    id: v.id,
                    color_name: v.color?.name || v.name || 'Padrão',
                    color_hex: v.color?.hex || '#888',
                    size_code: v.size_code || null,
                    stock: Math.max(0, v.stock ?? 0),
                    sku: v.sku,
                    image: v.image,
                    price: v.price ?? null,
                  }))}
                  selectedId={selectedVariation?.id}
                  onSelect={(item) => {
                    const found = product.variations?.find((v: any) => v.id === item.id);
                    if (found) setSelectedVariation(found);
                  }}
                />
              ) : (
                <ProductSizeSelector
                  variations={product.variations}
                  selectedSize={selectedSize}
                  onSelectSize={setSelectedSize}
                />
              )
            )}

            {/* Inline Price Calculator */}
            <div id="sec-precos" className="scroll-mt-28">
            <InlinePriceCalculator
              productId={product.id}
              productName={product.name}
              basePrice={product.price}
              minQuantity={product.minQuantity || 1}
            />
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

            {/* Kit Composition */}
            {product.isKit && product.kitItems && (
              <KitComposition
                items={product.kitItems}
                onSelectItems={setSelectedKitItems}
              />
            )}

            {/* Actions - Desktop only */}
            <div className="hidden md:flex items-center gap-3 pt-4 border-t border-border">

              <ShareActions product={product} />
              
              {product.isKit && (
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-full px-6 bg-gradient-to-r from-warning to-warning/80 text-warning-foreground hover:from-warning/90 hover:to-warning/70"
                  onClick={() => navigate(`/kit-builder?product=${id}`)}
                >
                  <Package className="h-5 w-5 mr-2" />
                  Montar no Kit Builder
                </Button>
              )}
              
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

        {/* Price History Chart */}
        <div className="pt-8 border-t border-border">
          <PriceHistoryChart
            productId={product.id}
            currentPrice={product.price}
            productName={product.name}
          />
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
            allProducts={relatedProductsList} 
            maxItems={4} 
          />
          
          <RecommendedProducts 
            currentProduct={product} 
            allProducts={relatedProductsList} 
            maxItems={4} 
          />
        </div>

        {/* Supplier Comparison Modal */}
        <SupplierComparisonModal
          product={product}
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
        />

        {/* Packaging Modal */}
        <PackagingModal
          isOpen={packagingModalOpen}
          onClose={() => setPackagingModalOpen(false)}
          packingType={product.packagingContext === 'with_customization' 
            ? (product.repackingType || product.packingType)
            : product.packingType}
          packagingContext={product.packagingContext}
          boxImage={product.boxImage}
          boxWidthMm={product.boxWidthMm}
          boxHeightMm={product.boxHeightMm}
          boxLengthMm={product.boxLengthMm}
          boxWeightKg={product.boxWeightKg}
          boxQuantity={product.boxQuantity}
          boxVolumeCm3={product.boxVolumeCm3}
        />

        {/* Trust Badges moved to price card */}
      </div>

      {/* Floating Compare Bar */}
      <FloatingCompareBar />

      {/* Mobile Product Actions Bar */}
      <MobileProductActions
        productId={product.id}
        productName={product.name}
        productSku={product.sku}
        productPrice={product.price}
        isFavorite={isFavorite}
        onToggleFavorite={handleFavorite}
      />
    </MainLayout>
  );
}
