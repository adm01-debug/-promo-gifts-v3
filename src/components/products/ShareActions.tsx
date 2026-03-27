import { useState, useMemo } from "react";
import {
  MessageCircle,
  Copy,
  Download,
  Check,
  Image as ImageIcon,
  Palette,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/hooks/useProducts";
import { SharePreviewDialog } from "./share/SharePreviewDialog";
import { ShareAllColorsDialog } from "./share/ShareAllColorsDialog";
import { usePhotoDownload } from "./share/usePhotoDownload";
import { MESSAGE_TEMPLATES } from "./share/MessageTemplates";

interface ShareActionsProps {
  product: Product;
  selectedPhotosCount?: number;
}

export function ShareActions({ product, selectedPhotosCount = 0 }: ShareActionsProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);
  const [copied, setCopied] = useState(false);
  const { downloadPhotos, downloading } = usePhotoDownload();

  const handleCopyDescription = async () => {
    const message = MESSAGE_TEMPLATES[1].generate(product); // informal default
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast({
      title: "Copiado!",
      description: "Descrição copiada para a área de transferência",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPhotos = () => {
    downloadPhotos(product.images, product.name);
  };

  const hasColors = product.colors && product.colors.length > 1;

  return (
    <>
      <div className="inline-flex rounded-md shadow-sm">
        <Button
          className="gap-2 rounded-r-none border-r border-primary-foreground/20"
          onClick={() => setShowPreview(true)}
        >
          <MessageCircle className="h-4 w-4" />
          Enviar via A-Ticket
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="rounded-l-none px-2">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Opções de Envio</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setShowPreview(true)}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar Produto Simples
            </DropdownMenuItem>

            {hasColors && (
              <DropdownMenuItem onClick={() => setShowAllColors(true)}>
                <Palette className="h-4 w-4 mr-2" />
                Enviar Todas as Cores
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {product.colors.length}
                </span>
              </DropdownMenuItem>
            )}

            {product.isKit && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    toast({
                      title: "KIT Completo",
                      description: "Preparando fotos do kit montado...",
                    });
                  }}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Enviar KIT Completo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast({
                      title: "Itens do KIT",
                      description: "Preparando fotos individuais dos itens...",
                    });
                  }}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Enviar Itens Separados
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Compartilhar</DropdownMenuLabel>

            <DropdownMenuItem onClick={handleCopyDescription}>
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-success" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copiar Descrição
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleDownloadPhotos} disabled={downloading}>
              <Download className="h-4 w-4 mr-2" />
              {downloading
                ? "Baixando..."
                : `Download (${selectedPhotosCount || product.images.length} fotos)`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SharePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        product={product}
      />

      {hasColors && (
        <ShareAllColorsDialog
          open={showAllColors}
          onOpenChange={setShowAllColors}
          product={product}
        />
      )}
    </>
  );
}
