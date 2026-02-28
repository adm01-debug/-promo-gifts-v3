/**
 * MockupLayoutButtons — "Gerar Layout" buttons for the mockup result panel.
 * Two modes: AI (uses existing generated mockup) and Static (high-res composition).
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
    name: string;
  } | null;
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
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1024, 1024);

      // Load product image with CORS fallback
      const productImg = await loadImageWithFallback(product.imageUrl);
      // Draw product centered, fitting
      const pScale = Math.min(1024 / productImg.width, 1024 / productImg.height) * 0.85;
      const pW = productImg.width * pScale;
      const pH = productImg.height * pScale;
      ctx.drawImage(productImg, (1024 - pW) / 2, (1024 - pH) / 2, pW, pH);

      // Load logo
      const logoImg = await loadImageWithFallback(activeArea.logoPreview);
      
      // Calculate logo size proportionally based on technique dimensions relative to product
      // Use the area dimensions (logoWidth × logoHeight in cm) relative to technique max
      const techMaxW = technique?.maxWidth || 10;
      const techMaxH = technique?.maxHeight || 10;
      const logoRatioW = (activeArea.logoWidth || techMaxW) / techMaxW;
      const logoRatioH = (activeArea.logoHeight || techMaxH) / techMaxH;
      
      // Logo occupies a proportional area of the product rendering zone
      const maxLogoZone = pW * 0.5; // max 50% of product width
      const lW = maxLogoZone * logoRatioW;
      const aspectRatio = logoImg.height / logoImg.width;
      const lH = Math.min(lW * aspectRatio, pH * 0.5 * logoRatioH);
      const finalLW = lH / aspectRatio > lW ? lW : lH / aspectRatio;
      
      // Position based on percentage within the product area
      const productLeft = (1024 - pW) / 2;
      const productTop = (1024 - pH) / 2;
      const lX = productLeft + (activeArea.positionX / 100) * pW - finalLW / 2;
      const lY = productTop + (activeArea.positionY / 100) * pH - lH / 2;
      
      ctx.drawImage(logoImg, lX, lY, finalLW, lH);

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
  }, [product, activeArea, technique, buildApprovalData]);

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
