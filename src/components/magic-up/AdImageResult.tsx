/**
 * AdImageResult — Exibe o resultado da imagem publicitária gerada
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, RotateCcw, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdImageResultProps {
  imageUrl: string | null;
  isLoading: boolean;
  productName?: string;
  sceneName?: string;
  onDownload: () => void;
  onShare: () => void;
  onRegenerate: () => void;
}

export function AdImageResult({
  imageUrl,
  isLoading,
  productName,
  sceneName,
  onDownload,
  onShare,
  onRegenerate,
}: AdImageResultProps) {
  if (isLoading) {
    return (
      <Card className="border-primary/20 overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-square flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-primary/60" />
              </div>
            </div>
            <p className="mt-6 text-sm font-medium text-foreground">Criando imagem publicitária...</p>
            <p className="text-xs text-muted-foreground mt-1">Isso pode levar 15-30 segundos</p>
            <div className="mt-4 flex flex-col gap-1 text-[11px] text-muted-foreground">
              <span>✨ Analisando produto e logo</span>
              <span>🎨 Compondo cenário publicitário</span>
              <span>📸 Renderizando foto comercial</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!imageUrl) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center text-muted-foreground max-w-xs">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="h-8 w-8 opacity-50" />
            </div>
            <p className="font-medium text-foreground mb-1">Sua imagem aparecerá aqui</p>
            <p className="text-sm">Configure o produto, logo e cenário, depois clique em "Gerar Imagem"</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            📸 Resultado
          </CardTitle>
          <div className="flex gap-1">
            {productName && <Badge variant="secondary" className="text-[10px]">{productName}</Badge>}
            {sceneName && <Badge variant="outline" className="text-[10px]">{sceneName}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative group">
          <img
            src={imageUrl}
            alt={`Imagem publicitária - ${productName}`}
            className="w-full aspect-square object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-end justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2 mb-4">
              <Button size="sm" onClick={onDownload} className="gap-1.5 shadow-lg">
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button size="sm" variant="secondary" onClick={onShare} className="gap-1.5 shadow-lg">
                <Share2 className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button size="sm" variant="outline" onClick={onRegenerate} className="gap-1.5 shadow-lg bg-background">
                <RotateCcw className="h-4 w-4" />
                Regenerar
              </Button>
            </div>
          </div>
        </div>
        {/* Action buttons always visible on mobile */}
        <div className="flex gap-2 p-3 sm:hidden">
          <Button size="sm" onClick={onDownload} className="flex-1 gap-1.5">
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button size="sm" variant="secondary" onClick={onShare} className="flex-1 gap-1.5">
            <Share2 className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
