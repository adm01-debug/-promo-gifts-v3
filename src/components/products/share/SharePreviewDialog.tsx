import { useState, useCallback } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { PhotoSelector } from "./PhotoSelector";
import { ShareContactSelector, type ShareContactSelection } from "./ShareContactSelector";
import { MESSAGE_TEMPLATES, type TemplateKey } from "./MessageTemplates";
import { cn } from "@/lib/utils";

interface SharePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

export function SharePreviewDialog({ open, onOpenChange, product }: SharePreviewDialogProps) {
  const { toast } = useToast();
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>("informal");
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [contactSelection, setContactSelection] = useState<ShareContactSelection | null>(null);

  // Filter out color-specific images — keep only main product photos
  const mainImages = useMemo(() => {
    if (!product.colors || product.colors.length === 0) return product.images;
    const colorImageUrls = new Set<string>();
    product.colors.forEach((color) => {
      if (color.image) colorImageUrls.add(color.image);
      color.images?.forEach((img) => colorImageUrls.add(img));
    });
    const filtered = product.images.filter((img) => !colorImageUrls.has(img));
    return filtered.length > 0 ? filtered : [product.images[0]]; // fallback to first
  }, [product.images, product.colors]);

  const [selectedImages, setSelectedImages] = useState<Set<number>>(
    () => new Set(mainImages.map((_, i) => i))
  );

  const currentTemplate = MESSAGE_TEMPLATES.find((t) => t.key === activeTemplate)!;
  const message = customMessage ?? currentTemplate.generate(product);

  const handleToggleImage = useCallback((idx: number) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        if (next.size > 1) next.delete(idx); // keep at least 1
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedImages(new Set(product.images.map((_, i) => i)));
  }, [product.images]);

  const handleDeselectAll = useCallback(() => {
    setSelectedImages(new Set([0])); // keep first
  }, []);

  const handleTemplateChange = (key: TemplateKey) => {
    setActiveTemplate(key);
    setCustomMessage(null);
  };

  const handleSend = () => {
    const photoCount = selectedImages.size;
    const target = contactSelection?.contactName || contactSelection?.companyName || "destinatário";

    toast({
      title: "Enviando via A-Ticket",
      description: `${photoCount} foto(s) + mensagem para ${target}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-success" />
            Enviar Produto
          </DialogTitle>
          <DialogDescription>
            Selecione fotos, modelo de mensagem e contato
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo selector */}
          <PhotoSelector
            images={product.images}
            selectedImages={selectedImages}
            onToggle={handleToggleImage}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />

          {/* Template selector */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Modelo de mensagem</span>
            <div className="flex gap-1.5">
              {MESSAGE_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTemplateChange(t.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    activeTemplate === t.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                  title={t.description}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message preview (editable) */}
          <div className="bg-secondary/50 rounded-xl p-3 border border-border">
            <Textarea
              value={message}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[160px] bg-transparent border-0 resize-none focus-visible:ring-0 text-sm"
            />
          </div>

          {/* Contact selector */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Destinatário</span>
            <ShareContactSelector
              selection={contactSelection}
              onSelect={setContactSelection}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button className="flex-1 gap-2" onClick={handleSend}>
              <Send className="h-4 w-4" />
              Enviar via A-Ticket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
