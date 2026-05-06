/**
 * BulkAddToCartModal — Modal para adicionar múltiplos produtos ao carrinho.
 * Aceita seleções de variantes do BulkVariantWizard.
 */
import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ShoppingBag, Loader2, ArrowLeft, Building2 } from 'lucide-react';
import { useSellerCartContext } from '@/contexts/SellerCartContext';
import { CartCompanyPicker } from '@/components/cart/CartCompanyPicker';
import { toast } from 'sonner';
import type { Product } from '@/hooks/useProducts';
import type { BulkVariantSelection } from './BulkVariantWizard';

interface BulkAddToCartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  variantSelections?: BulkVariantSelection[];
  onDone?: () => void;
  /** Volta ao wizard de variantes preservando seleções (botão "Voltar"). */
  onBack?: () => void;
}

export function BulkAddToCartModal({
  open,
  onOpenChange,
  products,
  variantSelections,
  onDone,
  onBack,
}: BulkAddToCartModalProps) {
  const { activeCart, addToActiveCart, setActiveCartId } = useSellerCartContext();
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setAdding(false);
      setDone(false);
    }
  }, [open]);

  const handleAdd = useCallback(async () => {
    if (!activeCart) return;

    const items =
      variantSelections && variantSelections.length > 0
        ? variantSelections
        : products.map((p) => ({ product: p, variant: null }));

    if (items.length === 0) return;
    setAdding(true);
    try {
      for (const item of items) {
        const p = item.product;
        const v = item.variant;
        addToActiveCart({
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku || undefined,
          product_image_url: v?.selected_thumbnail || p.images?.[0] || undefined,
          product_price: p.price,
          quantity: 1,
          color_name: v?.color_name || undefined,
          color_hex: v?.color_hex || undefined,
        });
      }
      setDone(true);
      toast.success(
        `${items.length} produto${items.length > 1 ? 's' : ''} adicionado${items.length > 1 ? 's' : ''} ao carrinho`,
        {
          description: activeCart.company_name,
        },
      );
      setTimeout(() => {
        onOpenChange(false);
        onDone?.();
      }, 1000);
    } catch {
      toast.error('Erro ao adicionar produtos ao carrinho');
    } finally {
      setAdding(false);
    }
  }, [activeCart, products, variantSelections, addToActiveCart, onOpenChange, onDone]);

  const hasCart = !!activeCart;
  const count = variantSelections?.length || products.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4 text-cart" />
            Adicionar {count} produto{count > 1 ? 's' : ''} ao carrinho
          </DialogTitle>
        </DialogHeader>

        {!hasCart ? (
          <div className="space-y-3">
            <CartCompanyPicker onCreated={() => {}} onCancel={() => onOpenChange(false)} />
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onOpenChange(false);
                  onBack();
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar e revisar produtos/cores
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-2 rounded-xl border border-border/50 bg-muted/40 p-3">
              <div className="min-w-0">
                <p className="mb-1 text-xs text-muted-foreground">Carrinho ativo</p>
                <p className="truncate text-sm font-medium">{activeCart.company_name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setActiveCartId(null)}
                disabled={adding || done}
                aria-label="Trocar empresa"
              >
                <Building2 className="h-3 w-3" />
                Trocar
              </Button>
            </div>

            {/* Show variant selections summary */}
            {variantSelections && variantSelections.some((s) => s.variant) && (
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {variantSelections.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex-1 truncate">{s.product.name}</span>
                    {s.variant ? (
                      <span className="shrink-0 font-medium text-foreground">
                        {s.variant.color_name}
                        {s.variant.size_code && ` — ${s.variant.size_code}`}
                      </span>
                    ) : (
                      <span className="shrink-0 text-muted-foreground/60">Sem cor</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              {count} produto{count > 1 ? 's' : ''} será{count > 1 ? 'ão' : ''} adicionado
              {count > 1 ? 's' : ''} com quantidade 1.
            </div>

            <div className="flex gap-2">
              {onBack && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    onBack();
                  }}
                  disabled={adding || done}
                  aria-label="Voltar para revisar produtos e cores"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}
              <Button className="flex-1 gap-2" onClick={handleAdd} disabled={adding || done}>
                {done ? (
                  <>
                    <Check className="h-4 w-4" />
                    Adicionado!
                  </>
                ) : adding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    Adicionar ao Carrinho
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
