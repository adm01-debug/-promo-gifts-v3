import { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, Move, RotateCcw, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  images: string[];
}

interface SyncedZoomGalleryProps {
  products: Product[];
  onProductClick?: (productId: string) => void;
}

export function SyncedZoomGallery({ products, onProductClick }: SyncedZoomGalleryProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedImageIndices, setSelectedImageIndices] = useState<Record<string, number>>({});
  const panStartRef = useRef({ x: 0, y: 0 });

  // Use index-based keys to support same product with different variants
  const productKeys = products.map((_, i) => `slot-${i}`);

  // Initialize selected image indices
  useEffect(() => {
    const indices: Record<string, number> = {};
    productKeys.forEach(key => {
      if (!(key in selectedImageIndices)) {
        indices[key] = 0;
      }
    });
    if (Object.keys(indices).length > 0) {
      setSelectedImageIndices(prev => ({ ...prev, ...indices }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.25, 1);
      if (newZoom === 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      const newX = e.clientX - panStartRef.current.x;
      const newY = e.clientY - panStartRef.current.y;
      const maxPan = (zoom - 1) * 100;
      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, newX)),
        y: Math.max(-maxPan, Math.min(maxPan, newY)),
      });
    }
  }, [isPanning, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, []);

  const handleSliderChange = (value: number[]) => {
    setZoom(value[0]);
    if (value[0] === 1) setPan({ x: 0, y: 0 });
  };

  const selectImage = (slotKey: string, index: number) => {
    setSelectedImageIndices(prev => ({ ...prev, [slotKey]: index }));
  };

  const GalleryContent = ({ inDialog = false }: { inDialog?: boolean }) => (
    <div className={cn("space-y-4", inDialog && "p-4")}>
      {/* Zoom Controls */}
      <div className="flex items-center justify-center gap-4 p-3 rounded-xl bg-muted/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          className="h-8 w-8"
         aria-label="Reduzir"><ZoomOut className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-3 w-48">
          <Slider
            value={[zoom]}
            min={1}
            max={4}
            step={0.1}
            onValueChange={handleSliderChange}
            className="flex-1"
          />
          <span className="text-sm font-medium w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="icon" aria-label="Ampliar"
          onClick={handleZoomIn}
          disabled={zoom >= 4}
          className="h-8 w-8"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border" />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={resetView}
          disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
          className="h-8 w-8"
         aria-label="Rotacionar"><RotateCcw className="h-4 w-4" />
        </Button>

        {!inDialog && (
          <>
            <div className="w-px h-6 bg-border" />
            <Button
              variant="ghost"
              size="icon" aria-label="Maximizar"
              onClick={() => setIsFullscreen(true)}
              className="h-8 w-8"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </>
        )}

        {zoom > 1 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Move className="h-3 w-3" />
            Arraste para mover
          </span>
        )}
      </div>

      {/* Synced Images Grid */}
      <div 
        className={cn(
          "grid gap-4",
          products.length === 2 && "grid-cols-2",
          products.length === 3 && "grid-cols-3",
          products.length >= 4 && "grid-cols-2 lg:grid-cols-4"
        )}
      >
        {products.map((product) => {
          const currentIndex = selectedImageIndices[product.id] || 0;
          const currentImage = product.images[currentIndex];
          
          return (
            <div key={product.id} className="space-y-3">
              {/* Product name */}
              <h3 
                className="font-display text-sm font-medium text-center truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => onProductClick?.(product.id)}
              >
                {product.name}
              </h3>
              
              {/* Main synced image */}
              <div
                className={cn(
                  "relative aspect-square rounded-xl overflow-hidden bg-secondary/30 border border-border",
                  zoom > 1 && "cursor-grab",
                  isPanning && "cursor-grabbing"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <img
                  src={currentImage}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-100 select-none"
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  }}
                  draggable={false} loading="lazy" />
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-1.5 justify-center overflow-x-auto pb-1">
                  {product.images.slice(0, 5).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectImage(product.id, idx)}
                      className={cn(
                        "shrink-0 w-10 h-10 rounded-md overflow-hidden transition-all",
                        currentIndex === idx
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : "opacity-60 hover:opacity-100"
                      )}
                    >
                      <img
                        src={img}
                        alt={`${product.name} - ${idx + 1}`}
                        className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                  {product.images.length > 5 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{product.images.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <GalleryContent />

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-background/98 backdrop-blur-xl border-none">
          <div className="w-full h-full overflow-auto">
            <GalleryContent inDialog />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
