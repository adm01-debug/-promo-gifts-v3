/**
 * MockupLayoutButtons — "Gerar Layout" buttons for the mockup result panel.
 * Two modes: AI (uses existing generated mockup) and Static (high-res composition).
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { detectProductBounds } from "@/lib/product-bounds-detector";
import { MockupApprovalPreview } from "./MockupApprovalPreview";
import type { MockupApprovalData } from "@/types/mockup-approval";
import type { MockupClient } from "@/components/mockup/MockupConfigPanel";
import type { DetectedColor } from "@/hooks/useLogoColorAnalysis";

interface MockupLayoutButtonsProps {
  /** The AI-generated mockup URL */
  generatedMockup: string | null;
  /** Product info */
  product: {
    name: string;
    sku?: string;
    imageUrl?: string;
    color?: string;
    colorHex?: string;
    material?: string;
  } | null;
  /** Selected technique */
  technique: {
    name: string;
    code?: string | null;
    maxWidth?: number | null;
    maxHeight?: number | null;
    locationName?: string | null;
  } | null;
  /** Selected client */
  client: MockupClient | null;
  /** Seller info */
  seller: {
    name: string;
    email?: string;
  } | null;
  /** Active personalization area dimensions */
  activeArea: {
    logoWidth: number;
    logoHeight: number;
    logoPreview?: string | null;
    positionX: number;
    positionY: number;
    logoRotation?: number;
    logoScale?: number;
    name: string;
  } | null;
  /** Physical product dimensions in cm */
  productHeightCm?: number | null;
  productWidthCm?: number | null;
  /** Pantone colors from logo analysis */
  pantoneColors?: DetectedColor[];
  /** Number of colors from technique config */
  colorsCount?: number;
}

