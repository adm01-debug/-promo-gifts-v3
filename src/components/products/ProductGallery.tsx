import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Play, Maximize2, X, Move, RotateCcw, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { sortByColorGroup } from "@/utils/colorSorting";
import { getCdnUrl } from "@/utils/image-utils";

interface ProductVideo {
  id: string;
  url_stream: string | null;
  url_hls: string | null;
  url_thumbnail: string | null;
  url_original: string | null;
  source_youtube_id: string | null;
  video_type: string | null;
  display_order: number;
  is_primary: boolean;
  title: string | null;
}

interface ColorMedia {
  name: string;
  hex: string;
  sku?: string;
  stock?: number;
  image?: string;           // Imagem principal (retrocompatibilidade)
  images?: string[];        // Múltiplas fotos por cor
  videos?: string[];        // Vídeos por cor
}

interface ProductGalleryProps {
  images: string[];         // Imagens gerais (primeira = todas as cores)
  video?: string;           // Vídeo geral
  videos?: string[];        // Múltiplos vídeos gerais
  productVideos?: ProductVideo[]; // Vídeos estruturados da tabela product_videos
  productName: string;
  colors?: ColorMedia[];
  onColorSelect?: (colorIndex: number) => void;
  selectedColorIndex?: number;
}

/** Thumbnail with blur-to-sharp loading for color variation cards */
function ColorThumb({ src, alt, title }: { src: string; alt: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      title={title}
      className={cn(
        "w-full h-full object-cover transition-all duration-700 ease-out group-hover/color:scale-110",
        loaded ? "opacity-100 blur-0 scale-100" : "opacity-40 blur-sm scale-105"
      )}
      onLoad={() => setLoaded(true)}
      loading="lazy"
    />
  );
}

