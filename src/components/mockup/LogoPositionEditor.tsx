import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { processLogoForLaser, processLogoForSerigrafia } from "@/utils/laser-logo-processor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Move, RotateCw, RotateCcw, Target, Lock, FlipHorizontal2, FlipVertical2, Minus, Plus, Ruler, Palette } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useProductBounds } from "@/hooks/useProductBounds";
import type { TechniqueColorConfig } from "./techniqueColorUtils";

interface LogoPositionEditorProps {
  productImageUrl: string;
  logoPreview: string | null;
  positionX: number;
  positionY: number;
  logoWidth: number;
  logoHeight: number;
  logoRotation?: number;
  logoScale?: number;
  techniqueCode?: string | null;
  techniqueName?: string;
  maxWidth?: number | null;
  maxHeight?: number | null;
  /** Physical height of the product in cm (from external DB) */
  productHeightCm?: number | null;
  /** Physical width/diameter of the product in cm (from external DB) */
  productWidthCm?: number | null;
  /** Technique color configuration (laser tone, serigrafia colors, etc.) */
  techniqueColorConfig?: TechniqueColorConfig | null;
  /** Callback to open color config dialog */
  onColorConfigClick?: () => void;
  onPositionChange: (x: number, y: number) => void;
  onRotationChange?: (rotation: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onLogoScaleChange?: (scale: number) => void;
  /** Slot for action buttons rendered in the card header (e.g. Layout buttons) */
  headerActions?: React.ReactNode;
}

type TechniqueFilter = {
  filter: string;
  opacity: number;
  blend?: string;
  description: string;
};

// CSS filter effects to simulate different techniques
const TECHNIQUE_FILTERS: Record<string, TechniqueFilter> = {
  bordado: {
    filter: "contrast(1.1) saturate(0.9)",
    opacity: 0.85,
    description: "Textura de bordado",
  },
  silk: {
    filter: "contrast(1.2) saturate(1.1)",
    opacity: 0.9,
    description: "Serigrafia",
  },
  serigrafia: {
    filter: "contrast(1.2) saturate(1.1)",
    opacity: 0.9,
    description: "Serigrafia",
  },
  dtf: {
    filter: "brightness(1.05) saturate(1.2)",
    opacity: 0.95,
    description: "Transfer DTF",
  },
  laser: {
    filter: "grayscale(1) contrast(1.3) sepia(0.3)",
    opacity: 0.7,
    description: "Gravação laser",
  },
  laser_co2: {
    filter: "grayscale(1) contrast(1.2) sepia(0.4) brightness(0.9)",
    opacity: 0.75,
    description: "Laser CO2",
  },
  laser_fibra: {
    filter: "grayscale(1) contrast(1.4) brightness(1.1)",
    opacity: 0.8,
    description: "Laser Fibra",
  },
  sublimacao: {
    filter: "saturate(1.3) brightness(1.05)",
    opacity: 0.92,
    description: "Sublimação",
  },
  tampografia: {
    filter: "contrast(1.15)",
    opacity: 0.88,
    description: "Tampografia",
  },
  hot_stamping: {
    filter: "sepia(0.5) saturate(1.5) brightness(1.2) contrast(1.1)",
    opacity: 0.85,
    description: "Hot Stamping",
  },
  adesivo: {
    filter: "brightness(1.02)",
    opacity: 0.95,
    description: "Adesivo",
  },
  uv: {
    filter: "contrast(1.1) saturate(1.15) brightness(1.05)",
    opacity: 0.9,
    description: "Impressão UV",
  },
  transfer: {
    filter: "contrast(1.05)",
    opacity: 0.88,
    description: "Transfer",
  },
  default: {
    filter: "none",
    opacity: 1,
    description: "Preview",
  },
};

// Ordered matching rules: more specific patterns first to avoid false matches.
// e.g. "Serigrafia Vinílica UV" must match "serigrafia" NOT "uv".
const TECHNIQUE_MATCH_ORDER: Array<{ pattern: string; key: string }> = [
  { pattern: "laser_co2", key: "laser_co2" },
  { pattern: "laser_fibra", key: "laser_fibra" },
  { pattern: "co2", key: "laser_co2" },
  { pattern: "fibra", key: "laser_fibra" },
  { pattern: "laser", key: "laser" },
  { pattern: "bordado", key: "bordado" },
  { pattern: "serigrafia", key: "serigrafia" },
  { pattern: "silk", key: "silk" },
  { pattern: "dtf", key: "dtf" },
  { pattern: "sublima", key: "sublimacao" },
  { pattern: "tampografia", key: "tampografia" },
  { pattern: "hot_stamping", key: "hot_stamping" },
  { pattern: "hot stamping", key: "hot_stamping" },
  { pattern: "adesivo", key: "adesivo" },
  { pattern: "transfer", key: "transfer" },
  // "uv" MUST be last — it's a substring of many technique names
  { pattern: "uv", key: "uv" },
];

function getTechniqueFilter(techniqueCode?: string | null, techniqueName?: string) {
  if (!techniqueCode && !techniqueName) return TECHNIQUE_FILTERS.default;

  // CRITICAL: combine BOTH code AND name for matching,
  // so "Serigrafia Vinílica | UV | Cilíndrica" matches "serigrafia" even if code is "SUV_C"
  const combined = [techniqueCode, techniqueName].filter(Boolean).join(" ").toLowerCase();

  for (const rule of TECHNIQUE_MATCH_ORDER) {
    if (combined.includes(rule.pattern)) {
      return TECHNIQUE_FILTERS[rule.key];
    }
  }

  return TECHNIQUE_FILTERS.default;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    update();

    // ResizeObserver (modern browsers)
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    }