export function MockupLayoutButtons({
  generatedMockup,
  product,
  technique,
  client,
  seller,
  activeArea,
  productHeightCm,
  productWidthCm,
  pantoneColors,
  colorsCount,
}: MockupLayoutButtonsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [approvalData, setApprovalData] = useState<MockupApprovalData | null>(null);
  const [isGeneratingStatic, setIsGeneratingStatic] = useState(false);

  const buildApprovalData = useCallback((mockupUrl: string, mode: 'ai' | 'static'): MockupApprovalData => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const docNumber = `MK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    return {
      documentNumber: docNumber,
      date: dateStr,
      client: {
        name: client?.nome_fantasia || client?.razao_social || client?.name || "—",
        cnpj: client?.cnpj,
        logoUrl: client?.logo_url || undefined,
      },
      seller: {
        name: seller?.name || "—",
        email: seller?.email,
      },
      product: {
        name: product?.name || "—",
        sku: product?.sku,
        imageUrl: product?.imageUrl,
        color: product?.color,
        colorHex: product?.colorHex,
        material: product?.material,
      },
      personalization: {
        techniqueName: technique?.name || "—",
        techniqueCode: technique?.code || undefined,
        locationName: technique?.locationName || activeArea?.name || "Frente",
        widthCm: activeArea?.logoWidth || technique?.maxWidth || 0,
        heightCm: activeArea?.logoHeight || technique?.maxHeight || 0,
        colorsCount: colorsCount,
      },
      pantoneColors: (pantoneColors || []).map(c => ({
        name: c.selectedPantone || c.pantoneMatch?.name || c.name,
        hex: c.hex,
      })),
      mockupImageUrl: mockupUrl,
      layoutMode: mode,
    };
  }, [client, seller, product, technique, activeArea, pantoneColors, colorsCount]);

  const handleLayoutAI = useCallback(() => {
    if (!generatedMockup) {
      toast.error("Gere um mockup com IA primeiro.");
      return;
    }
    const data = buildApprovalData(generatedMockup, "ai");
    setApprovalData(data);
    setPreviewOpen(true);
  }, [generatedMockup, buildApprovalData]);

  const handleLayoutStatic = useCallback(async () => {
    if (!product?.imageUrl || !activeArea?.logoPreview) {
      toast.error("Selecione um produto e faça upload do logo primeiro.");
      return;
    }

    setIsGeneratingStatic(true);
    try {
      const CANVAS_SIZE = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Load product image with CORS fallback
      const productImg = await loadImageWithFallback(product.imageUrl);

      // Detect product bounds (same as editor's useProductBounds)
      const bounds = await detectProductBounds(product.imageUrl);

      // Draw product centered with object-contain logic (matches editor)
      const imgAR = productImg.naturalWidth / productImg.naturalHeight;
      let renderedImgW: number, renderedImgH: number;
      if (imgAR > 1) {
        renderedImgW = CANVAS_SIZE;
        renderedImgH = CANVAS_SIZE / imgAR;
      } else {
        renderedImgH = CANVAS_SIZE;
        renderedImgW = CANVAS_SIZE * imgAR;
      }
      const imgLeft = (CANVAS_SIZE - renderedImgW) / 2;
      const imgTop = (CANVAS_SIZE - renderedImgH) / 2;
      ctx.drawImage(productImg, imgLeft, imgTop, renderedImgW, renderedImgH);

      // Load logo
      const logoImg = await loadImageWithFallback(activeArea.logoPreview);

      // ── Replicate editor's cm→px scaling logic exactly ──
      const effectiveMaxW = technique?.maxWidth && technique.maxWidth > 0 ? technique.maxWidth : null;
      const effectiveMaxH = technique?.maxHeight && technique.maxHeight > 0 ? technique.maxHeight : null;
      const prodH = productHeightCm && productHeightCm > 0 ? productHeightCm : null;
      const prodW = productWidthCm && productWidthCm > 0 ? productWidthCm : null;

      const physW = prodW || (prodH ? prodH * 0.4 : (effectiveMaxW ? effectiveMaxW * 2 : 8));
      const physH = prodH || (prodW ? prodW * 2.5 : (effectiveMaxH ? effectiveMaxH * 2.5 : 20));

      const scaleByW = (renderedImgW * bounds.fractionX) / physW;
      const scaleByH = (renderedImgH * bounds.fractionY) / physH;
      const cmToPx = Math.min(scaleByW, scaleByH);

      let lW = activeArea.logoWidth * cmToPx;
      let lH = activeArea.logoHeight * cmToPx;
      const minPx = 40;
      if (lW < minPx && lH < minPx) {
        const boost = minPx / Math.max(lW, lH);
        lW *= boost;
        lH *= boost;
      }

      // Apply user scale (same as editor's CSS transform scale)
      const userScale = (activeArea.logoScale ?? 100) / 100;
      lW *= userScale;
      lH *= userScale;

      // Position: positionX/Y are % of the entire canvas (matching editor's left/top %)
      const lX = (activeArea.positionX / 100) * CANVAS_SIZE - lW / 2;
      const lY = (activeArea.positionY / 100) * CANVAS_SIZE - lH / 2;

      // Apply rotation if needed
      const rotation = activeArea.logoRotation || 0;
      if (rotation !== 0) {
        ctx.save();
        ctx.translate(lX + lW / 2, lY + lH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(logoImg, -lW / 2, -lH / 2, lW, lH);
        ctx.restore();
      } else {
        ctx.drawImage(logoImg, lX, lY, lW, lH);
      }

      const dataUrl = canvas.toDataURL("image/png");
      const data = buildApprovalData(dataUrl, "static");
      setApprovalData(data);
      setPreviewOpen(true);
    } catch (err) {
      console.error("Static composition error:", err);
      toast.error("Erro ao gerar composição estática. Verifique se as imagens estão acessíveis.");
    } finally {
      setIsGeneratingStatic(false);
    }
  }, [product, activeArea, technique, productHeightCm, productWidthCm, buildApprovalData]);

  // Don't show if no product/technique selected
  if (!product || !technique || !activeArea) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLayoutAI}
          disabled={!generatedMockup}
          className="flex-1 gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Layout</span> com IA
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLayoutStatic}
          disabled={!activeArea?.logoPreview || isGeneratingStatic}
          className="flex-1 gap-1.5"
        >
          {isGeneratingStatic ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Layout</span> sem IA
        </Button>
      </div>

      {approvalData && (
        <MockupApprovalPreview
          data={approvalData}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </>
  );
}

/* ─── Util: Load image with CORS fallback ─── */
async function loadImageWithFallback(src: string): Promise<HTMLImageElement> {
  // Try with CORS first
  try {
    return await loadImage(src, true);
  } catch {
    // Fallback: fetch as blob to bypass CORS
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const img = await loadImage(blobUrl, false);
      URL.revokeObjectURL(blobUrl);
      return img;
    } catch {
      // Last resort: try without CORS attribute (will taint canvas but at least renders)
      return loadImage(src, false);
    }
  }
}

function loadImage(src: string, useCors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
