import { useState, useEffect } from "react";
import { detectProductBounds, type ProductBounds } from "@/lib/product-bounds-detector";

const DEFAULT: ProductBounds = {
  fractionX: 0.85,
  fractionY: 0.85,
  centerX: 0.5,
  centerY: 0.5,
  detected: false,
  imageAspectRatio: 1,
};

/**
 * Hook that detects the product's real bounding box in its catalog image.
 * Returns fraction values used for cm→px scaling.
 */
export function useProductBounds(imageUrl: string | null | undefined): ProductBounds {
  const [bounds, setBounds] = useState<ProductBounds>(DEFAULT);

  useEffect(() => {
    if (!imageUrl) {
      setBounds(DEFAULT);
      return;
    }

    let cancelled = false;

    detectProductBounds(imageUrl).then((result) => {
      if (!cancelled) setBounds(result);
    });

    return () => { cancelled = true; };
  }, [imageUrl]);

  return bounds;
}
