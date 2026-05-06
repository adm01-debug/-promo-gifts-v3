/**
 * ProductCard — Main catalog card component.
 * Refactored using SOLID principles:
 * - Single Responsibility: UI split into sub-components.
 * - Open/Closed: Extensible via composition.
 * - Interface Segregation: Specific props for specific components.
 */
import { useRef, useEffect, memo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCdnUrl, getSrcSet } from '@/utils/image-utils';
import { cn } from '@/lib/utils';
import type { Product } from '@/hooks/useProducts';
import { AddToCollectionModal } from '@/components/collections/AddToCollectionModal';
import { ProductQuickView } from './ProductQuickView';
import { ProductCategoryBadges } from './ProductCategoryBadges';
import {
  resolveColorImage,
  resolveColorStock,
  getActiveColorName,
  type ActiveColorFilter,
} from '@/utils/color-image-resolver';
import { resolveHighlightHex } from '@/utils/color-group-hex';
import { resolveAllMatchingColors } from '@/utils/color-variant-carousel';
import { useProductBounds } from '@/hooks/useProductBounds';
import { ProductSparkline } from './ProductSparkline';
import { VariantPickerDialog } from './VariantPickerDialog';
import { SharePreviewDialog } from './share/SharePreviewDialog';
import { ProductCardImage } from './ProductCardImage';
import { ProductCardActions } from './ProductCardActions';
import { ProductCardHeader } from './ProductCardHeader';
import { ProductCardPrice } from './ProductCardPrice';
import { useProductCardState } from './useProductCardState';

export interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onView?: (product: Product) => void;
  onShare?: (product: Product) => void;
  onFavorite?: (product: Product) => void;
  highlightColors?: string[];
  isFavorited?: boolean;
  onToggleFavorite?: (productId: string) => void;
  isInCompare?: boolean;
  onToggleCompare?: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare?: boolean;
  hideCategoryBadges?: boolean;
  isNovelty?: boolean;
  noveltyDaysRemaining?: number;
  activeColorFilter?: ActiveColorFilter | null;
}

