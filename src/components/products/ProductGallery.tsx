import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Play, Maximize2, X, Move, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ColorMedia {
  name: string;
  hex: string;
  image?: string;           // Imagem principal (retrocompatibilidade)
  images?: string[];        // Múltiplas fotos por cor
  videos?: string[];        // Vídeos por cor
}

interface ProductGalleryProps {
  images: string[];         // Imagens gerais (primeira = todas as cores)
  video?: string;           // Vídeo geral
  videos?: string[];        // Múltiplos vídeos gerais
  productName: string;
  colors?: ColorMedia[];
  onColorSelect?: (colorIndex: number) => void;
  selectedColorIndex?: number;
}

export function ProductGallery({ 
  images, 
  video,
  videos = [],
  productName, 
  colors,
  onColorSelect,
  selectedColorIndex = 0
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Determinar mídias a exibir baseado na cor selecionada
  const selectedColor = colors?.[selectedColorIndex];
  
  // Se há uma cor selecionada com mídias específicas, usar essas
  // Caso contrário, usar mídias gerais do produto
  const displayImages = selectedColor?.images?.length 
    ? selectedColor.images 
    : selectedColor?.image 
      ? [selectedColor.image] 
      : images;
  
  const displayVideos = selectedColor?.videos?.length 
    ? selectedColor.videos 
    : video 
      ? [video, ...videos] 
      : videos;

  const allMedia = [...displayImages, ...displayVideos];
  const isVideo = (index: number) => index >= displayImages.length;

  // Função de reset do zoom - declarada antes dos useEffects
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Reset to first media when color changes
  useEffect(() => {
    setSelectedIndex(0);
    resetZoom();
  }, [selectedColorIndex, resetZoom]);

  // Reset loading state when image changes
  useEffect(() => {
    setIsImageLoading(true);
  }, [selectedIndex]);

  const goToPrevious = useCallback(() => {
    setIsAnimating(true);
    setSelectedIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1));
    resetZoom();
    setTimeout(() => setIsAnimating(false), 400);
  }, [allMedia.length, resetZoom]);

  const goToNext = useCallback(() => {
    setIsAnimating(true);
    setSelectedIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1));
    resetZoom();
    setTimeout(() => setIsAnimating(false), 400);
  }, [allMedia.length, resetZoom]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      const newX = e.clientX - panStartRef.current.x;
      const newY = e.clientY - panStartRef.current.y;
      const maxPan = (zoom - 1) * 150;
      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, newX)),
        y: Math.max(-maxPan, Math.min(maxPan, newY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isFullscreen) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
    if (e.key === "Escape") setIsFullscreen(false);
    if (e.key === "+" || e.key === "=") handleZoomIn();
    if (e.key === "-") handleZoomOut();
  }, [goToPrevious, goToNext]);

  const handleColorClick = (index: number) => {
    // Ao clicar na cor, selecionamos ela e resetamos para a primeira mídia
    setSelectedIndex(0);
    resetZoom();
    onColorSelect?.(index);
  };

  const ImageView = ({ inDialog = false }: { inDialog?: boolean }) => (
    <div
      ref={imageContainerRef}
      className={cn(
        "relative overflow-hidden",
        inDialog 
          ? "w-full h-full bg-background/50" 
          : "aspect-square rounded-2xl bg-gradient-to-br from-secondary/30 via-muted/20 to-secondary/30"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Loading shimmer */}
      {isImageLoading && !isVideo(selectedIndex) && (
        <div className="absolute inset-0 animate-shimmer z-10" />
      )}

      {isVideo(selectedIndex) ? (
        <video
          src={allMedia[selectedIndex]}
          controls
          className="w-full h-full object-contain animate-fade-in"
          poster={displayImages[0]}
        />
      ) : (
        <img
          src={allMedia[selectedIndex]}
          alt={`${productName} - Imagem ${selectedIndex + 1}`}
          className={cn(
            "w-full h-full object-contain transition-all duration-500 ease-out",
            zoom > 1 && "cursor-grab",
            isPanning && "cursor-grabbing",
            isAnimating && "scale-95 opacity-80",
            isImageLoading ? "opacity-0" : "opacity-100"
          )}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          }}
          draggable={false}
          onLoad={() => setIsImageLoading(false)}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Main image */}
      <div className="relative group">
        {/* Decorative background glow */}
        <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-border/50 group-hover:shadow-2xl group-hover:border-primary/20 transition-all duration-500">
          <ImageView />

          {/* Navigation arrows */}
          {allMedia.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full",
                  "bg-card/95 backdrop-blur-md shadow-xl border border-border/50",
                  "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
                  "hover:bg-card hover:scale-110 hover:shadow-2xl",
                  "transition-all duration-300"
                )}
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full",
                  "bg-card/95 backdrop-blur-md shadow-xl border border-border/50",
                  "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
                  "hover:bg-card hover:scale-110 hover:shadow-2xl",
                  "transition-all duration-300"
                )}
                onClick={goToNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Controls */}
          <div className={cn(
            "absolute bottom-4 right-4 flex gap-2",
            "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
            "transition-all duration-300 delay-100"
          )}>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 hover:bg-card hover:scale-110 transition-all duration-200"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Image counter with progress bar */}
          <div className={cn(
            "absolute bottom-4 left-4",
            "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
            "transition-all duration-300"
          )}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50">
              <span className="text-sm font-medium">
                {selectedIndex + 1} / {allMedia.length}
              </span>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${((selectedIndex + 1) / allMedia.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Color navigation */}
      {colors && colors.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <span className="text-sm font-medium text-muted-foreground">Cores disponíveis</span>
          <div className="flex gap-3 flex-wrap">
            {/* Botão para ver todas as cores (imagens gerais) */}
            <button
              onClick={() => onColorSelect?.(-1)}
              className={cn(
                "group/color relative w-14 h-14 rounded-xl overflow-hidden transition-all duration-300",
                "ring-offset-background shadow-md hover:shadow-xl hover:-translate-y-1",
                "bg-gradient-to-br from-secondary to-muted flex items-center justify-center",
                selectedColorIndex === -1 || selectedColorIndex === undefined
                  ? "ring-2 ring-primary ring-offset-2 scale-105"
                  : "hover:ring-2 hover:ring-muted-foreground/50 hover:ring-offset-2"
              )}
              title="Ver todas as cores"
            >
              <div className="flex flex-wrap gap-0.5 p-1">
                {colors.slice(0, 4).map((color, i) => (
                  <div 
                    key={i}
                    className="w-5 h-5 rounded-sm"
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
            </button>
            
            {colors.map((color, index) => (
              <button
                key={color.name}
                onClick={() => handleColorClick(index)}
                className={cn(
                  "group/color relative w-14 h-14 rounded-xl overflow-hidden transition-all duration-300",
                  "ring-offset-background shadow-md hover:shadow-xl hover:-translate-y-1",
                  selectedColorIndex === index
                    ? "ring-2 ring-primary ring-offset-2 scale-105"
                    : "hover:ring-2 hover:ring-muted-foreground/50 hover:ring-offset-2"
                )}
                title={color.name}
              >
                {color.image || color.images?.[0] ? (
                  <img 
                    src={color.images?.[0] || color.image} 
                    alt={color.name} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/color:scale-110"
                  />
                ) : (
                  <div 
                    className="w-full h-full" 
                    style={{ backgroundColor: color.hex }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent opacity-0 group-hover/color:opacity-100 transition-opacity duration-300" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thumbnails */}
      {allMedia.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin animate-fade-in" style={{ animationDelay: '100ms' }}>
          {allMedia.map((media, index) => (
            <button
              key={index}
              onClick={() => {
                setIsAnimating(true);
                setSelectedIndex(index);
                resetZoom();
                setTimeout(() => setIsAnimating(false), 400);
              }}
              className={cn(
                "relative shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all duration-300",
                "shadow-md hover:shadow-lg hover:-translate-y-1",
                selectedIndex === index
                  ? "ring-2 ring-primary ring-offset-2 scale-105"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              {isVideo(index) ? (
                <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-card/80 flex items-center justify-center">
                    <Play className="h-5 w-5 text-foreground ml-0.5" />
                  </div>
                </div>
              ) : (
                <img
                  src={media}
                  alt={`${productName} - Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              {selectedIndex === index && (
                <div className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent 
          className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 bg-background/98 backdrop-blur-2xl border-none"
          onKeyDown={handleKeyDown}
        >
          <div className="relative w-full h-full flex flex-col">
            {/* Fullscreen header */}
            <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50">
                  <span className="text-sm font-semibold">
                    {selectedIndex + 1} / {allMedia.length}
                  </span>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${((selectedIndex + 1) / allMedia.length) * 100}%` }}
                    />
                  </div>
                </div>
                {zoom > 1 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 animate-fade-in">
                    <Move className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{Math.round(zoom * 100)}%</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {!isVideo(selectedIndex) && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-11 w-11 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 hover:bg-card hover:scale-105 transition-all duration-200"
                      onClick={handleZoomOut}
                      disabled={zoom <= 1}
                    >
                      <ZoomOut className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-11 w-11 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 hover:bg-card hover:scale-105 transition-all duration-200"
                      onClick={handleZoomIn}
                      disabled={zoom >= 4}
                    >
                      <ZoomIn className="h-5 w-5" />
                    </Button>
                    {zoom > 1 && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-11 w-11 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 hover:bg-card hover:scale-105 transition-all duration-200 animate-fade-in"
                        onClick={resetZoom}
                      >
                        <RotateCcw className="h-5 w-5" />
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-11 w-11 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 hover:bg-destructive/10 hover:border-destructive/30 hover:scale-105 transition-all duration-200"
                  onClick={() => {
                    setIsFullscreen(false);
                    resetZoom();
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Fullscreen image */}
            <div className="flex-1 flex items-center justify-center p-20">
              <ImageView inDialog />
            </div>

            {/* Fullscreen navigation */}
            {allMedia.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-6 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 hover:bg-card hover:scale-110 transition-all duration-200"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-7 w-7" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-6 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 hover:bg-card hover:scale-110 transition-all duration-200"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-7 w-7" />
                </Button>
              </>
            )}

            {/* Fullscreen thumbnails */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 p-3 rounded-2xl bg-card/95 backdrop-blur-md shadow-2xl border border-border/50 max-w-[85vw] overflow-x-auto scrollbar-thin">
              {allMedia.map((media, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsAnimating(true);
                    setSelectedIndex(index);
                    resetZoom();
                    setTimeout(() => setIsAnimating(false), 400);
                  }}
                  className={cn(
                    "relative shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all duration-300",
                    selectedIndex === index
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-105"
                      : "opacity-50 hover:opacity-100 hover:scale-105"
                  )}
                >
                  {isVideo(index) ? (
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                      <Play className="h-5 w-5 text-foreground" />
                    </div>
                  ) : (
                    <img
                      src={media}
                      alt={`${productName} - Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
