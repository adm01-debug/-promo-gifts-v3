import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Download,
  ImageIcon,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Share2,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface MockupResultCardProps {
  generatedMockup: string | null;
  isLoading: boolean;
  onDownload: () => void;
  productName?: string;
  techniqueName?: string;
  onReset?: () => void;
  className?: string;
}

export function MockupResultCard({
  generatedMockup,
  isLoading,
  onDownload,
  productName,
  techniqueName,
  onReset,
  className,
}: MockupResultCardProps) {
  const [zoom, setZoom] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  // Trigger success animation when mockup is generated
  useEffect(() => {
    if (generatedMockup && !isLoading) {
      setShowSuccess(true);
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#7c3aed", "#a855f7", "#f97316", "#22c55e"],
      });

      // Reset success state after animation
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [generatedMockup, isLoading]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleZoomReset = () => setZoom(1);

  const handleShare = async () => {
    if (!generatedMockup) return;

    try {
      await navigator.clipboard.writeText(generatedMockup);
      toast.success("Link copiado para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="py-12">
          <div className="text-center space-y-6">
            {/* Animated Icon */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-primary/30 animate-ping animation-delay-150" />
              <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm">
                <Sparkles className="h-12 w-12 text-primary animate-pulse" />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">
                Criando seu mockup com IA...
              </p>
              <p className="text-sm text-muted-foreground">
                Isso leva apenas alguns segundos
              </p>
            </div>

            {/* Loading Dots */}
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>

            {/* Progress Simulation */}
            <div className="w-48 mx-auto h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full animate-shimmer"
                style={{
                  width: "100%",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success State with Mockup
  if (generatedMockup) {
    return (
      <Card
        className={cn(
          "overflow-hidden transition-all duration-500",
          showSuccess && "ring-2 ring-success shadow-lg shadow-success/20",
          className
        )}
      >
        <CardHeader className="pb-3 bg-gradient-to-r from-success/10 via-primary/5 to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                  showSuccess
                    ? "bg-success/20 text-success"
                    : "bg-primary/10 text-primary"
                )}
              >
                {showSuccess ? (
                  <CheckCircle2 className="h-4 w-4 animate-scale-in" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
              </div>
              <div>
                <span className="text-foreground">
                  {showSuccess ? "Mockup Criado!" : "Mockup Gerado"}
                </span>
                {productName && (
                  <p className="text-xs font-normal text-muted-foreground">
                    {productName}
                  </p>
                )}
              </div>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={onDownload} className="gap-1.5">
                <Download className="h-4 w-4" />
                Baixar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {/* Image Container with Zoom */}
          <div
            className={cn(
              "relative rounded-xl border-2 border-dashed border-primary/20 bg-muted/30 overflow-hidden",
              "ring-4 ring-primary/10 transition-all duration-300"
            )}
          >
            <div
              className="aspect-square flex items-center justify-center overflow-auto"
              style={{ cursor: zoom > 1 ? "grab" : "default" }}
            >
              <img
                src={generatedMockup}
                alt="Generated mockup"
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 p-1 bg-background/80 backdrop-blur-sm rounded-lg border shadow-sm">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleZoomReset}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs">
            {techniqueName && (
              <Badge variant="secondary" className="font-normal">
                {techniqueName}
              </Badge>
            )}
            {onReset && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onReset}
                className="text-muted-foreground hover:text-foreground"
              >
                Criar novo mockup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty State (no mockup, not loading)
  return null;
}
