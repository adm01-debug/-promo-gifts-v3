/**
 * CartSidebar — Summary panel for the active cart.
 * Extracted from SellerCartsPage for modularity.
 */
import { type SellerCart, CartStatus } from "@/hooks/useSellerCarts";
import { type CartTemplateItem } from "@/hooks/useCartTemplates";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatCurrency, getStatusCfg, SmartSuggestions, ActionHistoryPanel,
  SaveTemplateDialog, LoadTemplateDialog,
} from "@/components/cart/CartUtilComponents";
import { cn } from "@/lib/utils";
import {
  ArrowRight, FileText, Eraser, Plus, Share2, Copy, Download,
  Sparkles, TrendingUp, Weight, Box, Building2,
} from "lucide-react";
import type { UseMutationResult } from "@tanstack/react-query";

interface CartSidebarProps {
  cart: SellerCart;
  otherCarts: SellerCart[];
  cartSubtotal: number;
  cartTotalQty: number;
  cartAge: number;
  weightVolume: { weightKg: number; volumeM3: number; volumeCm3: number } | null;
  allProducts: unknown[];
  templates: CartTemplateItem[] | { id: string; name: string; description?: string; items: CartTemplateItem[] }[];
  canCreateCart: boolean;
  onGenerateQuote: (cart: SellerCart) => void;
  onShareCart: (cartId: string) => void;
  onDuplicateCart: (cartId: string) => void;
  onExportCSV: (cart: SellerCart) => void;
  onExportPDF: (cart: SellerCart) => void;
  onSaveTemplate: (name: string, description: string) => void;
  onLoadTemplate: (items: CartTemplateItem[]) => void;
  onDeleteTemplate: UseMutationResult<void, Error, string>;
  onClear: () => void;
  onNavigate: (path: string) => void;
  onSetActiveCartId: (id: string) => void;
}

export function CartSidebar({
  cart, otherCarts, cartSubtotal, cartTotalQty, cartAge, weightVolume,
  allProducts, templates, canCreateCart,
  onGenerateQuote, onShareCart, onDuplicateCart, onExportCSV, onExportPDF,
  onSaveTemplate, onLoadTemplate, onDeleteTemplate, onClear, onNavigate, onSetActiveCartId,
}: CartSidebarProps) {
  return (
    <div className="hidden md:block xl:sticky xl:top-20 xl:self-start space-y-4">
      <Card className="p-5 space-y-4 border-primary/10">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Resumo do Carrinho
        </h3>

        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">SKUs distintos</span>
            <span className="font-medium tabular-nums">{cart.items.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantidade total</span>
            <span className="font-medium tabular-nums">{cartTotalQty.toLocaleString("pt-BR")} un.</span>
          </div>

          {weightVolume && (
            <>
              {weightVolume.weightKg > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Weight className="h-3 w-3" /> Peso estimado
                  </span>
                  <span className="font-medium tabular-nums">
                    {weightVolume.weightKg >= 1
                      ? `${weightVolume.weightKg.toFixed(1)} kg`
                      : `${(weightVolume.weightKg * 1000).toFixed(0)} g`}
                  </span>
                </div>
              )}
              {weightVolume.volumeCm3 > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Box className="h-3 w-3" /> Volume estimado
                  </span>
                  <span className="font-medium tabular-nums">
                    {weightVolume.volumeM3 >= 0.001
                      ? `${weightVolume.volumeM3.toFixed(3)} m³`
                      : `${weightVolume.volumeCm3.toLocaleString("pt-BR")} cm³`}
                  </span>
                </div>
              )}
            </>
          )}

          <div className="border-t border-border/30 pt-2.5 flex justify-between">
            <span className="font-medium">Subtotal</span>
            <span className="font-bold text-lg text-primary tabular-nums">{formatCurrency(cartSubtotal)}</span>
          </div>
        </div>

        <Button
          className="w-full gap-2 h-11 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          onClick={() => onGenerateQuote(cart)}
        >
          <ArrowRight className="h-4 w-4" /> Gerar Orçamento
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onShareCart(cart.id)}>
            <Share2 className="h-3.5 w-3.5" /> Compartilhar
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onDuplicateCart(cart.id)}>
            <Copy className="h-3.5 w-3.5" /> Duplicar
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onExportCSV(cart)}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onExportPDF(cart)}>
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>

        <SaveTemplateDialog cart={cart} onSave={onSaveTemplate} />
        <LoadTemplateDialog
          templates={templates as { id: string; name: string; description?: string; items: CartTemplateItem[] }[]}
          onLoad={onLoadTemplate}
          onDelete={(id: string) => onDeleteTemplate.mutate(id)}
        />

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 w-full" onClick={onClear}>
            <Eraser className="h-3.5 w-3.5" /> Limpar
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onNavigate("/produtos")}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-4 space-y-3 border-border/30">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-warning" /> Insights
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Score de conversão
            </span>
            <span className={cn(
              "font-bold tabular-nums",
              cart.items.length >= 5 ? "text-primary" :
                cart.items.length >= 3 ? "text-warning" : "text-muted-foreground"
            )}>
              {Math.min(100, Math.round(
                (cart.items.length * 15) +
                (cartSubtotal > 1000 ? 20 : cartSubtotal > 500 ? 10 : 0) +
                (cart.notes ? 10 : 0) +
                (cart.status === "pronto_orcamento" ? 15 : cart.status === "em_negociacao" ? 5 : 0)
              ))}%
            </span>
          </div>
          <SmartSuggestions cart={cart} allProducts={allProducts} />
          <ActionHistoryPanel cartId={cart.id} />
          {cartAge >= 3 && (
            <p className="text-[10px] text-warning bg-warning/5 rounded-lg px-2.5 py-1.5 border border-warning/10">
              ⏰ Carrinho há {cartAge} dias — considere fazer follow-up!
            </p>
          )}
        </div>
      </Card>

      {/* Other carts */}
      {otherCarts.length > 0 && (
        <Card className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outros Carrinhos</h4>
          {otherCarts.map(c => (
            <button
              key={c.id}
              onClick={() => onSetActiveCartId(c.id)}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border/30 hover:border-border/60 hover:bg-muted/20 transition-all text-left"
            >
              {c.company_logo_url ? (
                <img src={c.company_logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-background border border-border/50 p-0.5" loading="lazy" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{c.company_name}</p>
                <p className="text-[10px] text-muted-foreground">{c.items.length} itens</p>
              </div>
              <Badge variant="outline" className={cn("text-[9px] px-1.5", getStatusCfg(c.status).color)}>
                {getStatusCfg(c.status).label}
              </Badge>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
