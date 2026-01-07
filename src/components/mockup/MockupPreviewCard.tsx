import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MockupPreviewCardProps {
  generatedMockup: string | null;
  isLoading: boolean;
  onDownload: () => void;
  productName?: string;
  techniqueName?: string;
}

export function MockupPreviewCard({
  generatedMockup,
  isLoading,
  onDownload,
  productName,
  techniqueName,
}: MockupPreviewCardProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">Gerando mockup com IA...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Isso pode levar alguns segundos
              </p>
            </div>
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state with mockup
  if (generatedMockup) {
    return (
      <Card className="overflow-hidden border-primary/30 shadow-lg shadow-primary/5">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <ImageIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-foreground">Mockup Gerado</span>
                {productName && (
                  <p className="text-xs font-normal text-muted-foreground">{productName}</p>
                )}
              </div>
            </CardTitle>
            <Button size="sm" onClick={onDownload} className="gap-1.5">
              <Download className="h-4 w-4" />
              Baixar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className={cn(
            "aspect-square rounded-xl border-2 border-dashed border-primary/20 bg-muted/30 overflow-hidden",
            "ring-4 ring-primary/10 transition-all duration-300"
          )}>
            <img
              src={generatedMockup}
              alt="Generated mockup"
              className="w-full h-full object-contain animate-fade-in"
            />
          </div>
          {techniqueName && (
            <p className="text-xs text-center text-muted-foreground mt-3">
              Técnica: <span className="font-medium text-foreground">{techniqueName}</span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Empty state
  return null;
}
