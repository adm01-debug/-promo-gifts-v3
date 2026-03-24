/**
 * ZoomableGallery - Galeria de imagens com zoom avançado
 * Suporta pinch-to-zoom, double-tap zoom, e controles de teclado
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ZoomableGalleryProps {
  images: string[];
  productName: string;
  className?: string;
  onShare?: (imageUrl: string) => void;
  onDownload?: (imageUrl: string) => void;
}

export function ZoomableGallery({
  images,
  productName,
  className,
  onShare,
  onDownload,
}: ZoomableGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [, setIsZooming] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [rotation, setRotation] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Transformações baseadas no zoom
  const scale = useMotionValue(1);
  // constraintsRef reservado para uso futuro em drag constraints

  // Reset zoom e posição ao mudar de imagem
  useEffect(() => {
    resetView();
  }, [currentIndex]);

  const resetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
    scale.set(1);
    x.set(0);
    y.set(0);
    setIsZooming(false);
  }, [scale, x, y]);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + 0.5, 5);
    setZoom(newZoom);
    scale.set(newZoom);
    setIsZooming(newZoom > 1);
  }, [zoom, scale]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - 0.5, 1);
    setZoom(newZoom);
    scale.set(newZoom);
    if (newZoom === 1) {
      x.set(0);
      y.set(0);
      setIsZooming(false);
    }
  }, [zoom, scale, x, y]);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // Double tap para zoom
  const handleDoubleTap = useCallback(() => {
    if (zoom > 1) {
      resetView();
    } else {
      setZoom(2.5);
      scale.set(2.5);
      setIsZooming(true);
    }
  }, [zoom, resetView, scale]);

  // Detectar double tap
  const handleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleDoubleTap();
    }
    lastTapRef.current = now;
  }, [handleDoubleTap]);

  // Navegação
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      
      switch (e.key) {
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "Escape":
          setIsFullscreen(false);
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "r":
          handleRotate();
          break;
        case "0":
          resetView();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, goToPrevious, goToNext, handleZoomIn, handleZoomOut, handleRotate, resetView]);

  // Handle pan/drag when zoomed
  const handlePan = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (zoom > 1) {
      const maxOffset = (zoom - 1) * 100;
      const newX = Math.max(-maxOffset, Math.min(maxOffset, x.get() + info.delta.x));
      const newY = Math.max(-maxOffset, Math.min(maxOffset, y.get() + info.delta.y));
      x.set(newX);
      y.set(newY);
    }
  };

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isFullscreen) return;
    e.preventDefault();
    
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [isFullscreen, handleZoomIn, handleZoomOut]);

  const ImageViewer = ({ fullscreen = false }: { fullscreen?: boolean }) => (
    <motion.div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        fullscreen ? "w-full h-full" : "aspect-square rounded-2xl"
      )}
      onWheel={handleWheel}
    >
      <motion.img
        src={images[currentIndex]}
        alt={`${productName} - ${currentIndex + 1}`}
        className={cn(
          "w-full h-full object-contain select-none",
          zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        )}
        style={{
          scale,
          x,
          y,
          rotate: rotation,
        }}
        drag={zoom > 1}
        dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
        dragElastic={0.1}
        onPan={handlePan}
        onTap={handleTap}
        draggable={false}
      />

      {/* Zoom indicator */}
      <AnimatePresence>
        {zoom > 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm text-sm font-medium shadow-lg"
          >
            {Math.round(zoom * 100)}%
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <>
      <div className={cn("space-y-4", className)}>
        {/* Main Image */}
        <div className="relative group">
          <div className="rounded-2xl overflow-hidden border border-border/50 shadow-lg group-hover:shadow-xl transition-shadow">
            <ImageViewer />
          </div>

          {/* Navigation - Always visible translucent arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full",
                  "bg-black/30 hover:bg-black/50 backdrop-blur-sm",
                  "text-white/80 hover:text-white",
                  "transition-all duration-200 border-0"
                )}
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full",
                  "bg-black/30 hover:bg-black/50 backdrop-blur-sm",
                  "text-white/80 hover:text-white",
                  "transition-all duration-200 border-0"
                )}
                onClick={goToNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Controls */}
          <div
            className={cn(
              "absolute bottom-4 right-4 flex gap-2",
              "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
          >
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 rounded-full bg-card/90 backdrop-blur-sm shadow-lg"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Image counter */}
          {images.length > 1 && (
            <div
              className={cn(
                "absolute bottom-4 left-4 px-3 py-1.5 rounded-full",
                "bg-card/90 backdrop-blur-sm shadow-lg text-sm font-medium"
              )}
            >
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {images.map((image, index) => (
              <button
                key={image || index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                  index === currentIndex
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent hover:border-primary/50"
                )}
              >
                <BlurThumb src={image} alt={`Thumbnail ${index + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-background/98 backdrop-blur-xl">
          <div className="relative w-full h-full flex flex-col">
            {/* Toolbar */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-background/80 to-transparent">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-card/90 shadow-lg"
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <div className="px-3 py-1.5 rounded-full bg-card/90 text-sm font-medium min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-card/90 shadow-lg"
                  onClick={handleZoomIn}
                  disabled={zoom >= 5}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-card/90 shadow-lg"
                  onClick={handleRotate}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-card/90 shadow-lg"
                  onClick={resetView}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {onShare && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-card/90 shadow-lg"
                    onClick={() => onShare(images[currentIndex])}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
                {onDownload && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-card/90 shadow-lg"
                    onClick={() => onDownload(images[currentIndex])}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-card/90 shadow-lg"
                  onClick={() => setIsFullscreen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Main viewer */}
            <div className="flex-1 flex items-center justify-center p-16">
              <ImageViewer fullscreen />
            </div>

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/90 shadow-lg"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/90 shadow-lg"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Bottom thumbnails */}
            <AnimatePresence>
              {showThumbnails && images.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent"
                >
                  <div className="flex gap-2 justify-center overflow-x-auto">
                    {images.map((image, index) => (
                      <button
                        key={image || index}
                        onClick={() => setCurrentIndex(index)}
                        className={cn(
                          "shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                          index === currentIndex
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent hover:border-primary/50 opacity-60 hover:opacity-100"
                        )}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle thumbnails button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-4 right-4 rounded-full"
              onClick={() => setShowThumbnails(!showThumbnails)}
            >
              {showThumbnails ? "Ocultar" : "Mostrar"} miniaturas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
