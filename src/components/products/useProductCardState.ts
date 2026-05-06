import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Product } from '@/hooks/useProducts';
import type { ExternalVariantStock } from '@/hooks/useExternalVariantStock';
import type { VariantActionMode } from './VariantPickerDialog';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useComparisonStore } from '@/stores/useComparisonStore';
import { showUndoToast, showErrorToast } from '@/utils/undoToast';

export function useProductCardState(product: Product, onToggleFavorite?: (id: string) => void, onToggleCompare?: (id: string) => any) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionVariant, setCollectionVariant] = useState<any>(undefined);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareVariant, setShareVariant] = useState<any>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [variantPickerMode, setVariantPickerMode] = useState<VariantActionMode>('favorite');
  
  const actionBusyRef = useRef(false);
  const favStore = useFavoritesStore();
  const compStore = useComparisonStore();

  const markBusy = useCallback(() => {
    actionBusyRef.current = true;
    setTimeout(() => {
      actionBusyRef.current = false;
    }, 500);
  }, []);

  const handleVariantComplete = useCallback(
    (variant: ExternalVariantStock | null) => {
      const variantInfo = variant
        ? {
            color_name: variant.color_name,
            color_hex: variant.color_hex,
            size_code: variant.size_code,
            variant_id: variant.id,
            thumbnail: variant.selected_thumbnail,
          }
        : undefined;

      if (variantPickerMode === 'favorite') {
        favStore.addFavorite(product.id, variantInfo);
        toast.success(`"${product.name}" favoritado${variant?.color_name ? ` — ${variant.color_name}` : ''}`);
      } else if (variantPickerMode === 'compare') {
        const result = compStore.addToCompare(product.id, variantInfo);
        if (!result) showErrorToast({ title: 'Limite de 4 produtos para comparação atingido' });
        else toast.success(`"${product.name}" adicionado à comparação${variant?.color_name ? ` — ${variant.color_name}` : ''}`);
      } else if (variantPickerMode === 'collection') {
        setCollectionVariant(variantInfo);
        setCollectionModalOpen(true);
      } else if (variantPickerMode === 'quote') {
        const params = new URLSearchParams({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku || '',
          product_price: String(product.price ?? 0),
        });
        if (variant?.color_name) params.set('color_name', variant.color_name);
        if (variant?.color_hex) params.set('color_hex', variant.color_hex);
        if (variant?.selected_thumbnail) params.set('product_image', variant.selected_thumbnail);
        if (product.images?.[0]) params.set('product_image', variant?.selected_thumbnail || product.images[0]);
        setTimeout(() => navigate(`/orcamentos/novo?${params.toString()}`), 0);
      } else if (variantPickerMode === 'share') {
        setShareVariant(variant ? {
          variantName: variant.color_name,
          colorHex: variant.color_hex,
          thumbnailUrl: variant.selected_thumbnail,
        } : null);
        setShareDialogOpen(true);
      }
    },
    [variantPickerMode, product, favStore, compStore, navigate]
  );

  const handleFavoriteAction = useCallback((e: React.MouseEvent, isFavorited: boolean) => {
    e.stopPropagation();
    markBusy();
    setActionsOpen(false);
    if (isFavorited) {
      if (onToggleFavorite) {
        onToggleFavorite(product.id);
        showUndoToast({
          title: `"${product.name}" removido dos favoritos`,
          onUndo: () => onToggleFavorite(product.id),
        });
      }
    } else {
      setVariantPickerMode('favorite');
      setVariantPickerOpen(true);
    }
  }, [product, onToggleFavorite, markBusy]);

  const handleCompareAction = useCallback((e: React.MouseEvent, isInCompare: boolean) => {
    e.stopPropagation();
    markBusy();
    setActionsOpen(false);
    if (isInCompare) {
      if (onToggleCompare) {
        onToggleCompare(product.id);
        showUndoToast({
          title: `"${product.name}" removido da comparação`,
          onUndo: () => onToggleCompare(product.id),
        });
      }
    } else {
      setVariantPickerMode('compare');
      setVariantPickerOpen(true);
    }
  }, [product, onToggleCompare, markBusy]);

  return {
    isHovered, setIsHovered,
    collectionModalOpen, setCollectionModalOpen,
    collectionVariant,
    quickViewOpen, setQuickViewOpen,
    shareDialogOpen, setShareDialogOpen,
    shareVariant,
    imageLoaded, setImageLoaded,
    actionsOpen, setActionsOpen,
    activeVariantIdx, setActiveVariantIdx,
    variantPickerOpen, setVariantPickerOpen,
    variantPickerMode, setVariantPickerMode,
    markBusy,
    actionBusy: actionBusyRef.current,
    handleVariantComplete,
    handleFavoriteAction,
    handleCompareAction
  };
}
