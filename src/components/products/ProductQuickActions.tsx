/**
 * ProductQuickActions — 5 quick-access modal buttons for product detail page.
 * Tabela de Preços | Personalização | Indicação | Nicho | WhatsApp
 */
import { useState } from "react";
import { TableProperties, Palette, Target, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { InlinePriceCalculator } from "@/components/products/InlinePriceCalculator";
import { ProductCustomizationOptions } from "@/components/products/ProductCustomizationOptions";
import { ProductPersonalizationRules } from "@/components/products/ProductPersonalizationRules";
import { ShareActions } from "@/components/products/ShareActions";
import type { Product } from "@/hooks/useProducts";

interface ProductQuickActionsProps {
  productId: string;
  productName: string;
  productSku?: string;
  basePrice: number;
  minQuantity: number;
  tags?: Record<string, string[]>;
  niches?: string[];
  product?: Product;
}

type ModalType = "precos" | "personalizacao" | "indicacao" | "nicho" | null;

const actions = [
  { key: "precos" as const, label: "Preços", icon: TableProperties, iconColor: "text-primary" },
  { key: "personalizacao" as const, label: "Gravação", icon: Palette, iconColor: "text-accent-foreground" },
  { key: "indicacao" as const, label: "Indicação", icon: Target, iconColor: "text-primary" },
  { key: "nicho" as const, label: "Nicho", icon: Layers, iconColor: "text-accent-foreground" },
];

export function ProductQuickActions({
  productId,
  productName,
  productSku,
  basePrice,
  minQuantity,
  tags,
  niches,
  product,
}: ProductQuickActionsProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const handleClick = (key: ModalType) => {
    setActiveModal(key);
  };

  // Use real data, fallback to examples only if nothing provided
  const displayTags = tags && Object.values(tags).some(arr => arr.length > 0) ? tags : {
    "Público-Alvo": ["Unissex", "Esportista", "Executivo"],
    "Datas Comemorativas": ["Dia do Trabalhador", "Natal"],
    "Endomarketing": ["Qualidade de Vida", "Onboarding | Kit Boas-Vindas", "CIPA | SIPAT"],
  };

  const displayNiches = niches && niches.length > 0 ? niches : ["Agro", "Celulose", "Educação", "Energia", "Ferramentas e Ferragens"];

  return (
    <>
      {/* Quick Action Buttons — uniform pill style */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {actions.map(({ key, label, icon: Icon, iconColor }) => (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium",
              "bg-muted/60 text-muted-foreground border border-border/30",
              "transition-all duration-150 hover:bg-accent hover:text-accent-foreground hover:border-border/60",
              "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0 opacity-70", iconColor)} />
            {label}
          </button>
        ))}
        {product && <ShareActions product={product} />}
      </div>

      {/* Tabela de Preços Modal */}
      <Dialog open={activeModal === "precos"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TableProperties className="h-5 w-5 text-primary" />
              Tabela de Preços
            </DialogTitle>
            <DialogDescription>Veja os descontos por quantidade</DialogDescription>
          </DialogHeader>
          <InlinePriceCalculator
            productId={productId}
            productName={productName}
            basePrice={basePrice}
            minQuantity={minQuantity}
            defaultOpen
          />
        </DialogContent>
      </Dialog>

      {/* Personalização Modal */}
      <Dialog open={activeModal === "personalizacao"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Personalização
            </DialogTitle>
            <DialogDescription>Técnicas e locais de gravação disponíveis</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ProductCustomizationOptions productId={productId} productSku={productSku} />
            <ProductPersonalizationRules productId={productId} productSku={productSku} productName={productName} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Indicação Modal */}
      <Dialog open={activeModal === "indicacao"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Indicado para
            </DialogTitle>
            <DialogDescription>Público-alvo e ocasiões recomendadas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {Object.entries(displayTags)
              .filter(([, items]) => items.length > 0)
              .map(([category, items]) => (
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
              <Layers className="h-5 w-5 text-primary" />
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