export function ProductGallery({ 
  images, 
  video,
  videos = [],
  productVideos = [],
  productName, 
  colors,
  onColorSelect,
  selectedColorIndex = 0
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const variationsScrollRef = useRef<HTMLDivElement>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Vídeos disponíveis (da tabela product_videos)
  const hasProductVideos = productVideos.length > 0;

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
          : "aspect-[4/3] rounded-2xl bg-white"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Background while loading */}
      {!isVideo(selectedIndex) && (
        <div className="absolute inset-0 bg-white" />
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
          src={inDialog ? allMedia[selectedIndex] : getCdnUrl(allMedia[selectedIndex], 'large')}
          alt={`${productName} - Imagem ${selectedIndex + 1}`}
          title={productName}
          className={cn(
            "w-full h-full object-contain transition-all duration-700 ease-out",
            zoom > 1 && "cursor-grab",
            isPanning && "cursor-grabbing",
            isAnimating && "scale-95 opacity-80",
            isImageLoading ? "opacity-40 blur-md scale-105" : "opacity-100 blur-0 scale-100"
          )}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          }}
          draggable={false}
          onLoad={() => setIsImageLoading(false)}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = allMedia[selectedIndex];
            }
          }}
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
        
        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-border/30 group-hover:shadow-2xl group-hover:shadow-primary/10 group-hover:border-primary/20 transition-all duration-500">
          <ImageView />

          {/* Play button - top right corner */}
          {hasProductVideos && (
            <button
              onClick={() => {
                setActiveVideoIndex(0);
                setIsVideoPlayerOpen(true);
              }}
              className={cn(
                "absolute top-4 right-4 z-20 flex items-center gap-2",
                "px-3 py-2 rounded-full",
                "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
                "shadow-xl hover:shadow-2xl hover:scale-105",
                "transition-all duration-300",
                "animate-fade-in"
              )}
            >
              <Play className="h-4 w-4 fill-white" />
              <span className="text-xs font-semibold">
                {productVideos.length > 1 ? `${productVideos.length} vídeos` : 'Vídeo'}
              </span>
            </button>
          )}

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
               aria-label="Voltar"><ChevronLeft className="h-6 w-6" />
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
               aria-label="Avançar"><ChevronRight className="h-6 w-6" />
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
              size="icon" aria-label="Maximizar"
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

      {/* Color Variations - Cards verticais abaixo da foto principal */}
      {colors && colors.length > 0 && (() => {
        // Ordenar cores seguindo o padrão: Preto → Branco → Azuis → Verdes → etc
        // Dentro de cada grupo: escuro → claro (usando hex para precisão)
        const sortedColors = sortByColorGroup(colors, (c) => c.name, (c) => c.hex);
        
        return (
        <div className="space-y-3 animate-fade-in mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Variações ({colors.length})</span>
            <button
              onClick={() => onColorSelect?.(-1)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full transition-all duration-200",
                selectedColorIndex === -1 || selectedColorIndex === undefined
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Ver Todas
            </button>
          </div>
          
          <div className="relative mt-1 group/variations">
            <div ref={variationsScrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin" style={{ scrollbarWidth: 'none' }}>
            {sortedColors.map((color) => {
              // Encontrar o índice original para manter a seleção funcionando
              const originalIndex = colors.findIndex(c => c.name === color.name && c.sku === color.sku);
              const hasVideos = color.videos && color.videos.length > 0;
              const isSelected = selectedColorIndex === originalIndex;
              const displayStock = color.stock !== undefined ? Math.max(0, color.stock) : undefined;
              const stockStatus = displayStock !== undefined 
                ? displayStock === 0 
                  ? { color: "text-destructive", label: "Sem estoque" }
                  : displayStock < 100 
                    ? { color: "text-warning", label: "Estoque baixo" }
                    : { color: "text-success", label: "Em estoque" }
                : null;
              
              return (
                <button
                  key={`${color.name}-${color.sku}`}
                  onClick={() => handleColorClick(originalIndex)}
                    className={cn(
                      "group/color relative shrink-0 w-24 rounded-xl overflow-hidden transition-all duration-300",
                      "bg-card shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1.5"
                    )}
                  style={{
                    border: isSelected ? `2px solid ${color.hex}` : '1px solid hsl(var(--border))',
                    boxShadow: isSelected ? `0 0 0 3px ${color.hex}30` : undefined
                  }}
                >
                  {/* Imagem da variação */}
                  <div className="relative aspect-[1/1.05] overflow-hidden">
                    {color.image || color.images?.[0] ? (
                      <ColorThumb 
                        src={getCdnUrl(color.images?.[0] || color.image || '', 'thumbnail')} 
                        alt={color.name}
                        title={color.name}
                      />
                    ) : (
                      <div 
                        className="w-full h-full" 
                        style={{ backgroundColor: color.hex }}
                      />
                    )}
                    
                    {/* Ícone de vídeo overlay - cor do produto */}
                    {hasVideos && (
                      <div 
                        className="absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: `${color.hex}cc` }}
                      >
                        <Play className="h-3 w-3 text-primary-foreground ml-0.5" />
                      </div>
                    )}
                    
                    {/* Indicador de seleção - cor do produto */}
                    {isSelected && (
                      <div 
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: color.hex }}
                      >
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info da variação */}
                  <div className="p-2 pb-2.5 space-y-1">
                    {/* Cor e nome */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border border-white/20 shadow-sm shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-xs font-medium text-foreground truncate">
                        {color.name}
                      </span>
                    </div>
                    
                    {/* SKU */}
                    {color.sku && (
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {color.sku}
                      </p>
                    )}
                    
                    {/* Estoque */}
                    {stockStatus && displayStock !== undefined && (
                      <div className="flex items-center gap-1">
                        <Package className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className={cn("text-[10px] font-medium", stockStatus.color)}>
                          {displayStock.toLocaleString("pt-BR")} un.
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
           </div>
            
            {/* Navigation arrows over carousel */}
            <Button
              variant="secondary"
              size="icon" aria-label="Voltar"
              className={cn(
                "absolute left-0 top-[30%] -translate-y-1/2 z-10 h-10 w-10 rounded-full",
                "bg-card/95 backdrop-blur-md shadow-xl border border-border/50",
                "opacity-0 group-hover/variations:opacity-100",
                "hover:bg-card hover:scale-110",
                "transition-all duration-300"
              )}
              onClick={() => {
                if (variationsScrollRef.current) {
                  variationsScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                }
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon" aria-label="Avançar"
              className={cn(
                "absolute right-0 top-[30%] -translate-y-1/2 z-10 h-10 w-10 rounded-full",
                "bg-card/95 backdrop-blur-md shadow-xl border border-border/50",
                "opacity-0 group-hover/variations:opacity-100",
                "hover:bg-card hover:scale-110",
                "transition-all duration-300"
              )}
              onClick={() => {
                if (variationsScrollRef.current) {
                  variationsScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                }
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
        );
      })()}

      {/* Thumbnails removidas - navegação via cards de variação ou setas */}

      {/* Fullscreen Dialog — modal style */}
      <Dialog open={isFullscreen} onOpenChange={(o) => { if (!o) { setIsFullscreen(false); resetZoom(); } }}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] p-0 overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Image area */}
          <div className="relative bg-white">
            <ImageView inDialog />

            {/* Navigation arrows */}
            {allMedia.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 transition-all duration-200"
                  onClick={goToPrevious}
                  aria-label="Voltar"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 transition-all duration-200"
                  onClick={goToNext}
                  aria-label="Avançar"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

            {/* Counter badge */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50">
              <span className="text-xs font-semibold">
                {selectedIndex + 1} / {allMedia.length}
              </span>
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${((selectedIndex + 1) / allMedia.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Zoom controls */}
            {!isVideo(selectedIndex) && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card transition-all duration-200"
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  aria-label="Reduzir"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                {zoom > 1 && (
                  <span className="text-[10px] font-semibold text-foreground px-1.5 py-0.5 rounded bg-card/90 backdrop-blur-md border border-border/50">
                    {Math.round(zoom * 100)}%
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card transition-all duration-200"
                  onClick={handleZoomIn}
                  disabled={zoom >= 4}
                  aria-label="Ampliar"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Thumbnails strip */}
          {allMedia.length > 1 && (
            <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-thin border-t border-border/40">
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
                    "relative shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all duration-200",
                    selectedIndex === index
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-card"
                      : "opacity-50 hover:opacity-100"
                  )}
                >
                  {isVideo(index) ? (
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                      <Play className="h-4 w-4 text-foreground" />
                    </div>
                  ) : (
                    <img
                      src={getCdnUrl(media, 'thumbnail')}
                      alt={`${productName} - ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={isVideoPlayerOpen} onOpenChange={setIsVideoPlayerOpen}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black border-none overflow-hidden">
          <div className="relative w-full">
            {/* Header com controles */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-2">
                {productVideos.length > 1 && (
                  <span className="text-primary-foreground/80 text-sm font-medium">
                    Vídeo {activeVideoIndex + 1} de {productVideos.length}
                  </span>
                )}
                {productVideos[activeVideoIndex]?.title && (
                  <span className="text-primary-foreground/60 text-sm">
                    — {productVideos[activeVideoIndex].title}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon" aria-label="Fechar"
                className="h-9 w-9 rounded-full text-primary-foreground hover:bg-white/20"
                onClick={() => setIsVideoPlayerOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Video player */}
            <div className="aspect-video w-full bg-black">
              {productVideos[activeVideoIndex]?.url_original ? (
                <video
                  src={productVideos[activeVideoIndex].url_original!}
                  controls
                  autoPlay
                  className="w-full h-full"
                  poster={productVideos[activeVideoIndex].url_thumbnail || undefined}
                />
              ) : productVideos[activeVideoIndex]?.url_hls ? (
                <video
                  src={productVideos[activeVideoIndex].url_hls!}
                  controls
                  autoPlay
                  className="w-full h-full"
                  poster={productVideos[activeVideoIndex].url_thumbnail || undefined}
                />
              ) : productVideos[activeVideoIndex]?.source_youtube_id ? (
                <iframe
                  src={`https://www.youtube.com/embed/${productVideos[activeVideoIndex].source_youtube_id}?autoplay=1&rel=0`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : productVideos[activeVideoIndex]?.url_stream ? (
                <iframe
                  src={`${productVideos[activeVideoIndex].url_stream}?autoplay=true&poster=${encodeURIComponent(productVideos[activeVideoIndex].url_thumbnail || '')}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : null}
            </div>

            {/* Thumbnails de vídeos múltiplos */}
            {productVideos.length > 1 && (
              <div className="flex gap-2 p-3 bg-black/95 overflow-x-auto">
                {productVideos.map((pv, idx) => (
                  <button
                    key={pv.id}
                    onClick={() => setActiveVideoIndex(idx)}
                    className={cn(
                      "relative shrink-0 w-24 aspect-video rounded-lg overflow-hidden transition-all duration-200",
                      activeVideoIndex === idx
                        ? "ring-2 ring-primary scale-105"
                        : "opacity-60 hover:opacity-100"
                    )}
                  >
                    {pv.url_thumbnail ? (
                      
<img src={pv.url_thumbnail} alt={pv.title || `Vídeo ${idx + 1}`} className="w-full h-full object-cover"  loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Play className="h-4 w-4 text-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-5 w-5 text-primary-foreground drop-shadow-lg fill-white/50" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
