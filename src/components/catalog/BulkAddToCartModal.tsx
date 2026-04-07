/**
 * BulkAddToCartModal — Modal para adicionar múltiplos produtos ao carrinho.
 * Mostra o CartCompanyPicker se não houver carrinho ativo,
 * depois adiciona todos os produtos de uma vez.
 */
import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ShoppingBag, Loader2 } from "lucide-react";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { CartCompanyPicker } from "@/components/cart/CartCompanyPicker";
import { toast } from "sonner";
import type { Product } from "@/hooks/useProducts";

interface BulkAddToCartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onDone?: () => void;
}

export function BulkAddToCartModal({ open, onOpenChange, products, onDone }: BulkAddToCartModalProps) {
  const { activeCart, addToActiveCart } = useSellerCartContext();
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) { setAdding(false); setDone(false); }
  }, [open]);

  // Auto-add when cart becomes active (after company selection)
  const handleAdd = useCallback(async () => {
    if (!activeCart || products.length === 0) return;
    setAdding(true);
    try {
      for (const p of products) {
        addToActiveCart({
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku || undefined,
          product_image_url: p.images?.[0] || undefined,
          product_price: p.price,
          quantity: 1,
        });
      }
      setDone(true);
      toast.success(`${products.length} produto${products.length > 1 ? 's' : ''} adicionado${products.length > 1 ? 's' : ''} ao carrinho`, {
        description: activeCart.company_name,
      });
      setTimeout(() => {
        onOpenChange(false);
        onDone?.();
      }, 1000);
    } catch {
      toast.error("Erro ao adicionar produtos ao carrinho");
    } finally {
      setAdding(false);
    }
  }, [activeCart, products, addToActiveCart, onOpenChange, onDone]);

  const hasCart = !!activeCart;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4 text-cart" />
            Adicionar {products.length} produto{products.length > 1 ? 's' : ''} ao carrinho
          </DialogTitle>
        </DialogHeader>

        {!hasCart ? (
          <CartCompanyPicker
            onCreated={() => {}}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/40 border border-border/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Carrinho ativo</p>
              <p className="text-sm font-medium">{activeCart.company_name}</p>
            </div>

            <div className="text-sm text-muted-foreground">
              {products.length} produto{products.length > 1 ? 's' : ''} será{products.length > 1 ? 'ão' : ''} adicionado{products.length > 1 ? 's' : ''} com quantidade 1.
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleAdd}
              disabled={adding || done}
            >
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
        )}
      </DialogContent>
    </Dialog>
  );
}
