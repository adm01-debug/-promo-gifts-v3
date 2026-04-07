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
          <div className="min-w-0">
            <div className="lg:sticky lg:top-20 space-y-3 pb-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xl:gap-4 items-stretch flex-1">
              {/* LEFT — Price & CTA */}
              <div className="group/price rounded-2xl bg-gradient-to-br from-card via-card to-secondary/10 border border-border/60 p-5 xl:p-6 shadow-lg relative overflow-hidden flex flex-col transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/20">
                {product.featured && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/8 to-transparent rounded-bl-full transition-opacity duration-500 group-hover/price:from-primary/15" />
                )}

                <div className="relative flex flex-col gap-4">
                  {/* ── SEÇÃO 1: Preço ── */}
                  <div>
                    <p className="text-[10px] xl:text-[11px] text-muted-foreground/60 uppercase tracking-[0.15em] font-semibold mb-1">A partir de</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl xl:text-4xl font-display font-extrabold text-foreground tracking-tight leading-none">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-sm text-muted-foreground/50 font-medium">/un</span>
                    </div>
                  </div>

                  {/* ── SEÇÃO 2: Estoque por cor ── */}
                  {product.variations && product.variations.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">Estoque por cor</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {sortVariationsByColor(product.variations).map((variation) => {
                          const isSelected = selectedVariation?.id === variation.id;
                          const stock = Math.max(0, variation.stock);
                          return (
                            <button
                              key={variation.id}
                              onClick={() => setSelectedVariation(variation)}
                              title={`${variation.color.name}: ${stock.toLocaleString("pt-BR")} un.`}
                              aria-label={`Cor ${variation.color.name}, ${stock} unidades`}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium transition-all duration-200",
                                !isSelected && "bg-secondary/30 border border-border/30 hover:bg-secondary/50",
                                stock === 0 && "opacity-40"
                              )}
                              style={isSelected ? {
                                backgroundColor: `${variation.color.hex}15`,
                                border: `1.5px solid ${variation.color.hex}`,
                                boxShadow: `0 0 0 2px ${variation.color.hex}20`
                              } : undefined}
                            >
                              <div
                                className="w-3 h-3 rounded-full border border-border/40 shrink-0"
                                style={{ backgroundColor: variation.color.hex }}
                              />
                              <span className={cn(
                                stock === 0 ? "text-destructive" : stock < 100 ? "text-warning" : "text-muted-foreground"
                              )}>
                                {stock >= 1000 ? `${(stock / 1000).toFixed(1)}k` : stock.toLocaleString("pt-BR")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-fit", stockInfo.class)}>
                      <Package className="h-3.5 w-3.5" />
                      {Math.max(0, product.stock).toLocaleString("pt-BR")} un.
                    </span>
                  )}

                  {/* ── SEÇÃO 3: Info compacta ── */}
                  <div className="flex items-center gap-4 py-2.5 px-3 rounded-lg bg-secondary/20 border border-border/20">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Tag className="h-3 w-3 text-primary shrink-0" />
                      <span className="font-medium">Mín. {minQuantity}</span>
                    </div>
                    <div className="h-3.5 w-px bg-border/40" />
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Truck className="h-3 w-3 text-info shrink-0" />
                      <span>Consultar</span>
                    </div>
                    <div className="h-3.5 w-px bg-border/40" />
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Shield className="h-3 w-3 text-success shrink-0" />
                      <span>Garantia</span>
                    </div>
                  </div>

                  {/* ── SEÇÃO 4: CTAs ── */}
                  <div className="flex gap-2.5">
                    <QuickAddToQuote
                      productId={id || ""}
                      productName={product.name}
                      productSku={product.sku}
                      productImageUrl={product.images?.[0]}
                      productPrice={product.price}
                      minQuantity={product.minQuantity || 1}
                      variant="button"
                      className="flex-1 h-12 xl:h-13 rounded-xl bg-gradient-to-r from-success to-success/85 hover:from-success/90 hover:to-success/75 text-success-foreground font-display font-bold text-[0.875rem] tracking-wide shadow-md shadow-success/20 hover:shadow-lg hover:shadow-success/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] gap-1.5"
                      labelOverride="Carrinho"
                      iconOverride="cart"
                    />
                    <Button
                      size="sm"
                      className="flex-1 h-11 xl:h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground font-display font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] gap-1.5"
                      onClick={() => navigate(`/orcamentos/novo?product_id=${id}&product_name=${encodeURIComponent(product.name)}&product_sku=${encodeURIComponent(product.sku || '')}&product_price=${product.price}&product_image=${encodeURIComponent(product.images?.[0] || '')}&min_quantity=${product.minQuantity || 1}`)}
                    >
                      <FileText className="h-4 w-4" />
                      Orçamento
                    </Button>
                  </div>

                  {/* ── SEÇÃO 5: Trust + Social proof ── */}
                  <div className="space-y-2.5 pt-1">
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

                    <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="font-semibold text-foreground">{viewCount}</span>
                        <span>visualizações</span>
                      </div>
                      <div className="h-4 w-px bg-border/30" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleFavorite}
                        className={cn(
                          "rounded-full px-3 text-xs gap-1.5 h-7 transition-all duration-300",
                          "hover:bg-destructive/15 hover:text-destructive hover:scale-105 hover:shadow-md hover:shadow-destructive/20",
                          isFavorite && "text-destructive bg-destructive/10"
                        )}
                      >
                        <Heart className={cn("h-3.5 w-3.5 transition-all duration-300", isFavorite && "fill-destructive text-destructive scale-110")} />
                        {isFavorite ? "Favoritado" : "Favoritar"}
                      </Button>
                    </div>
                  </div>

                </div>
              </div>

              {/* RIGHT — Specs + Description */}
              <div id="sec-specs" className="scroll-mt-28 rounded-2xl border border-border/60 bg-card/40 p-5 xl:p-6 flex flex-col gap-4">
                {/* Description */}
                <div id="sec-descricao" className="scroll-mt-28">
                  <h4 className="text-xs xl:text-sm font-bold text-foreground mb-2 uppercase tracking-wide">Descrição</h4>
                  {product.description ? (() => {
                    const sentences = product.description
                      .split(/[.]\s+/)
                      .map(s => s.trim().replace(/\.$/, ''))
                      .filter(s => s.length > 5);
                    if (sentences.length > 2) {
                      return (
                        <ul className="space-y-1">
                          {sentences.map((sentence, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
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

                {/* Specs */}
                <div className="border-t border-border/30 pt-4 space-y-3">
                  <h4 className="text-xs xl:text-sm font-bold text-foreground uppercase tracking-wide">Especificações</h4>
                  {product.materials && product.materials.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.materials.map((material) => (
                        <Badge key={material} variant="secondary" className="px-2.5 py-0.5 text-[11px] rounded-full">
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




            {/* Quick Action Buttons — bottom bar, aligned with gallery color thumbnails */}
            <div className="mt-auto">
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
