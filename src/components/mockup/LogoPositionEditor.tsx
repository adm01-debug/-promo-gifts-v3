import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Move, RotateCw, RotateCcw, Target, Eye, Lock, Unlock, FlipHorizontal2, FlipVertical2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  onPositionChange: (x: number, y: number) => void;
  onRotationChange?: (rotation: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onLogoScaleChange?: (scale: number) => void;
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

function getTechniqueFilter(techniqueCode?: string | null, techniqueName?: string) {
  if (!techniqueCode && !techniqueName) return TECHNIQUE_FILTERS.default;

  const code = (techniqueCode || techniqueName || "").toLowerCase();

  for (const [key, value] of Object.entries(TECHNIQUE_FILTERS)) {
    if (code.includes(key)) return value;
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
  onPositionChange,
  onSizeChange,
  onRotationChange,
  onLogoScaleChange,
}: LogoPositionEditorProps) {
  const { ref: containerRef, size: containerSize } = useElementSize<HTMLDivElement>();
  const [showPreviewMode, setShowPreviewMode] = useState(true);
  const [aspectLocked, setAspectLocked] = useState(true);
  const aspectRatioRef = useRef(logoWidth / logoHeight);

  // Update aspect ratio reference when lock is toggled on
  const toggleAspectLock = useCallback(() => {
    if (!aspectLocked) {
      aspectRatioRef.current = logoWidth / logoHeight;
    }
    setAspectLocked(!aspectLocked);
  }, [aspectLocked, logoWidth, logoHeight]);

  const handleLockedSizeChange = useCallback((newWidth: number, newHeight: number, changedAxis: 'w' | 'h') => {
    if (!aspectLocked) {
      onSizeChange(newWidth, newHeight);
      return;
    }
    const ratio = aspectRatioRef.current;
    const effectiveMaxW = maxWidth && maxWidth > 0 ? maxWidth : 20;
    const effectiveMaxH = maxHeight && maxHeight > 0 ? maxHeight : 20;
    if (changedAxis === 'w') {
      const h = Math.round((newWidth / ratio) * 2) / 2; // snap to 0.5
      onSizeChange(newWidth, Math.min(Math.max(h, 1), effectiveMaxH));
    } else {
      const w = Math.round((newHeight * ratio) * 2) / 2;
      onSizeChange(Math.min(Math.max(w, 1), effectiveMaxW), newHeight);
    }
  }, [aspectLocked, onSizeChange, maxWidth, maxHeight]);

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

  // Convert cm to pixels relative to container, using real product area dimensions when available.
  // If maxWidth/maxHeight are known, scale so that the max area occupies ~60% of the container,
  // making the logo proportionally accurate to the real product.
  const logoDisplay = useMemo(() => {
    const containerW = containerSize.width || 400;
    const containerH = containerSize.height || containerW; // aspect-square

    const effectiveMaxW = maxWidth && maxWidth > 0 ? maxWidth : null;
    const effectiveMaxH = maxHeight && maxHeight > 0 ? maxHeight : null;

    if (effectiveMaxW && effectiveMaxH) {
      // Scale so the max engraving area fits ~60% of container (visually representative)
      const areaFraction = 0.6;
      const scaleByW = (containerW * areaFraction) / effectiveMaxW;
      const scaleByH = (containerH * areaFraction) / effectiveMaxH;
      const scale = Math.min(scaleByW, scaleByH);
      return {
        widthPx: logoWidth * scale,
        heightPx: logoHeight * scale,
      };
    }

    // Fallback: old 30cm reference
    const scale = containerW / 30;
    return {
      widthPx: logoWidth * scale,
      heightPx: logoHeight * scale,
    };
  }, [logoWidth, logoHeight, containerSize.width, containerSize.height, maxWidth, maxHeight]);

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
          <Button
            variant={showPreviewMode ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPreviewMode(!showPreviewMode)}
            className="gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
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

          {logoPreview ? (
            <div
              className={cn(
                "absolute select-none touch-none",
                "cursor-grab active:cursor-grabbing",
                "ring-2 ring-primary/30 rounded-sm",
                "overflow-hidden"
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
              <img
                src={logoPreview}
                alt="Logo para personalização"
                className="w-full h-full object-fill"
                style={{
                  transform: `rotate(${logoRotation || 0}deg) scale(${(logoScale || 100) / 100})`,
                  opacity: showPreviewMode ? techniqueFilter.opacity : 1,
                  filter: showPreviewMode ? techniqueFilter.filter : "none",
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

          {/* Live preview badge */}
          {showPreviewMode && logoPreview && (
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="bg-background/90 backdrop-blur-sm text-[10px] gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Preview em tempo real
              </Badge>
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

        {/* Logo scale control */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-medium">Escala do Logo</span>
            <span className="font-medium">{logoScale}%</span>
          </div>
          <Slider
            value={[logoScale]}
            onValueChange={(v) => onLogoScaleChange?.(v[0])}
            min={10}
            max={100}
            step={5}
            disabled={!logoPreview}
          />
        </div>


        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Dimensões</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={aspectLocked ? "default" : "outline"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={toggleAspectLock}
                  disabled={!logoPreview}
                >
                  {aspectLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{aspectLocked ? "Proporção travada" : "Travar proporção"}</TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Largura</span>
                <span className="font-medium">{logoWidth} cm{maxWidth ? ` / ${maxWidth}` : ''}</span>
              </div>
              <Slider
                value={[logoWidth]}
                onValueChange={(v) => handleLockedSizeChange(v[0], logoHeight, 'w')}
                min={1}
                max={maxWidth && maxWidth > 0 ? maxWidth : 20}
                step={0.5}
                disabled={!logoPreview}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Altura</span>
                <span className="font-medium">{logoHeight} cm{maxHeight ? ` / ${maxHeight}` : ''}</span>
              </div>
              <Slider
                value={[logoHeight]}
                onValueChange={(v) => handleLockedSizeChange(logoWidth, v[0], 'h')}
                min={1}
                max={maxHeight && maxHeight > 0 ? maxHeight : 20}
                step={0.5}
                disabled={!logoPreview}
              />
            </div>
          </div>
        </div>

        {/* Área Máxima shortcut */}
        {maxWidth && maxHeight && maxWidth > 0 && maxHeight > 0 && (
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-primary hover:text-primary"
              onClick={() => onSizeChange(maxWidth, maxHeight)}
              disabled={!logoPreview}
            >
              <Target className="h-3 w-3 mr-1" />
              Área Máxima ({maxWidth}×{maxHeight}cm)
            </Button>
          </div>
        )}

        {/* Position display */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            Posição: {positionX}% x {positionY}%
          </span>
          <span>
            {logoWidth}cm × {logoHeight}cm{logoScale < 100 ? ` · ${logoScale}%` : ''}{logoRotation ? ` · ${logoRotation}°` : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
