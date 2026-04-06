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
  ChevronDown,
  FileText,
  Eye,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductStickyHeader } from "@/components/products/ProductStickyHeader";
// ProductSectionNav removed — layout is dense enough without scroll-spy tabs

import { KitComposition } from "@/components/products/KitComposition";
import { ProductCategoryBadges } from "@/components/products/ProductCategoryBadges";
import { GenderBadge } from "@/components/products/GenderBadge";
import { SimilarProducts } from "@/components/products/SimilarProducts";
import { ProductQuickActions } from "@/components/products/ProductQuickActions";
import { ProductIntelligence } from "@/components/products/ProductIntelligence";
import { StockHistoryChart } from "@/components/products/StockHistoryChart";
import { SalesHistoryChart } from "@/components/products/SalesHistoryChart";
import { ProductDimensions } from "@/components/products/ProductDimensions";
import { SupplierComparisonModal } from "@/components/compare/SupplierComparisonModal";
import { ProductInfoBar } from "@/components/products/ProductInfoBar";
import { FutureStockModal } from "@/components/products/FutureStockModal";
import { PackagingBadge } from "@/components/products/PackagingBadge";
import { PackagingModal } from "@/components/products/PackagingModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { Card, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useProductAnalytics } from "@/hooks/useProductAnalytics";
import { cn } from "@/lib/utils";
import { useProduct, type Product } from "@/hooks/useProducts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sortVariationsByColor } from "@/utils/colorSorting";
import { ProductDetailSkeleton } from "@/components/products/ProductDetailSkeleton";

type ProductVariation = any;
import type { KitComponent } from "@/types/product-catalog";
type KitItem = KitComponent;
import { DynamicBreadcrumbs } from "@/components/navigation/DynamicBreadcrumbs";
import { FadeInView, SlideIn, HoverCard } from "@/components/common/MicroInteractions";
import { GlassCard } from "@/components/common/GlassElements";
import { EmptyState } from "@/components/common/EmptyState";
import { PopularityBadge, LowStockAlert, TrustBadgesRow, TrustBadge, DynamicTrustBadges, type ProductBadgeFlags } from "@/components/common/SocialProof";
import { useProductIntelligenceBadges } from "@/hooks/useProductIntelligenceBadges";
import { IntelligenceBadges } from "@/components/common/IntelligenceBadges";
import { useSupplierTrust } from "@/hooks/useSupplierTrust";
import { QuickAddToQuote } from "@/components/products/QuickAddToQuote";
import { FloatingCompareBar } from "@/components/compare/FloatingCompareBar";
import { MobileProductActions } from "@/components/mobile/MobileProductActions";
import { useRecentlyViewedStore } from "@/stores/useRecentlyViewedStore";

