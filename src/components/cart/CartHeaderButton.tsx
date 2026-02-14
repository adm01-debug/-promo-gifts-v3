/**
 * CartHeaderButton - Ícone de carrinho no header com popover de resumo
 */

import { ShoppingCart, Trash2, Plus, Building2, Package, X, ArrowRight, Eraser } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
        className="w-[380px] p-0 rounded-xl border-border/50 shadow-xl overflow-hidden"
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
              <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border/40">
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
                <div className="px-4 pb-5 pt-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted/30 flex items-center justify-center">
                    <Package className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium mb-1">Nenhum carrinho</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-[220px] mx-auto">
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
                  <ScrollArea className="max-h-[400px]">
                    <div className="p-3 space-y-2">
                      {carts.map((cart) => {
                        const isActive = cart.id === activeCartId;
                        return (
                          <div
                            key={cart.id}
                            className={cn(
                              "rounded-xl border transition-all duration-200 cursor-pointer group",
                              isActive
                                ? "border-primary/30 bg-primary/5"
                                : "border-border/40 hover:border-border/60 hover:bg-muted/30"
                            )}
                            onClick={() => setActiveCartId(cart.id)}
                          >
                            {/* Cart header */}
                            <div className="flex items-center gap-2.5 px-3 py-2.5">
                              {cart.company_logo_url ? (
                                <img
                                  src={cart.company_logo_url}
                                  alt=""
                                  className="w-9 h-9 rounded-lg object-contain bg-background border border-border/50 flex-shrink-0 p-0.5"
                                />
                              ) : (
                                <div className={cn(
                                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                                  isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                  <Building2 className="h-4 w-4" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <p className={cn(
                                  "text-[13px] font-semibold truncate leading-tight",
                                  isActive && "text-primary"
                                )}>
                                  {cart.company_name}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {cart.company_location || "Sem localização"}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {cart.items.length > 0 && (
                                  <span className={cn(
                                    "text-[10px] font-bold tabular-nums rounded-full px-2 py-0.5",
                                    isActive
                                      ? "bg-primary/15 text-primary"
                                      : "bg-muted text-muted-foreground"
                                  )}>
                                    {cart.items.length} {cart.items.length === 1 ? "item" : "itens"}
                                  </span>
                                )}
                                {/* Limpar carrinho */}
                                {isActive && cart.items.length > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          cart.items.forEach((item) => removeItem(item.id));
                                        }}
                                      >
                                        <Eraser className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[11px]">Limpar itens</TooltipContent>
                                  </Tooltip>
                                )}
                                {/* Excluir carrinho */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                      style={{ opacity: isActive ? 1 : undefined }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteCart(cart.id);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[11px]">Excluir carrinho</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>

                            {/* Items list — only for active cart */}
                            {isActive && cart.items.length > 0 && (
                              <div className="border-t border-border/30 px-3 py-2 space-y-1">
                                {cart.items.slice(0, 5).map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-2.5 py-1 px-1.5 rounded-md hover:bg-background/60 group/item transition-colors"
                                  >
                                    {item.product_image_url ? (
                                      <img
                                        src={item.product_image_url}
                                        alt=""
                                        className="w-7 h-7 rounded-md object-contain bg-background border border-border/30 flex-shrink-0 p-0.5"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-md bg-muted/40 flex-shrink-0 flex items-center justify-center">
                                        <Package className="h-3 w-3 text-muted-foreground/50" />
                                      </div>
                                    )}
                                    <span className="text-xs truncate flex-1 text-foreground/80 leading-tight">
                                      {item.product_name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums font-medium bg-muted/50 rounded px-1.5 py-0.5">
                                      ×{item.quantity}
                                    </span>
                                    <button
                                      className="h-5 w-5 flex items-center justify-center opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0 rounded"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeItem(item.id);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                                {cart.items.length > 5 && (
                                  <p className="text-[10px] text-muted-foreground text-center py-1">
                                    +{cart.items.length - 5} mais itens
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
                    <div className="p-3 border-t border-border/40">
                      <Button
                        variant="orange"
                        className="w-full gap-2 text-xs h-10 rounded-lg font-semibold"
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
