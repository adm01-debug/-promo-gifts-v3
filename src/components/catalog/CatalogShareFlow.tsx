import { useState, useRef } from 'react';
import { VariantPickerDialog } from '@/components/products/VariantPickerDialog';
import { SharePreviewDialog } from '@/components/products/share/SharePreviewDialog';
import type { Product } from '@/hooks/useProducts';
import type { ExternalVariantStock } from '@/hooks/useExternalVariantStock';

interface CatalogShareFlowProps {
  shareProduct: Product | null;
  setShareProduct: (product: Product | null) => void;
}

export function CatalogShareFlow({ shareProduct, setShareProduct }: CatalogShareFlowProps) {
  const [variantForShare, setVariantForShare] = useState<ExternalVariantStock | null | undefined>(
    undefined,
  );
  const variantSelectedRef = useRef(false);

  if (!shareProduct) return null;

  return (
    <>
      {/* Step 1: Variant picker for share */}
      {variantForShare === undefined && (
        <VariantPickerDialog
          open
          onOpenChange={(open) => {
            if (!open && !variantSelectedRef.current) {
              setShareProduct(null);
            }
            variantSelectedRef.current = false;
          }}
          productId={shareProduct.id}
          productName={shareProduct.name}
          mode="share"
          onComplete={(variant) => {
            variantSelectedRef.current = true;
            setVariantForShare(variant ?? null);
          }}
        />
      )}

      {/* Step 2: Share dialog after variant is chosen */}
      {variantForShare !== undefined && (
        <SharePreviewDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setShareProduct(null);
              setVariantForShare(undefined);
              variantSelectedRef.current = false;
            }
          }}
          product={shareProduct}
          selectedVariant={
            variantForShare
              ? {
                  variantName: variantForShare.color_name,
                  colorHex: variantForShare.color_hex,
                  thumbnailUrl: variantForShare.selected_thumbnail,
                }
              : null
          }
        />
      )}
    </>
  );
}
