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
import { ProductSocialProof } from "@/components/products/ProductSocialProof";
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

  const { data: product, isLoading, isError } = useProduct(id || "");
  const { data: relatedProductsList = [] } = useRelatedProducts(product, 20);

  useEffect(() => {
    if (relatedProductsList.length > 0) registerProducts(relatedProductsList);
  }, [relatedProductsList, registerProducts]);

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

  const displayImages = product.images;

  return (
    <MainLayout>
      <Helmet>
        <title>{product.name} | PromoHub</title>
        <meta name="description" content={product.description || `${product.name} - Brinde Promocional`} />
        <link rel="canonical" href={`${window.location.origin}/produto/${product.id}`} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description || `${product.name} - Brinde Promocional`} />
        <meta property="og:image" content={product.og_image_url ? getCdnUrl(product.og_image_url, 'large') : (product.images[0] || '')} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`${window.location.origin}/produto/${product.id}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={product.name} />
        <meta name="twitter:image" content={product.og_image_url ? getCdnUrl(product.og_image_url, 'large') : (product.images[0] || '')} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "description": product.description || `${product.name} - Brinde Promocional`,
            "sku": product.sku,
            "image": product.images?.filter(Boolean) || [],
            "brand": { "@type": "Brand", "name": product.supplier?.name || "PromoHub" },
            "offers": {
              "@type": "Offer",
              "price": product.price,
              "priceCurrency": "BRL",
              "availability": product.stockStatus === "in-stock" 
                ? "https://schema.org/InStock" 
                : product.stockStatus === "out-of-stock"
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/LimitedAvailability",
              "seller": { "@type": "Organization", "name": "PromoHub" }
            },
            "category": product.category?.name,
            "material": product.materials?.join(", "),
          })}
        </script>
      </Helmet>

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

      <div className="space-y-3 md:space-y-5 animate-fade-in pb-20 md:pb-0">
        {/* Social Proof & Stock Alerts — compact */}
        {(product.featured || product.stockStatus === "low-stock") && (
          <div className="flex flex-wrap items-center gap-2">
            {product.featured && <PopularityBadge variant="trending" />}
            {product.stockStatus === "low-stock" && <LowStockAlert quantity={product.stock} />}
          </div>
        )}

        {/* ===== HERO: Gallery + Info — side by side ===== */}
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 lg:gap-6">
          
          {/* LEFT — Gallery (sticky on desktop) */}
          <div className="lg:sticky lg:top-20 lg:self-start space-y-3">
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
                  setSelectedVariation(null);
                } else if (product.variations?.[index]) {
                  setSelectedVariation(product.variations[index]);
                }
              }}
              selectedColorIndex={product.variations?.findIndex(v => v.id === selectedVariation?.id) ?? -1}
            />
          </div>

          {/* RIGHT — All product info in a compact flow */}
          <div className="space-y-3 md:space-y-4 min-w-0">
            
            {/* Header: badges + title + info bar — compact */}
            <div className="space-y-2">
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

              {/* Status badges inline */}
              <div className="flex flex-wrap gap-1.5">
                {product.featured && (
                  <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground px-2 py-0.5 text-[11px] shadow-sm">
                    <Sparkles className="h-3 w-3 mr-1" />Destaque
                  </Badge>
                )}
                {product.newArrival && (
                  <Badge className="bg-gradient-to-r from-info to-info/80 text-info-foreground px-2 py-0.5 text-[11px]">Novidade</Badge>
                )}
                {product.onSale && (
                  <Badge className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground px-2 py-0.5 text-[11px]">Promoção</Badge>
                )}
                {product.isKit && (
                  <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground px-2 py-0.5 text-[11px]">
                    <Layers className="h-3 w-3 mr-1" />KIT
                  </Badge>
                )}
                {product.gender && <GenderBadge gender={product.gender} size="md" />}
                <PackagingBadge
                  hasCommercialPackaging={product.hasCommercialPackaging}
                  packingType={product.packingType}
                  repackingType={product.repackingType}
                  packagingContext={product.packagingContext}
                  onClick={() => setPackagingModalOpen(true)}
                />
              </div>

              <h1 className="font-display text-lg sm:text-xl lg:text-2xl font-bold text-foreground leading-tight tracking-tight">
                {product.name}
              </h1>

              <ProductInfoBar
                sku={selectedVariation?.sku || product.sku}
                supplierName={product.supplier.name}
                supplierId={product.supplier.id}
                onOpenFutureStock={() => setFutureStockOpen(true)}
                onOpenSupplierComparison={() => setSupplierCompareOpen(true)}
              />

              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg gap-1.5 text-xs font-medium w-fit"
                onClick={() => navigate('/simulador', { 
                  state: { 
                    preSelectedProduct: {
                      id: product.id, name: product.name, sku: product.sku,
                      price: product.price, imageUrl: product.images?.[0],
                      categoryName: product.category?.name,
                    } 
                  } 
                })}
              >
                <Palette className="h-3.5 w-3.5" />
                Simular Personalização
              </Button>
            </div>

            {/* Social Proof */}
            <ProductSocialProof productId={product.id} totalStock={product.stock} />

            {/* ===== PRICE CARD — compact ===== */}
            <div className="rounded-xl bg-gradient-to-br from-card via-card to-secondary/20 border border-border p-3 md:p-4 shadow-md relative overflow-hidden">
              {product.featured && (
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
              )}
              <div className="relative space-y-2.5">
                {/* Price */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground">A partir de</p>
                    <span className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">/un</span>
                  </div>
                </div>
                
                {/* Stock per color */}
                {product.variations && product.variations.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {sortVariationsByColor(product.variations).map((variation) => {
                        const isSelected = selectedVariation?.id === variation.id;
                        return (
                          <button
                            key={variation.id}
                            onClick={() => setSelectedVariation(variation)}
                            title={`${variation.color.name}: ${Math.max(0, variation.stock).toLocaleString("pt-BR")} un.`}
                            aria-label={`Cor ${variation.color.name}, ${Math.max(0, variation.stock)} unidades`}
                            className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all",
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
                              className="w-2 h-2 rounded-full border border-white/20 shadow-sm shrink-0"
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
                    <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-foreground inline-block" /> &gt;100</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" /> &lt;100</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" /> Esgotado</span>
                    </div>
                  </div>
                ) : (
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", stockInfo.class)}>
                    <Package className="h-3.5 w-3.5" />
                    {Math.max(0, product.stock).toLocaleString("pt-BR")} un.
                  </span>
                )}

                {/* Info Grid — compact 3-col */}
                <div className="grid grid-cols-3 gap-2 py-1 border-y border-border/40">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Tag className="h-3 w-3 text-primary shrink-0" />
                    <span>Mín. {minQuantity}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Truck className="h-3 w-3 text-info shrink-0" />
                    <span>Consultar</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Shield className="h-3 w-3 text-success shrink-0" />
                    <span>Garantia</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex gap-2">
                  <QuickAddToQuote
                    productId={id || ""}
                    productName={product.name}
                    productSku={product.sku}
                    productImageUrl={product.images?.[0]}
                    productPrice={product.price}
                    minQuantity={product.minQuantity || 1}
                    variant="button"
                    className="flex-1 h-10 rounded-lg bg-orange hover:bg-orange-active text-orange-foreground font-semibold text-sm shadow-md"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-lg gap-1.5 text-xs font-medium"
                    onClick={() => navigate('/simulador', { 
                      state: { 
                        preSelectedProduct: {
                          id: product.id, name: product.name, sku: product.sku,
                          price: product.price, imageUrl: product.images?.[0],
                          categoryName: product.category?.name,
                        } 
                      } 
                    })}
                  >
                    <Palette className="h-3.5 w-3.5" />
                    Simular Personalização
                  </Button>
                </div>

                {/* Trust */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
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

            {/* ===== CONTENT SECTIONS — compact spacing ===== */}

            {/* Personalization */}
            <div id="sec-personalizacao" className="scroll-mt-28 space-y-2">
              <ProductCustomizationOptions productId={id || ""} productSku={product.sku} />
              <ProductPersonalizationRules productId={id || ""} productSku={product.sku} productName={product.name} />
            </div>

            {/* Description — compact */}
            <div id="sec-descricao" className="scroll-mt-28 space-y-1.5">
              <h3 className="font-display text-base font-semibold text-foreground">Descrição</h3>
              {product.description ? (() => {
                const sentences = product.description
                  .split(/[.]\s+/)
                  .map(s => s.trim().replace(/\.$/, ''))
                  .filter(s => s.length > 5);
                if (sentences.length > 2) {
                  return (
                    <ul className="space-y-1">
                      {sentences.map((sentence, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                          {sentence}
                        </li>
                      ))}
                    </ul>
                  );
                }
                return <p className="text-muted-foreground leading-relaxed text-xs">{product.description}</p>;
              })() : (
                <p className="text-muted-foreground italic text-xs">Sem descrição disponível</p>
              )}
            </div>

            {/* Variant Grid */}
            {product.variations && product.variations.length > 0 && (
              product.variations.some((v: any) => v.size_code) ? (
                <VariantGridMatrix
                  variants={product.variations.map((v: any) => ({
                    id: v.id, color_name: v.color?.name || v.name || 'Padrão',
                    color_hex: v.color?.hex || '#888', size_code: v.size_code || null,
                    stock: Math.max(0, v.stock ?? 0), sku: v.sku, image: v.image, price: v.price ?? null,
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

            {/* Price Calculator */}
            <div id="sec-precos" className="scroll-mt-28">
              <InlinePriceCalculator
                productId={product.id}
                productName={product.name}
                basePrice={product.price}
                minQuantity={product.minQuantity || 1}
              />
            </div>

            {/* Materials + Specs — side by side on large screens */}
            <div id="sec-specs" className="scroll-mt-28 space-y-3">
              {product.materials && product.materials.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="font-display text-base font-semibold text-foreground">Materiais</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {product.materials.map((material) => (
                      <Badge key={material} variant="secondary" className="px-3 py-1 text-xs rounded-full">
                        {material}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <ProductDimensions dimensions={product.dimensions} />
            </div>

            {/* Kit Composition */}
            {product.isKit && product.kitItems && (
              <KitComposition items={product.kitItems} onSelectItems={setSelectedKitItems} />
            )}

            {/* Actions — compact row */}
            <div className="hidden md:flex items-center gap-2 py-2 border-t border-border flex-wrap">
              <Button
                size="sm"
                className="rounded-full px-4 gap-1.5 text-xs bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-sm"
                onClick={() => navigate(`/mockup-generator`, {
                  state: {
                    preSelectedProduct: { id: product.id, name: product.name, sku: product.sku, imageUrl: product.images?.[0] }
                  }
                })}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Visualizar com Logo
              </Button>
              <ShareActions product={product} />
              {product.isKit && (
                <Button
                  size="sm"
                  className="rounded-full px-4 text-xs bg-gradient-to-r from-warning to-warning/80 text-warning-foreground hover:from-warning/90 hover:to-warning/70"
                  onClick={() => navigate(`/kit-builder?product=${id}`)}
                >
                  <Package className="h-3.5 w-3.5 mr-1" />
                  Montar no Kit Builder
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleFavorite}
                className={cn(
                  "rounded-full px-4 text-xs transition-all",
                  isFavorite && "bg-destructive/10 border-destructive/50 hover:bg-destructive/20"
                )}
              >
                <Heart className={cn("h-3.5 w-3.5 mr-1 transition-all", isFavorite && "fill-destructive text-destructive")} />
                {isFavorite ? "Favoritado" : "Favoritar"}
              </Button>
            </div>

            {/* Tags — Indicado para */}
            <div id="sec-indicado" className="scroll-mt-28 space-y-2 pt-2 border-t border-border">
              <h3 className="font-display text-base font-semibold text-foreground">Indicado para</h3>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.publicoAlvo.map((tag) => (
                  <Badge key={tag} variant="outline" className="px-2 py-1 text-xs rounded-full">👤 {tag}</Badge>
                ))}
                {product.tags.datasComemorativas.map((tag) => (
                  <Badge key={tag} variant="outline" className="px-2 py-1 text-xs rounded-full">📅 {tag}</Badge>
                ))}
                {product.tags.endomarketing.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="px-2 py-1 text-xs rounded-full">🎯 {tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Below-fold sections — compact */}
        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border">
          <PriceHistoryChart
            productId={product.id}
            currentPrice={product.price}
            productName={product.name}
          />
          <ProductIntelligence 
            productId={product.id}
            productSku={product.sku}
            productName={product.name}
          />
        </div>

        {/* Related & Recommended */}
        <div className="space-y-6 pt-4 border-t border-border">
          <RelatedProducts currentProduct={product} allProducts={relatedProductsList} maxItems={4} />
          <RecommendedProducts currentProduct={product} allProducts={relatedProductsList} maxItems={4} />
        </div>

        {/* Modals */}
        <SupplierComparisonModal product={product} open={supplierCompareOpen} onOpenChange={setSupplierCompareOpen} />
        <FutureStockModal open={futureStockOpen} onOpenChange={setFutureStockOpen} productId={product.id} productName={product.name} productSku={product.sku} />
        <PackagingModal
          isOpen={packagingModalOpen}
          onClose={() => setPackagingModalOpen(false)}
          packingType={product.packagingContext === 'with_customization' ? (product.repackingType || product.packingType) : product.packingType}
          packagingContext={product.packagingContext}
          boxImage={product.boxImage}
          boxWidthMm={product.boxWidthMm}
          boxHeightMm={product.boxHeightMm}
          boxLengthMm={product.boxLengthMm}
          boxWeightKg={product.boxWeightKg}
          boxQuantity={product.boxQuantity}
          boxVolumeCm3={product.boxVolumeCm3}
        />
      </div>

      <FloatingCompareBar />
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
