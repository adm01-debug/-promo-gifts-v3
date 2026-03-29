/**
 * ProductQuickActions — 5 quick-access modal buttons for product detail page.
 * Tabela de Preços | Personalização | Indicação | Nicho | WhatsApp
 */
import { useState } from "react";
import { TableProperties, Palette, Target, Layers, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { InlinePriceCalculator } from "@/components/products/InlinePriceCalculator";
import { PersonalizationCollapsible } from "@/components/products/PersonalizationCollapsible";

interface ProductQuickActionsProps {
  productId: string;
  productName: string;
  productSku?: string;
  basePrice: number;
  minQuantity: number;
  tags?: Record<string, string[]>;
  niches?: string[];
}

type ModalType = "precos" | "personalizacao" | "indicacao" | "nicho" | "whatsapp" | null;

const actions = [
  { key: "precos" as const, label: "Preços", icon: TableProperties, color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-400/60" },
  { key: "personalizacao" as const, label: "Personalização", icon: Palette, color: "from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:border-purple-400/60" },
  { key: "indicacao" as const, label: "Indicação", icon: Target, color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-400/60" },
  { key: "nicho" as const, label: "Nicho", icon: Layers, color: "from-amber-500/20 to-amber-600/10 border-amber-500/30 hover:border-amber-400/60" },
  { key: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle, color: "from-green-500/20 to-green-600/10 border-green-500/30 hover:border-green-400/60" },
];

export function ProductQuickActions({
  productId,
  productName,
  productSku,
  basePrice,
  minQuantity,
  tags,
  niches,
}: ProductQuickActionsProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá! Tenho interesse no produto: ${productName}${productSku ? ` (SKU: ${productSku})` : ""}. Poderia me enviar mais informações?`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const handleClick = (key: ModalType) => {
    if (key === "whatsapp") {
      handleWhatsApp();
    } else {
      setActiveModal(key);
    }
  };

  // Mock tags if not provided
  const displayTags = tags || {
    "Público-Alvo": ["Unissex", "Esportista", "Executivo"],
    "Datas Comemorativas": ["Dia do Trabalhador", "Natal"],
    "Endomarketing": ["Qualidade de Vida", "Onboarding | Kit Boas-Vindas", "CIPA | SIPAT"],
  };

  // Mock niches if not provided
  const displayNiches = niches || ["Agro", "Celulose", "Educação", "Energia", "Ferramentas e Ferragens"];

  return (
    <>
      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium",
              "bg-gradient-to-br border backdrop-blur-sm",
              "transition-all duration-200 hover:scale-[1.03] hover:shadow-md",
              "active:scale-[0.97]",
              color
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tabela de Preços Modal */}
      <Dialog open={activeModal === "precos"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TableProperties className="h-5 w-5 text-blue-400" />
              Tabela de Preços
            </DialogTitle>
            <DialogDescription>Veja os descontos por quantidade</DialogDescription>
          </DialogHeader>
          <InlinePriceCalculator
            productId={productId}
            productName={productName}
            basePrice={basePrice}
            minQuantity={minQuantity}
          />
        </DialogContent>
      </Dialog>

      {/* Personalização Modal */}
      <Dialog open={activeModal === "personalizacao"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-400" />
              Personalização
            </DialogTitle>
            <DialogDescription>Técnicas e locais de gravação disponíveis</DialogDescription>
          </DialogHeader>
          <PersonalizationCollapsible id={productId} productSku={productSku} productName={productName} />
        </DialogContent>
      </Dialog>

      {/* Indicação Modal */}
      <Dialog open={activeModal === "indicacao"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-400" />
              Indicado para
            </DialogTitle>
            <DialogDescription>Público-alvo e ocasiões recomendadas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {Object.entries(displayTags).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  {category === "Público-Alvo" && "👥"}
                  {category === "Datas Comemorativas" && "📅"}
                  {category === "Endomarketing" && "🌱"}
                  {category}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border/50"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Nicho Modal */}
      <Dialog open={activeModal === "nicho"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-400" />
              Nichos / Segmentos
            </DialogTitle>
            <DialogDescription>Segmentos de mercado compatíveis</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {displayNiches.map((niche) => (
              <div
                key={niche}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary/50 border border-border/30"
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-medium">{niche}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
