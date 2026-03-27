import { useState } from "react";
import { 
  Share2, 
  MessageCircle, 
  Copy, 
  Download, 
  Check, 
  Image as ImageIcon,
  FileText,
  Send
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/hooks/useProducts";

interface ShareActionsProps {
  product: Product;
  selectedPhotosCount?: number;
}

export function ShareActions({ product, selectedPhotosCount = 0 }: ShareActionsProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const generateMessage = () => {
    const colors = product.colors.map((c) => c.name).join(", ");
    return `*${product.name}*

${product.description}

🎨 Cores: ${colors}
💰 A partir de ${formatPrice(product.price)}/un
📦 Qtd mínima: ${product.minQuantity} un
${product.stockStatus === "in-stock" ? "✅ Em estoque" : "⚠️ Consultar disponibilidade"}

Promo Brindes - Brindes com Excelência!`;
  };

  const handleCopyDescription = async () => {
    const message = generateMessage();
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast({
      title: "Copiado!",
      description: "Descrição copiada para a área de transferência",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    setShowPreview(true);
  };

  const handleSendWhatsApp = () => {
    toast({
      title: "A-Ticket",
      description: "Enviando para o A-Ticket...",
    });
    setShowPreview(false);
  };

  const handleDownloadPhotos = () => {
    toast({
      title: "Download",
      description: `Preparando download de ${selectedPhotosCount || product.images.length} fotos...`,
    });
  };

  return (
    <>
      {/* Unified split button: main action + dropdown */}
      <div className="inline-flex rounded-md shadow-sm">
        <Button
          className="gap-2 rounded-r-none border-r border-primary-foreground/20"
          onClick={handleShareWhatsApp}
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
            
            <DropdownMenuItem onClick={handleShareWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar Produto Simples
            </DropdownMenuItem>
            
            {product.variations && product.variations.length > 0 && (
              <DropdownMenuItem onClick={() => {
                toast({
                  title: "Variações",
                  description: "Preparando todas as variações de cor...",
                });
              }}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Enviar Todas as Cores
              </DropdownMenuItem>
            )}
            
            {product.isKit && (
              <>
                <DropdownMenuItem onClick={() => {
                  toast({
                    title: "KIT Completo",
                    description: "Preparando fotos do kit montado...",
                  });
                }}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Enviar KIT Completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  toast({
                    title: "Itens do KIT",
                    description: "Preparando fotos individuais dos itens...",
                  });
                }}>
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
            
            <DropdownMenuItem onClick={handleDownloadPhotos}>
              <Download className="h-4 w-4 mr-2" />
              Download ZIP ({selectedPhotosCount || product.images.length} fotos)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-success" />
              Preview da Mensagem
            </DialogTitle>
            <DialogDescription>
              Visualize como a mensagem aparecerá no WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Photos preview */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.slice(0, 4).map((img, idx) => (
                <div
                  key={idx}
                  className="w-16 h-16 rounded-lg overflow-hidden bg-secondary shrink-0"
                >
                  <img
                    src={img}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {product.images.length > 4 && (
                <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-muted-foreground">
                    +{product.images.length - 4}
                  </span>
                </div>
              )}
            </div>

            {/* Message preview */}
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <Textarea
                value={generateMessage()}
                readOnly
                className="min-h-[200px] bg-transparent border-0 resize-none focus-visible:ring-0"
              />
            </div>

            {/* Contact selector placeholder */}
            <div className="p-3 rounded-lg border border-dashed border-border text-center">
              <p className="text-sm text-muted-foreground">
                Selecione um contato do CRM ou digite o número
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPreview(false)}
              >
                Cancelar
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSendWhatsApp}>
                <Send className="h-4 w-4" />
                Enviar via A-Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