export const ProductCard = memo(
  forwardRef<HTMLElement, ProductCardProps>(function ProductCard(
    {
      product,
      onClick,
      onView,
      onShare,
      onFavorite,
      highlightColors,
      isFavorited = false,
      onToggleFavorite,
      isInCompare = false,
      onToggleCompare,
      canAddToCompare = true,
      hideCategoryBadges = false,
      isNovelty = false,
      noveltyDaysRemaining,
      activeColorFilter,
    },
    ref,
  ) {
    const navigate = useNavigate();
    const state = useProductCardState(product, onToggleFavorite, onToggleCompare);

    const filterKey = activeColorFilter
      ? `${(activeColorFilter.groups || []).join(',')}|${(activeColorFilter.variations || []).join(',')}`
      : '';
    const prevFilterKeyRef = useRef(filterKey);
    useEffect(() => {
      if (prevFilterKeyRef.current !== filterKey) {
        state.setActiveVariantIdx(0);
        prevFilterKeyRef.current = filterKey;
      }
    }, [filterKey, state]);

    // Multi-variant carousel logic
    const allMatchingVariants = resolveAllMatchingColors(product.colors, activeColorFilter);
    const hasMultipleVariants = allMatchingVariants.length > 1;
    const safeVariantIdx = hasMultipleVariants
      ? Math.min(state.activeVariantIdx, allMatchingVariants.length - 1)
      : 0;
    const currentVariant = hasMultipleVariants ? allMatchingVariants[safeVariantIdx] : null;
    const matchedHighlightColor =
      currentVariant?.hex ||
      resolveHighlightHex(product.colors, activeColorFilter, highlightColors);
    const hasHighlightedColor = !!matchedHighlightColor;

    const variantImage = currentVariant?.image;
    const colorSpecificImage = variantImage || resolveColorImage(product, activeColorFilter);
    const rawImageUrl = colorSpecificImage || product.og_image_url || product.images[0] || null;
    const cardImageUrl = rawImageUrl ? getCdnUrl(rawImageUrl, 'card') : '/placeholder.svg';
    const cardSrcSet = colorSpecificImage ? undefined : rawImageUrl ? getSrcSet(rawImageUrl) : undefined;
    const activeColorName = currentVariant?.name || getActiveColorName(product, activeColorFilter);

    const imageBounds = useProductBounds(
      cardImageUrl !== '/placeholder.svg' ? cardImageUrl : null,
      { whiteThreshold: 230, margin: 0.01, maxSize: 384 },
    );
    const isOversizedImage =
      imageBounds.detected && imageBounds.fractionX >= 0.86 && imageBounds.fractionY >= 0.86;
    const computedImageScale = Number(((isOversizedImage ? 0.88 : 1) * (state.isHovered ? 1.03 : 1)).toFixed(3));

    const colorStock = resolveColorStock(product, activeColorFilter);
    const displayStock = colorStock?.stock ?? product.stock;
    const displayStatus = colorStock?.stockStatus ?? product.stockStatus;

    return (
      <article
        ref={ref}
        data-testid="product-card"
        data-product-id={product.id}
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-xl bg-card transition-all duration-500 hover:-translate-y-2 hover:shadow-premium',
          product.featured && 'shadow-lg ring-2 ring-primary/20',
          hasHighlightedColor ? 'border-2' : 'border-[1.5px] border-primary/10 hover:border-primary/50',
        )}
        style={
          hasHighlightedColor && matchedHighlightColor
            ? ({
                borderColor: `${matchedHighlightColor}70`,
                boxShadow: `inset 0 0 30px -6px ${matchedHighlightColor}40, 0 0 8px -2px ${matchedHighlightColor}20`,
              } as React.CSSProperties)
            : undefined
        }
        onMouseEnter={() => state.setIsHovered(true)}
        onMouseLeave={() => {
          state.setIsHovered(false);
          state.setActionsOpen(false);
        }}
        onClick={(e) => {
          if (state.actionsOpen || state.actionBusy || state.variantPickerOpen || state.collectionModalOpen || state.quickViewOpen || state.shareDialogOpen) {
            e.stopPropagation();
            return;
          }
          if (onClick) return onClick();
          
          const params = new URLSearchParams();
          if (currentVariant?.name) {
            params.set('cor', currentVariant.name);
            if (currentVariant.groupSlug) params.set('grupo', currentVariant.groupSlug);
            if (currentVariant.hex) params.set('hex', currentVariant.hex);
          }
          navigate(`/produto/${product.id}${params.toString() ? `?${params.toString()}` : ''}`);
        }}
      >
        <ProductCardImage
          product={product}
          cardImageUrl={cardImageUrl}
          cardSrcSet={cardSrcSet}
          activeColorName={activeColorName}
          colorSpecificImage={colorSpecificImage}
          imageLoaded={state.imageLoaded}
          isHovered={state.isHovered}
          computedImageScale={computedImageScale}
          isNovelty={isNovelty}
          noveltyDaysRemaining={noveltyDaysRemaining}
          highlightColors={highlightColors}
          activeColorFilter={activeColorFilter}
          allMatchingVariants={allMatchingVariants}
          hasMultipleVariants={hasMultipleVariants}
          safeVariantIdx={safeVariantIdx}
          onImageLoad={() => state.setImageLoaded(true)}
          onVariantChange={(idx) => {
            state.setActiveVariantIdx(idx);
            state.setImageLoaded(false);
          }}
        />

        <ProductCardActions
          productId={product.id}
          productName={product.name}
          productSku={product.sku}
          productImageUrl={product.og_image_url || product.images[0]}
          productPrice={product.price}
          productMinQuantity={product.minQuantity || 1}
          isFavorited={isFavorited}
          isInCompare={isInCompare}
          canAddToCompare={canAddToCompare}
          actionsOpen={state.actionsOpen}
          onToggleActions={() => state.setActionsOpen(!state.actionsOpen)}
          onFavorite={(e) => state.handleFavoriteAction(e, isFavorited)}
          onCompare={(e) => state.handleCompareAction(e, isInCompare)}
          onOpenVariantPicker={(mode) => {
            state.setActionsOpen(false);
            state.setVariantPickerMode(mode);
            state.setVariantPickerOpen(true);
          }}
          onQuickView={() => {
            state.setActionsOpen(false);
            state.setQuickViewOpen(true);
          }}
          markBusy={state.markBusy}
        />

        <div className={cn(
          'relative space-y-2 overflow-hidden rounded-b-xl p-2.5 transition-colors duration-500 sm:space-y-3 sm:p-4',
          state.isHovered ? 'bg-card/95 backdrop-blur-md' : 'bg-card',
        )} style={{ zIndex: 10 }}>
          {!hideCategoryBadges && (
            <ProductCategoryBadges
              category={product.category}
              groups={product.groups}
              categoryUuid={product.category_id}
              className="flex-wrap"
            />
          )}

          <ProductCardHeader product={product} />

          <h3 className="line-clamp-2 min-h-[2.25rem] font-display text-sm font-semibold leading-snug text-foreground transition-colors duration-300 group-hover:text-primary sm:min-h-[2.75rem] sm:text-base">
            {product.name}
          </h3>

          <ProductCardPrice product={product} displayStock={displayStock} displayStatus={displayStatus} />

          {Array.isArray(product.materials) && product.materials.length > 0 && (
            <div className="hidden flex-wrap gap-1.5 border-t border-border/50 pt-2 sm:flex">
              {product.materials.slice(0, 2).map((m) => (
                <span key={m} className="rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {m}
                </span>
              ))}
              {product.materials.length > 2 && (
                <span className="rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  +{product.materials.length - 2}
                </span>
              )}
            </div>
          )}

          <div className="border-t border-border/30 pt-1.5 sm:pt-2">
            <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[10px]">
              Vendas no Fornecedor 30d
            </p>
            <ProductSparkline productId={product.id} />
          </div>
        </div>

        {/* Dialogs */}
        <VariantPickerDialog
          open={state.variantPickerOpen}
          onOpenChange={state.setVariantPickerOpen}
          productId={product.id}
          productName={product.name}
          mode={state.variantPickerMode}
          onComplete={state.handleVariantComplete}
        />
        <AddToCollectionModal
          open={state.collectionModalOpen}
          onOpenChange={state.setCollectionModalOpen}
          productId={product.id}
          productName={product.name}
          variant={state.collectionVariant}
        />
        <ProductQuickView
          product={product}
          open={state.quickViewOpen}
          onOpenChange={state.setQuickViewOpen}
          isFavorited={isFavorited}
          onToggleFavorite={onToggleFavorite}
          isInCompare={isInCompare}
          onToggleCompare={onToggleCompare}
          onShare={onShare}
        />
        <SharePreviewDialog
          open={state.shareDialogOpen}
          onOpenChange={state.setShareDialogOpen}
          product={product}
          selectedVariant={state.shareVariant}
        />
      </article>
    );
  }),
);

ProductCard.displayName = 'ProductCard';

