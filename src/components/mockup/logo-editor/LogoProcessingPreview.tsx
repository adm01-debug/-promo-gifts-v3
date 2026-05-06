import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Info, Image as ImageIcon, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface LogoProcessingPreviewProps {
  originalUrl: string | null;
  processedUrl: string | null;
  whiteThreshold: number;
  alphaThreshold: number;
  onWhiteThresholdChange: (val: number) => void;
  onAlphaThresholdChange: (val: number) => void;
  isProcessing: boolean;
}

export function LogoProcessingPreview({
  originalUrl,
  processedUrl,
  whiteThreshold,
  alphaThreshold,
  onWhiteThresholdChange,
  onAlphaThresholdChange,
  isProcessing
}: LogoProcessingPreviewProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  if (!originalUrl) return null;

  return (
    <div className="space-y-4 pt-2 border-t">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          Ajustes de Processamento (Laser)
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] text-[10px]">
              Ajuste como o sistema interpreta o que é "fundo branco" ou "transparente" para preservar detalhes do logo.
            </TooltipContent>
          </Tooltip>
        </Label>
        {isProcessing && (
          <Badge variant="outline" className="text-[9px] animate-pulse">Processando...</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* White Threshold */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Fundo Branco</span>
            <span className="font-mono">{whiteThreshold}</span>
          </div>
          <Slider
            value={[whiteThreshold]}
            min={150}
            max={250}
            step={1}
            onValueChange={([val]) => onWhiteThresholdChange(val)}
            className="cursor-pointer"
          />
        </div>

        {/* Alpha Threshold */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Transparência</span>
            <span className="font-mono">{alphaThreshold}</span>
          </div>
          <Slider
            value={[alphaThreshold]}
            min={0}
            max={100}
            step={1}
            onValueChange={([val]) => onAlphaThresholdChange(val)}
            className="cursor-pointer"
          />
        </div>
      </div>

      {/* Before/After Preview */}
      <div className="relative group mt-2">
        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/20 p-2">
          <div className="space-y-1">
            <span className="text-[9px] text-muted-foreground block text-center uppercase font-medium">Original</span>
            <div className="aspect-square rounded-lg border bg-background flex items-center justify-center p-2 relative overflow-hidden">
              <img src={originalUrl} alt="Original" className="max-w-full max-h-full object-contain" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] text-muted-foreground block text-center uppercase font-medium">Resultado</span>
            <div className="aspect-square rounded-lg border bg-background flex items-center justify-center p-2 relative overflow-hidden">
              {processedUrl ? (
                <img src={processedUrl} alt="Processado" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="animate-pulse flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Overlay comparison indicator */}
        <div className="absolute inset-y-0 left-1/2 -ml-px w-px bg-border/50 hidden group-hover:block" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
      
      <p className="text-[9px] text-muted-foreground italic text-center">
        Dica: se partes do logo sumirem, reduza o threshold de "Fundo Branco".
      </p>
    </div>
  );
}
