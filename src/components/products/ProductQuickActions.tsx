/**
 * ProductQuickActions — 5 quick-access modal buttons for product detail page.
 * Tabela de Preços | Personalização | Indicação | Nicho | WhatsApp
 */
import { useState } from 'react';
import { TableProperties, Palette, Target, Layers } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { InlinePriceCalculator } from '@/components/products/InlinePriceCalculator';
import { ProductCustomizationOptions } from '@/components/products/ProductCustomizationOptions';
import { ProductPersonalizationRules } from '@/components/products/ProductPersonalizationRules';
import { ShareActions } from '@/components/products/ShareActions';
import type { Product } from '@/hooks/useProducts';

interface ProductQuickActionsProps {
  productId: string;
  productName: string;
  productSku?: string;
  basePrice: number;
  minQuantity: number;
  tags?: Record<string, string[]>;
  niches?: string[];
  product?: Product;
  selectedVariant?: {
    variantName?: string | null;
    colorHex?: string | null;
    thumbnailUrl?: string | null;
  } | null;
}

type ModalType = 'precos' | 'personalizacao' | 'indicacao' | 'nicho' | null;
type ActionKey = Exclude<ModalType, null>;

const actions = [
  { key: 'precos' as const, label: 'Preços', icon: TableProperties, iconColor: 'text-primary' },
  {
    key: 'personalizacao' as const,
    label: 'Gravação',
    icon: Palette,
    iconColor: 'text-accent-foreground',
  },
  { key: 'indicacao' as const, label: 'Indicação', icon: Target, iconColor: 'text-primary' },
  { key: 'nicho' as const, label: 'Nicho', icon: Layers, iconColor: 'text-accent-foreground' },
];

const categoryIcons: Record<string, string> = {
  'Público-Alvo': '👥',
  'Datas Comemorativas': '📅',
  Endomarketing: '🎯',
};

export function ProductQuickActions({
  productId,
  productName,
  productSku,
  basePrice,
  minQuantity,
  tags,
  niches,
  product,
  selectedVariant,
}: ProductQuickActionsProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const displayTagSections = Object.entries(tags ?? {})
    .map(
      ([category, items]) => [category, items.filter((item) => item?.trim().length > 0)] as const,
    )
    .filter(([, items]) => items.length > 0);

  const displayNiches = Array.from(
    new Set(
      (niches ?? [])
        .map((niche) => niche?.trim())
        .filter((niche): niche is string => Boolean(niche)),
    ),
  );

  const isActionDisabled = (key: ActionKey) => {
    if (key === 'indicacao') return displayTagSections.length === 0;
    if (key === 'nicho') return displayNiches.length === 0;
    return false;
  };

  const handleClick = (key: ActionKey) => {
    if (isActionDisabled(key)) return;
    setActiveModal(key);
  };

  return (
    <>
      <div className="flex w-full items-center gap-2 pt-2">
        <div className="flex flex-1 items-center gap-2">
          <TooltipProvider>
            {actions.map(({ key, label, icon: Icon, iconColor }) => {
              const disabled = isActionDisabled(key);
              const tooltipText = disabled
                ? `Sem dados de ${label.toLowerCase()} para este produto`
                : `Abrir ${label.toLowerCase()}`;

              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleClick(key)}
                      className={cn(
                        'group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 py-3 text-xs font-bold',
                        'transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        disabled
                          ? 'cursor-not-allowed border-border/20 bg-muted/30 text-muted-foreground/50'
                          : 'border-border/40 bg-card text-foreground shadow-sm hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/50 hover:shadow-lg hover:shadow-primary/15 active:translate-y-0 active:scale-100 active:shadow-sm',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-all duration-300',
                          disabled
                            ? 'opacity-40'
                            : cn(
                                iconColor,
                                'group-hover:rotate-6 group-hover:scale-125 group-hover:drop-shadow-sm',
                              ),
                        )}
                      />
                      {label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                    {tooltipText}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        {product && <ShareActions product={product} selectedVariant={selectedVariant} />}
      </div>

      <Dialog open={activeModal === 'precos'} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
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

      <Dialog
        open={activeModal === 'personalizacao'}
        onOpenChange={(o) => !o && setActiveModal(null)}
      >
        <DialogContent className="max-h-[72vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Personalização
            </DialogTitle>
            <DialogDescription>Técnicas e locais de gravação disponíveis</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ProductCustomizationOptions productId={productId} productSku={productSku} />
            <ProductPersonalizationRules
              productId={productId}
              productSku={productSku}
              productName={productName}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === 'indicacao'} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <div className="border-b border-border/40 px-5 pb-3 pt-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" />
                Indicado para
              </DialogTitle>
              <DialogDescription className="text-xs">
                Público-alvo e ocasiões recomendadas
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-5 py-5">
            {displayTagSections.length > 0 ? (
              displayTagSections.map(([category, items]) => (
                <div key={category} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{categoryIcons[category] ?? '•'}</span>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                      {category}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <span
                        key={item}
                        className="rounded-xl border border-border/40 bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma indicação cadastrada para este produto.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === 'nicho'} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <div className="border-b border-border/40 px-5 pb-3 pt-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-primary" />
                Nichos / Segmentos
              </DialogTitle>
              <DialogDescription className="text-xs">
                Segmentos de mercado compatíveis
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-3 px-5 py-5">
            {displayNiches.length > 0 ? (
              displayNiches.map((niche) => (
                <div
                  key={niche}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/45 px-4 py-3"
                >
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-foreground">{niche}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum nicho cadastrado para este produto.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