import { useFavoritesStore } from "@/stores/useFavoritesStore";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackProductView } = useProductAnalytics();

  const { isFavorite: isFavoriteCheck, toggleFavorite } = useFavoritesStore();
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  
  const [selectedKitItems, setSelectedKitItems] = useState<KitItem[]>([]);
  const [supplierCompareOpen, setSupplierCompareOpen] = useState(false);
  const [futureStockOpen, setFutureStockOpen] = useState(false);
  const [packagingModalOpen, setPackagingModalOpen] = useState(false);
  const { addToRecentlyViewed } = useRecentlyViewedStore();

  const { data: product, isLoading, isError } = useProduct(id || "");
  const { data: supplierTrust } = useSupplierTrust(id);
  const catalogFlags = useMemo(() => product ? {
    featured: product.featured,
    newArrival: product.newArrival,
    onSale: product.onSale,
    lowStock: product.stockStatus === 'low-stock',
    stock: product.stock,
  } : undefined, [product?.featured, product?.newArrival, product?.onSale, product?.stockStatus, product?.stock]);
  const { badges: intellBadges, turnoverScore: intellTurnover, isDemo: intellIsDemo } = useProductIntelligenceBadges(id, catalogFlags);

  const { data: viewCount = 0 } = useQuery({
    queryKey: ["product-views-count", id],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count } = await supabase
        .from("product_views")
        .select("*", { count: "exact", head: true })
        .eq("product_id", id!)
        .gte("created_at", thirtyDaysAgo.toISOString());
      return count || 0;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

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
        <title>{product.name} | Promo Gifts</title>
        <meta name="description" content={product.description || `${product.name} - Brinde Promocional`} />
        <link rel="canonical" href={`${window.location.origin}/produto/${product.id}`} />
        <meta property="og:title" content={`${product.name} | Promo Gifts`} />
        <meta property="og:description" content={product.description || `${product.name} - Brinde Promocional`} />
        <meta property="og:image" content={product.og_image_url ? getCdnUrl(product.og_image_url, 'large') : (product.images[0] || '')} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`${window.location.origin}/produto/${product.id}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} | Promo Gifts`} />
        <meta name="twitter:image" content={product.og_image_url ? getCdnUrl(product.og_image_url, 'large') : (product.images[0] || '')} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "description": product.description || `${product.name} - Brinde Promocional`,
            "sku": product.sku,
            "image": product.images?.filter(Boolean) || [],
            "brand": { "@type": "Brand", "name": product.supplier?.name || "Promo Gifts" },
            "offers": {
              "@type": "Offer",
              "price": product.price,
              "priceCurrency": "BRL",
              "availability": product.stockStatus === "in-stock" 
                ? "https://schema.org/InStock" 
                : product.stockStatus === "out-of-stock"
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/LimitedAvailability",
              "seller": { "@type": "Organization", "name": "Promo Gifts" }
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

      <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 xl:space-y-8 animate-fade-in pb-20 md:pb-0 min-w-0 overflow-x-hidden xl:px-4 2xl:px-8">
        {/* Social Proof & Stock Alerts — compact */}
        {/* Intelligence Badges — data-driven from market intelligence */}
        <IntelligenceBadges
          badges={intellBadges}
          turnoverScore={intellTurnover}
          isDemo={intellIsDemo}
        />

        {/* ===== HERO: Gallery + Info — side by side ===== */}
        <div className="grid min-w-0 overflow-x-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 lg:gap-6 xl:gap-8">
          
          {/* LEFT — Gallery (sticky on desktop) */}
          <div className="min-w-0 lg:sticky lg:top-20 lg:self-start space-y-3 pb-4">
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
          <div className="flex flex-col gap-3 md:gap-4 xl:gap-5 min-w-0">
            
            {/* Header: badges + title + info bar — compact */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <ProductCategoryBadges 
                  category={product.category} 
                  groups={product.groups}
                  categoryUuid={product.category_id}
                  productId={product.id}
                  productName={product.name}
                  productSku={product.sku}
                  productPrice={product.price}
                  productImageUrl={product.images?.[0]}
                  productMinQuantity={product.minQuantity || 1}
                  isKit={product.isKit}
                />
              </div>

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

              <h1 className="font-display text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-foreground leading-tight tracking-tight">
                {product.name}
              </h1>

              <ProductInfoBar
                sku={selectedVariation?.sku || product.sku}
                supplierName={product.supplier.name}
                supplierId={product.supplier.id}
                onOpenFutureStock={() => setFutureStockOpen(true)}
                onOpenSupplierComparison={() => setSupplierCompareOpen(true)}
              />
            </div>

            {/* ===== PRICE + SPECS — two columns ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:gap-4 flex-1 items-stretch">
              {/* LEFT — Price & CTA */}
              <div className="rounded-xl bg-gradient-to-br from-card via-card to-secondary/20 border border-border p-3 xl:p-5 shadow-md relative overflow-hidden flex flex-col justify-between transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5">
                {product.featured && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
                )}
                <div className="relative space-y-2">
                  <div>
                    <p className="text-[11px] xl:text-xs text-muted-foreground">A partir de</p>
                    <span className="text-2xl xl:text-3xl font-display font-bold text-foreground">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-sm xl:text-base text-muted-foreground ml-1">/un</span>
                  </div>
                  
                  {/* Stock per color */}
                  {product.variations && product.variations.length > 0 ? (
                    <div className="space-y-1">
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
                    </div>
                  ) : (
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", stockInfo.class)}>
                      <Package className="h-3.5 w-3.5" />
                      {Math.max(0, product.stock).toLocaleString("pt-BR")} un.
                    </span>
                  )}

                  {/* Info row */}
                  <div className="grid grid-cols-3 gap-1 py-1 border-y border-border/40">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Tag className="h-2.5 w-2.5 text-primary shrink-0" />
                      <span>Mín. {minQuantity}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Truck className="h-2.5 w-2.5 text-info shrink-0" />
                      <span>Consultar</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Shield className="h-2.5 w-2.5 text-success shrink-0" />
                      <span>Garantia</span>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-2 xl:gap-3">
                    <QuickAddToQuote
                      productId={id || ""}
                      productName={product.name}
                      productSku={product.sku}
                      productImageUrl={product.images?.[0]}
                      productPrice={product.price}
                      minQuantity={product.minQuantity || 1}
                      variant="button"
                      className="flex-1 h-8 xl:h-10 rounded-lg bg-success hover:bg-success/90 text-success-foreground font-semibold text-xs xl:text-sm shadow-sm"
                      labelOverride="Carrinho"
                      iconOverride="cart"
                    />
                    <Button
                      size="sm"
                      className="flex-1 h-8 xl:h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs xl:text-sm shadow-sm gap-1.5"
                      onClick={() => navigate(`/orcamentos/novo?product_id=${id}&product_name=${encodeURIComponent(product.name)}&product_sku=${encodeURIComponent(product.sku || '')}&product_price=${product.price}&product_image=${encodeURIComponent(product.images?.[0] || '')}&min_quantity=${product.minQuantity || 1}`)}
                    >
                      <FileText className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                      Orçamento
                    </Button>
                  </div>

                  <DynamicTrustBadges
                    trust={supplierTrust ?? { isVerified: false, deliveryDays: null, avgRating: null }}
                    productFlags={{
                      newArrival: product?.newArrival ?? false,
                      onSale: product?.onSale ?? false,
                      featured: product?.featured ?? false,
                      minQuantity: product?.minQuantity,
                    }}
                    className="text-[10px]"
                  />

                  {/* Visualizações + Favoritar */}
                  <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      <span className="font-semibold text-foreground">{viewCount}</span>
                      <span>visualizações</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFavorite}
                      className={cn(
                        "rounded-full px-3 text-xs gap-1.5 hover:bg-destructive/10 h-7",
                        isFavorite && "text-destructive"
                      )}
                    >
                      <Heart className={cn("h-3.5 w-3.5 transition-all duration-300", isFavorite && "fill-destructive text-destructive scale-110")} />
                      {isFavorite ? "Favoritado" : "Favoritar"}
                    </Button>
                  </div>

                </div>
              </div>

              {/* RIGHT — Specs + Description */}
              <div id="sec-specs" className="scroll-mt-28 rounded-xl border border-border bg-card/50 p-3 xl:p-5 space-y-2 xl:space-y-3 flex flex-col">
                {/* Description */}
                <div id="sec-descricao" className="scroll-mt-28 max-w-prose">
                  <h4 className="text-xs xl:text-sm font-semibold text-foreground mb-1">Descrição</h4>
                  {product.description ? (() => {
                    const sentences = product.description
                      .split(/[.]\s+/)
                      .map(s => s.trim().replace(/\.$/, ''))
                      .filter(s => s.length > 5);
                    if (sentences.length > 2) {
                      return (
                        <ul className="space-y-0.5">
                          {sentences.map((sentence, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                              {sentence}
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return <p className="text-muted-foreground leading-relaxed text-[11px]">{product.description}</p>;
                  })() : (
                    <p className="text-muted-foreground italic text-[11px]">Sem descrição disponível</p>
                  )}
                </div>

                {/* Specs */}
                <div className="border-t border-border/40 pt-2 space-y-2">
                  <h4 className="text-xs xl:text-sm font-semibold text-foreground">Especificações</h4>
                  {product.materials && product.materials.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.materials.map((material) => (
                        <Badge key={material} variant="secondary" className="px-2 py-0.5 text-[10px] rounded-full">
                          {material}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <ProductDimensions dimensions={product.dimensions} compact />
                </div>

              </div>
            </div>


            {/* Kit Composition */}
            {product.isKit && product.kitItems && (
              <KitComposition items={product.kitItems} onSelectItems={setSelectedKitItems} />
            )}




            {/* Quick Action Buttons — bottom bar */}
            <div className="-mt-1">
              <ProductQuickActions
                productId={product.id}
                productName={product.name}
                productSku={product.sku}
                basePrice={product.price}
                minQuantity={product.minQuantity || 1}
                tags={product.tags ? {
                  "Público-Alvo": product.tags.publicoAlvo || [],
                  "Datas Comemorativas": product.tags.datasComemorativas || [],
                  "Endomarketing": product.tags.endomarketing || [],
                } : undefined}
                niches={product.tags?.nicho || product.tags?.ramo || undefined}
                product={product}
              />
            </div>

          </div>
        </div>

        {/* Produtos Semelhantes */}
        <div className="pt-6 xl:pt-8 border-t border-border/60">
          <SimilarProducts currentProduct={product} />
        </div>

        {/* Below-fold sections — compact */}
        <div className="grid md:grid-cols-2 gap-4 xl:gap-6 pt-6 xl:pt-8 border-t border-border/60">
          <StockHistoryChart
            productId={product.id}
            productName={product.name}
          />
          <SalesHistoryChart
            productId={product.id}
            productSku={product.sku}
            productName={product.name}
          />
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
        productImageUrl={product.images?.[0]}
        minQuantity={product.minQuantity || 1}
        isFavorite={isFavorite}
        onToggleFavorite={handleFavorite}
      />
    </MainLayout>
  );
}