    // Fallback
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return { ref, size };
}

export function LogoPositionEditor({
  productImageUrl,
  logoPreview,
  positionX,
  positionY,
  logoWidth,
  logoHeight,
  logoRotation = 0,
  logoScale = 100,
  techniqueCode,
  techniqueName,
  maxWidth,
  maxHeight,
  productHeightCm,
  productWidthCm,
  techniqueColorConfig,
  onColorConfigClick,
  onPositionChange,
  onSizeChange,
  onRotationChange,
  onLogoScaleChange,
  headerActions,
}: LogoPositionEditorProps) {
  const { ref: containerRef, size: containerSize } = useElementSize<HTMLDivElement>();
  const productBounds = useProductBounds(productImageUrl);
  const showPreviewMode = true; // Always on — Preview toggle removed

  // ── Canvas-based logo processing (Laser + Serigrafia) ──────────────────────
  // Laser: converts all visible pixels to a single solid tone (claro/escuro).
  // Serigrafia: maps each pixel to the nearest selected Pantone color (solid, no gradients).
  // Both preserve white/transparent gaps between logo elements.
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);
  const [isProcessingLaser, setIsProcessingLaser] = useState(false);

  useEffect(() => {
    const isLaser = techniqueColorConfig?.category === "laser";
    const isSerigrafia = techniqueColorConfig?.category === "serigrafia";
    const needsProcessing = isLaser || isSerigrafia;

    if (!needsProcessing || !logoPreview || !showPreviewMode) {
      if (processedLogoUrl) {
        setProcessedLogoUrl(null);
      }
      return;
    }

    let cancelled = false;
    setIsProcessingLaser(true);

    let promise: Promise<string>;

    if (isLaser) {
      const tone = techniqueColorConfig?.laserTone || "escuro";
      promise = processLogoForLaser(logoPreview, tone);
    } else {
      // Serigrafia — use selected Pantone colors
      const selectedColors = techniqueColorConfig?.selectedColors || [];
      // Fallback: if no colors resolved yet (e.g. no logo uploaded at config time), skip processing
      if (selectedColors.length === 0) {
        setIsProcessingLaser(false);
        setProcessedLogoUrl(null);
        return;
      }
      promise = processLogoForSerigrafia(logoPreview, selectedColors);
    }

    promise
      .then((dataUrl) => {
        if (!cancelled) setProcessedLogoUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setProcessedLogoUrl(null);
      })
      .finally(() => {
        if (!cancelled) setIsProcessingLaser(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoPreview, techniqueColorConfig?.category, techniqueColorConfig?.laserTone, techniqueColorConfig?.selectedColors, showPreviewMode]);

  // Logo scale is a single percentage slider — proportionality is inherent.
  // No aspect lock needed here.

  const draggingRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const techniqueFilter = useMemo(
    () => getTechniqueFilter(techniqueCode, techniqueName),
    [techniqueCode, techniqueName]
  );

  // Override filter based on technique color configuration
  // NOTE: Canvas processing (processedLogoUrl) handles actual pixel conversion for laser + serigrafia.
  // These CSS filters are only FALLBACKS if canvas processing fails (CORS, etc.)
  const colorConfigFilter = useMemo(() => {
    if (!techniqueColorConfig) return null;
    
    if (techniqueColorConfig.category === "laser") {
      const tone = techniqueColorConfig.laserTone || "escuro";
      if (tone === "claro") {
        return { filter: "grayscale(1) brightness(1.4)", opacity: 0.75 };
      } else {
        return { filter: "grayscale(1) brightness(0.6)", opacity: 0.88 };
      }
    }
    
    // Serigrafia: canvas handles it — no CSS fallback needed (would distort colors)
    // Just reduce saturation slightly as a visual hint if canvas failed
    if (techniqueColorConfig.category === "serigrafia") {
      return { filter: "contrast(1.2)", opacity: 0.92 };
    }
    
    return null;
  }, [techniqueColorConfig]);

  // Convert cm to pixels using the product's real physical dimensions as the reference frame.
  // This ensures the engraving area is proportionally accurate relative to the product.
  //
  // CRITICAL — DO NOT CHANGE THIS LOGIC (fixed 2026-02-17):
  //   productHeightCm/productWidthCm come from `dimensions.height_cm` (external DB),
  //   NOT from `metadata.height_mm` (legacy field, almost always null).
  //   Ex: Squeeze 94623 has height_cm=21, width_cm=6.6 → a 2.5×6cm area renders
  //   proportionally small on the 21cm bottle, matching physical reality.
  //
   // Strategy: ONLY product-based physical scale (cm→px).
   // If product dims are missing, estimate from technique or use safe defaults.
   // Strategies 2 (60% fraction) and 3 (30cm reference) were REMOVED 2026-02-17
   // because they produced visually incorrect proportions. DO NOT RE-ADD.
  //
  // The product image fills the container via object-contain. We use canvas-based
  // bounding box detection to determine the real fraction the product occupies,
  // falling back to 85% if detection fails (complex background, CORS, etc.).
  // Wait for bounds detection before computing logo size to avoid flash of wrong proportions
  const boundsReady = productBounds.detected;

  const logoDisplay = useMemo(() => {
    // If bounds aren't detected yet, return null to prevent rendering with wrong fractions
    if (!boundsReady) return null;

    const containerW = containerSize.width || 400;
    const containerH = containerSize.height || containerW; // aspect-square

    const prodH = productHeightCm && productHeightCm > 0 ? productHeightCm : null;
    const prodW = productWidthCm && productWidthCm > 0 ? productWidthCm : null;

    const effectiveMaxW = maxWidth && maxWidth > 0 ? maxWidth : null;
    const effectiveMaxH = maxHeight && maxHeight > 0 ? maxHeight : null;

    // Calculate the RENDERED image size within the container (object-contain).
    const imgAR = productBounds.imageAspectRatio || 1;
    const containerAR = containerW / containerH;
    let renderedImgW: number, renderedImgH: number;
    if (imgAR > containerAR) {
      renderedImgW = containerW;
      renderedImgH = containerW / imgAR;
    } else {
      renderedImgH = containerH;
      renderedImgW = containerH * imgAR;
    }

    // SINGLE STRATEGY: Product-based physical scale (cm→px)
    // When product dims are unknown, estimate from technique limits or use 20cm default.
    const physW = prodW || (prodH ? prodH * 0.4 : (effectiveMaxW ? effectiveMaxW * 2 : 8));
    const physH = prodH || (prodW ? prodW * 2.5 : (effectiveMaxH ? effectiveMaxH * 2.5 : 20));

    if (!prodH && !prodW) {
      console.warn('[LogoPositionEditor] Product physical dims missing — using estimates:', { physW, physH });
    }

    const scaleByW = (renderedImgW * productBounds.fractionX) / physW;
    const scaleByH = (renderedImgH * productBounds.fractionY) / physH;
    const cmToPx = Math.min(scaleByW, scaleByH);

    const rawW = logoWidth * cmToPx;
    const rawH = logoHeight * cmToPx;
    const minPx = 40;
    if (rawW < minPx && rawH < minPx) {
      const boost = minPx / Math.max(rawW, rawH);
      return { widthPx: rawW * boost, heightPx: rawH * boost };
    }

    return { widthPx: rawW, heightPx: rawH };
  }, [boundsReady, logoWidth, logoHeight, containerSize.width, containerSize.height, maxWidth, maxHeight, productHeightCm, productWidthCm, productBounds]);

  // Logo scale — CSS transform scale(). overflow-hidden on container clips at area boundary.
  const userScaleFactor = (logoScale || 100) / 100;

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const container = containerRef.current;
      const drag = draggingRef.current;
      if (!container || !drag) return;

      const rect = container.getBoundingClientRect();
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;

      const nextX = drag.startPosX + (dx / rect.width) * 100;
      const nextY = drag.startPosY + (dy / rect.height) * 100;

      onPositionChange(Math.round(clamp(nextX, 5, 95)), Math.round(clamp(nextY, 5, 95)));
    },
    [onPositionChange, containerRef]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!logoPreview) return;
      e.preventDefault();
      e.stopPropagation();

      draggingRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPosX: positionX,
        startPosY: positionY,
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    [logoPreview, positionX, positionY, handlePointerMove, handlePointerUp]
  );

  

  const toggleOrientation = useCallback(() => {
    // Rotate the logo 90° within the fixed engraving area
    const currentRotation = logoRotation || 0;
    const newRotation = (currentRotation + 90) % 360;
    onRotationChange?.(newRotation);
  }, [logoRotation, onRotationChange]);

  const rotateClockwise = useCallback(() => {
    const newRotation = ((logoRotation || 0) + 15) % 360;
    onRotationChange?.(newRotation);
  }, [logoRotation, onRotationChange]);

  const rotateCounterClockwise = useCallback(() => {
    const newRotation = ((logoRotation || 0) - 15 + 360) % 360;
    onRotationChange?.(newRotation);
  }, [logoRotation, onRotationChange]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Move className="h-4 w-4 text-primary" />
              Posicionar Logo
            </CardTitle>
            <CardDescription className="text-xs">
              Arraste o logo para posicionar. Use os sliders para ajustar tamanho.
            </CardDescription>
          </div>
          {headerActions}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Technique preview indicator */}
        {showPreviewMode && techniqueName && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
            <div
              className="w-4 h-4 rounded-full border-2 border-primary"
              style={{
                background: techniqueFilter.filter.includes("grayscale")
                  ? "linear-gradient(135deg, hsl(var(--muted-foreground)), hsl(var(--muted)))"
                  : techniqueFilter.filter.includes("sepia")
                    ? "linear-gradient(135deg, hsl(var(--warning)), hsl(var(--warning) / 0.65))"
                    : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
              }}
            />
            <span className="text-xs text-muted-foreground">
              Simulando: <span className="font-medium text-foreground">{techniqueName}</span>
            </span>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {techniqueFilter.description}
            </Badge>
          </div>
        )}

        {/* Preview area */}
        <div
          ref={containerRef}
          className="relative rounded-lg border overflow-hidden bg-muted/30 aspect-square"
        >
          <img
            src={productImageUrl}
            alt="Imagem do produto para preview de personalização"
            className="absolute inset-0 w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              const t = e.currentTarget;
              const currentSrc = t.src;
              if (currentSrc.includes('/thumbnail')) {
                t.src = currentSrc.replace('/thumbnail', '');
              } else if (!currentSrc.endsWith('/placeholder.svg') && !t.dataset.fallback) {
                t.dataset.fallback = '1';
                t.src = '/placeholder.svg';
              }
            }}
          />

          {logoPreview && logoDisplay ? (
            <div
              className={cn(
                "absolute select-none touch-none overflow-hidden",
                "cursor-grab active:cursor-grabbing",
                "ring-2 ring-primary/30 rounded-sm"
              )}
              onPointerDown={handlePointerDown}
              style={{
                left: `${positionX}%`,
                top: `${positionY}%`,
                width: `${logoDisplay.widthPx}px`,
                height: `${logoDisplay.heightPx}px`,
                transform: `translate(-50%, -50%)`,
              }}
            >
              {/* Logo: object-contain fills area at 100%, CSS scale grows/shrinks */}
              {/* Laser + Serigrafia: src switches to canvas-processed image (solid colors, gaps preserved) */}
              <img
                src={
                  showPreviewMode && processedLogoUrl &&
                  (techniqueColorConfig?.category === "laser" || techniqueColorConfig?.category === "serigrafia")
                    ? processedLogoUrl
                    : logoPreview!
                }
                alt="Logo para personalização"
                className="absolute inset-0 w-full h-full object-contain"
                style={{
                  transform: `rotate(${logoRotation || 0}deg) scale(${userScaleFactor})`,
                  opacity: showPreviewMode
                    ? (processedLogoUrl &&
                       (techniqueColorConfig?.category === "laser" || techniqueColorConfig?.category === "serigrafia")
                        ? 0.92  // Canvas processed: no CSS filter needed, slight opacity for realism
                        : (colorConfigFilter?.opacity ?? techniqueFilter.opacity))
                    : 1,
                  filter: showPreviewMode &&
                    !(processedLogoUrl &&
                      (techniqueColorConfig?.category === "laser" || techniqueColorConfig?.category === "serigrafia"))
                    ? (colorConfigFilter?.filter ?? techniqueFilter.filter)
                    : "none",
                  mixBlendMode: (showPreviewMode ? techniqueFilter.blend : undefined) as any,
                }}
                draggable={false}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <p className="text-sm text-muted-foreground text-center px-4">
                Faça upload do logo para posicioná-lo
              </p>
            </div>
          )}

          {/* Live preview badge + Color config badge */}
          {showPreviewMode && logoPreview && (
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              <Badge
                variant="secondary"
                className="bg-background/90 backdrop-blur-sm text-[10px] gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Preview em tempo real
              </Badge>
              {techniqueColorConfig && (
                <Badge
                  variant="outline"
                  className="bg-background/90 backdrop-blur-sm text-[10px] gap-1 cursor-pointer hover:bg-accent"
                  onClick={onColorConfigClick}
                >
                  <Palette className="h-3 w-3" />
                  {techniqueColorConfig.category === "laser"
                    ? `Laser ${techniqueColorConfig.laserTone === "claro" ? "Claro" : "Escuro"}`
                    : techniqueColorConfig.category === "serigrafia"
                      ? `${techniqueColorConfig.colorCount || 1} cor${(techniqueColorConfig.colorCount || 1) > 1 ? "es" : ""}`
                      : "Policromia"
                  }
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Quick actions - 3 centering buttons */}
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPositionChange(50, positionY)}
                disabled={!logoPreview}
                className="flex-1"
              >
                <Target className="h-3.5 w-3.5 mr-1" />
                Centro V
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alinhar à linha vertical central</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPositionChange(50, 50)}
                disabled={!logoPreview}
                className="flex-1"
              >
                <Target className="h-3.5 w-3.5 mr-1" />
                Centro
              </Button>
            </TooltipTrigger>
            <TooltipContent>Centralizar horizontal e verticalmente</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPositionChange(positionX, 50)}
                disabled={!logoPreview}
                className="flex-1"
              >
                <Target className="h-3.5 w-3.5 mr-1" />
                Centro H
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alinhar à linha horizontal central</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleOrientation}
                disabled={!logoPreview}
                className="flex-1"
              >
                {((logoRotation || 0) % 180 === 0) ? (
                  <FlipVertical2 className="h-4 w-4 mr-1" />
                ) : (
                  <FlipHorizontal2 className="h-4 w-4 mr-1" />
                )}
                {((logoRotation || 0) % 180 === 0) ? "Vertical" : "Horizontal"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alternar orientação do logo</TooltipContent>
          </Tooltip>
        </div>
        {/* Rotation controls */}
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={rotateCounterClockwise}
            disabled={!logoPreview}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            -15°
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={logoRotation ? "secondary" : "outline"}
                size="sm"
                onClick={() => onRotationChange?.(0)}
                disabled={!logoPreview || !logoRotation}
                className="min-w-[48px]"
              >
                {logoRotation || 0}°
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resetar rotação para 0°</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            onClick={rotateClockwise}
            disabled={!logoPreview}
            className="flex-1"
          >
            <RotateCw className="h-4 w-4 mr-1" />
            +15°
          </Button>
        </div>

        {/* ── Área de Gravação (esquerda) + Tamanho da Logo (direita) ── */}
        <div className="flex gap-4 pt-2 border-t">
          {/* ─── LADO ESQUERDO: Área de Gravação ─── */}
          <div className="w-1/2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Área de Gravação</span>
              </div>
              {maxWidth && maxHeight && maxWidth > 0 && maxHeight > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  Máx {maxWidth}×{maxHeight}cm
                </Badge>
              )}
            </div>

            {/* Largura da área — independente, sem lock */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Largura</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={logoWidth <= 1}
                    onClick={() => onSizeChange(Math.max(1, logoWidth - 0.5), logoHeight)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-bold min-w-[44px] text-center bg-muted/50 rounded px-1.5 py-0.5">
                    {logoWidth}cm
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={logoWidth >= (maxWidth && maxWidth > 0 ? maxWidth : 20)}
                    onClick={() => onSizeChange(Math.min(maxWidth && maxWidth > 0 ? maxWidth : 20, logoWidth + 0.5), logoHeight)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Slider
                value={[logoWidth]}
                onValueChange={(v) => onSizeChange(v[0], logoHeight)}
                min={1}
                max={maxWidth && maxWidth > 0 ? maxWidth : 20}
                step={0.5}
                disabled={false}
              />
            </div>

            {/* Altura da área — independente, sem lock */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Altura</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={logoHeight <= 1}
                    onClick={() => onSizeChange(logoWidth, Math.max(1, logoHeight - 0.5))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-bold min-w-[44px] text-center bg-muted/50 rounded px-1.5 py-0.5">
                    {logoHeight}cm
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={logoHeight >= (maxHeight && maxHeight > 0 ? maxHeight : 20)}
                    onClick={() => onSizeChange(logoWidth, Math.min(maxHeight && maxHeight > 0 ? maxHeight : 20, logoHeight + 0.5))}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Slider
                value={[logoHeight]}
                onValueChange={(v) => onSizeChange(logoWidth, v[0])}
                min={1}
                max={maxHeight && maxHeight > 0 ? maxHeight : 20}
                step={0.5}
                disabled={false}
              />
            </div>

            {/* Área Máxima (sem lock aqui) */}
            <div className="flex items-center justify-end">
              {maxWidth && maxHeight && maxWidth > 0 && maxHeight > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-7 text-primary hover:text-primary px-1.5"
                  onClick={() => onSizeChange(maxWidth, maxHeight)}
                  disabled={false}
                >
                  <Target className="h-3 w-3 mr-1" />
                  Máxima
                </Button>
              )}
            </div>
          </div>

          {/* ─── LADO DIREITO: Tamanho da Logo ─── */}
          <div className="w-1/2 space-y-3">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">Tamanho da Logo</span>
            </div>

            {/* Escala do Logo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Escala</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!logoPreview || logoScale <= 10}
                    onClick={() => onLogoScaleChange?.(Math.max(10, logoScale - 5))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-bold min-w-[44px] text-center bg-muted/50 rounded px-1.5 py-0.5">
                    {logoScale}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!logoPreview || logoScale >= 500}
                    onClick={() => onLogoScaleChange?.(Math.min(500, logoScale + 5))}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Slider
                value={[logoScale]}
                onValueChange={(v) => onLogoScaleChange?.(v[0])}
                min={10}
                max={500}
                step={5}
                disabled={!logoPreview}
              />
            </div>

            {/* Reset escala + indicador de proporção protegida */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3 text-primary" />
                <span>Proporção protegida</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-7 text-primary hover:text-primary px-1.5"
                onClick={() => onLogoScaleChange?.(100)}
                disabled={!logoPreview || logoScale === 100}
              >
                <Target className="h-3 w-3 mr-1" />
                Resetar 100%
              </Button>
            </div>

            {/* Status */}
            <div className="pt-2 border-t">
              <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                <span>Pos: {positionX}% × {positionY}%</span>
                <span>Área: {logoWidth}×{logoHeight}cm</span>
                <span>
                  Escala: {logoScale}%{logoRotation ? ` · Rot: ${logoRotation}°` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
