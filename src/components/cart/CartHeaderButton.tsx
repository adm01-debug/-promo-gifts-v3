/**
 * CartHeaderButton - Ícone de carrinho no header com popover de resumo
 * Redesign: visual premium com cards elevados e transições suaves
 */

import { ShoppingCart, Trash2, ChevronRight, Plus, Building2, Package, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { CartCompanyPicker } from "./CartCompanyPicker";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function CartHeaderButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const {
    carts,
    activeCart,
    activeCartId,
    totalItems,
    canCreateCart,
    setActiveCartId,
    deleteCart,
    removeItem,
  } = useSellerCartContext();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-primary-foreground shadow-sm">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="bg-card border-border">
          Carrinho de Orçamento
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-[340px] p-0 rounded-xl border-border/50 shadow-xl overflow-hidden"
        align="end"
        sideOffset={8}
        onCloseAutoFocus={() => setShowPicker(false)}
      >
        <AnimatePresence mode="wait">
          {showPicker ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Novo Carrinho</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowPicker(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CartCompanyPicker
                onCreated={() => setShowPicker(false)}
                onCancel={() => setShowPicker(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="carts"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
            >
              {/* Header */}
              <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Carrinhos</h3>
                  <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                    {carts.length}/3
                  </span>
                </div>
                {canCreateCart && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 px-2.5 rounded-lg border-dashed border-primary/30 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                    onClick={() => setShowPicker(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Novo
                  </Button>
                )}
              </div>

              {carts.length === 0 ? (
                /* Empty state */
                <div className="px-4 pb-5 pt-2 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted/30 flex items-center justify-center">
                    <Package className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium mb-1">Nenhum carrinho</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-[200px] mx-auto">
                    Crie um carrinho vinculado a uma empresa para coletar produtos
                  </p>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs rounded-lg"
                    onClick={() => setShowPicker(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Criar Carrinho
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[340px]">
                    <div className="px-3 pb-2 space-y-1.5">
                      {carts.map((cart) => {
                        const isActive = cart.id === activeCartId;
                        return (
                          <div
                            key={cart.id}
                            className={cn(
                              "rounded-xl p-3 cursor-pointer transition-all duration-200 group",
                              isActive
                                ? "bg-primary/8 ring-1 ring-primary/25"
                                : "hover:bg-muted/40"
                            )}
                            onClick={() => setActiveCartId(cart.id)}
                          >
                            {/* Cart header row */}
                            <div className="flex items-center gap-2.5">
                              {cart.company_logo_url ? (
                                <img
                                  src={cart.company_logo_url}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-contain bg-background border border-border/50 flex-shrink-0 p-0.5"
                                />
                              ) : (
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                  isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                  <Building2 className="h-4 w-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className={cn(
                                  "text-[13px] font-medium truncate leading-tight",
                                  isActive && "text-primary"
                                )}>
                                  {cart.company_name}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {cart.company_location || `${cart.items.length} ${cart.items.length === 1 ? "item" : "itens"}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {cart.items.length > 0 && (
                                  <span className={cn(
                                    "text-[10px] font-semibold tabular-nums rounded-md px-1.5 py-0.5",
                                    isActive
                                      ? "bg-primary/15 text-primary"
                                      : "bg-muted text-muted-foreground"
                                  )}>
                                    {cart.items.length}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCart(cart.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Item preview — active cart only */}
                            {isActive && cart.items.length > 0 && (
                              <div className="mt-2.5 space-y-1 pl-[42px]">
                                {cart.items.slice(0, 4).map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-2 text-[11px] rounded-md px-2 py-1 bg-background/60 group/item"
                                  >
                                    {item.product_image_url ? (
                                      <img
                                        src={item.product_image_url}
                                        alt=""
                                        className="w-5 h-5 rounded object-contain flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded bg-muted/50 flex-shrink-0" />
                                    )}
                                    <span className="truncate flex-1 text-foreground/80">
                                      {item.product_name}
                                    </span>
                                    <span className="text-muted-foreground flex-shrink-0 tabular-nums text-[10px]">
                                      ×{item.quantity}
                                    </span>
                                    <button
                                      className="h-4 w-4 flex items-center justify-center opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeItem(item.id);
                                      }}
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                ))}
                                {cart.items.length > 4 && (
                                  <p className="text-[10px] text-muted-foreground text-center py-0.5">
                                    +{cart.items.length - 4} mais
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {/* CTA Footer */}
                  {activeCart && activeCart.items.length > 0 && (
                    <div className="p-3 border-t border-border/50">
                      <Button
                        className="w-full gap-2 text-xs h-9 rounded-lg font-semibold"
                        onClick={() => {
                          setOpen(false);
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
                        <ArrowRight className="h-3.5 w-3.5" />
                        Gerar Orçamento
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
