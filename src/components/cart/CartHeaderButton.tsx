/**
 * CartHeaderButton - Ícone de carrinho no header com badge e mini-resumo
 */

import { ShoppingCart, Trash2, ChevronRight, Plus, Building2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function CartHeaderButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    carts,
    activeCart,
    activeCartId,
    totalItems,
    setActiveCartId,
    deleteCart,
    removeItem,
  } = useSellerCartContext();

  const activeItemCount = activeCart?.items.length || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 hover:bg-orange/10 hover:text-orange"
            >
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && (
                <Badge
                  className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] bg-emerald-500 text-white border-0"
                >
                  {totalItems > 99 ? "99+" : totalItems}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="bg-card border-border">
          Carrinho de Orçamento
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-orange" />
              Carrinhos
            </h3>
            <span className="text-xs text-muted-foreground">
              {carts.length}/3 ativos
            </span>
          </div>
        </div>

        {carts.length === 0 ? (
          /* Empty state */
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Nenhum carrinho ativo
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Navegue pelos produtos e adicione ao carrinho
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="p-2 space-y-1">
              {carts.map((cart) => (
                <div
                  key={cart.id}
                  className={cn(
                    "rounded-lg p-2.5 cursor-pointer transition-colors",
                    cart.id === activeCartId
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                  onClick={() => setActiveCartId(cart.id)}
                >
                  {/* Cart header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {cart.company_logo_url ? (
                        <img
                          src={cart.company_logo_url}
                          alt=""
                          className="w-7 h-7 rounded object-contain bg-background border border-border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">
                          {cart.company_name}
                        </p>
                        {cart.company_location && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {cart.company_location}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {cart.items.length} {cart.items.length === 1 ? "item" : "itens"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCart(cart.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Item preview (show first 3) */}
                  {cart.items.length > 0 && cart.id === activeCartId && (
                    <div className="mt-2 space-y-1">
                      {cart.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 text-xs bg-background/50 rounded px-2 py-1"
                        >
                          {item.product_image_url ? (
                            <img
                              src={item.product_image_url}
                              alt=""
                              className="w-6 h-6 rounded object-contain flex-shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-muted flex-shrink-0" />
                          )}
                          <span className="truncate flex-1 text-foreground">
                            {item.product_name}
                          </span>
                          <span className="text-muted-foreground flex-shrink-0">
                            ×{item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(item.id);
                            }}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      ))}
                      {cart.items.length > 3 && (
                        <p className="text-[10px] text-muted-foreground text-center">
                          +{cart.items.length - 3} mais
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <Separator />
        <div className="p-2 flex gap-2">
          {activeCart && activeCart.items.length > 0 && (
            <Button
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={() => {
                setOpen(false);
                // Migrate to quote builder with cart data
                navigate("/orcamentos/novo", {
                  state: {
                    fromCart: true,
                    cartId: activeCart.id,
                    companyId: activeCart.company_id,
                    companyName: activeCart.company_name,
                    companyLocation: activeCart.company_location,
                    items: activeCart.items.map(i => ({
                      product_id: i.product_id,
                      product_name: i.product_name,
                      product_sku: i.product_sku,
                      product_image_url: i.product_image_url,
                      unit_price: i.product_price,
                      quantity: i.quantity,
                      color_name: i.color_name,
                      color_hex: i.color_hex,
                    })),
                  },
                });
              }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Gerar Orçamento
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
