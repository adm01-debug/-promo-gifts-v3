/**
 * CartHeaderButton - Ícone de carrinho no header com popover de resumo
 * Melhorado com skeletons de carregamento e UX de acesso rápido (Onda 10/10)
 */

import { ShoppingCart, Trash2, Plus, Building2, Package, X, ArrowRight, Eraser, Minus, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { CartCompanyPicker } from "./CartCompanyPicker";
import { PriceLabel } from "./CartUtilComponents";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";


export function CartHeaderButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Listen for FAB "open cart" event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-seller-cart", handler);
    return () => window.removeEventListener("open-seller-cart", handler);
  }, []);

  // Keyboard shortcut: Alt+O to toggle cart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  const {
    carts,
    activeCart,
    activeCartId,
    isLoading,
    totalItems,
    canCreateCart,
    setActiveCartId,
    deleteCart,
    removeItem,
    updateItemQuantity,
    clearCart,
  } = useSellerCartContext();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="cart-trigger"
                className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
               aria-label="Carrinho"><ShoppingCart className="h-[17px] w-[17px]" strokeWidth={1.75} />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-primary-foreground shadow-sm animate-in zoom-in-50">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-primary text-primary-foreground text-[11px] px-2 py-1 border-none">
          Carrinho de Orçamentos <kbd className="ml-1.5 px-1 py-0.5 bg-primary-foreground/20 text-primary-foreground rounded text-[9px] font-mono">Alt+O</kbd>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        data-testid="cart-drawer"
        className="w-[420px] p-0 rounded-xl border-border/50 shadow-xl overflow-hidden"
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
                <h3 className="font-display text-sm font-semibold">Novo Carrinho</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon" aria-label="Fechar"
                      className="h-6 w-6"
                      onClick={() => setShowPicker(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-primary text-primary-foreground text-[11px] px-2 py-1 border-none">Fechar</TooltipContent>
                </Tooltip>
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
              <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border/40 bg-muted/5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-display font-bold text-[13px] leading-tight">Meus Carrinhos</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-bold tabular-nums">
                        {carts.length}/3
                      </span>
                      <span className="text-[10px] text-muted-foreground opacity-30">|</span>
                      <button
                        className="text-[10px] text-primary hover:text-primary/80 font-bold underline-offset-2 hover:underline transition-colors"
                        onClick={() => { setOpen(false); navigate("/carrinhos"); }}
                      >
                        Ver todos
                      </button>
                    </div>
                  </div>
                </div>
                {canCreateCart && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[11px] gap-1.5 px-3 rounded-lg text-primary hover:bg-primary/10 font-bold transition-all hover:scale-105 active:scale-95"
                        onClick={() => setShowPicker(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Novo
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-primary text-primary-foreground text-[11px] px-2 py-1 border-none">
                      Criar um novo carrinho para outra empresa
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {isLoading ? (
                <div className="p-3 space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-border/40 p-3 space-y-4 animate-pulse">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3.5 w-1/2" />
                          <Skeleton className="h-2.5 w-1/3" />
                        </div>
                      </div>
                      {i === 0 && (
                        <div className="space-y-2.5 pt-2 border-t border-border/20">
                          {[...Array(2)].map((_, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <Skeleton className="h-8 w-8 rounded-lg" />
                              <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-2.5 w-3/4" />
                                <Skeleton className="h-2 w-1/4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : carts.length === 0 ? (
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
                  <ScrollArea className="max-h-[440px]">
                    <div className="p-3 space-y-2">
                      {carts.map((cart) => {
                        const isActive = cart.id === activeCartId;
                        const cartSubtotal = cart.items.reduce(
                          (sum, item) => sum + item.product_price * item.quantity,
                          0
                        );
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
                                  alt="Logo da empresa"
                                  className="w-9 h-9 rounded-lg object-contain bg-background border border-border/50 flex-shrink-0 p-0.5" loading="lazy" />
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
                                {cart.company_location && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {cart.company_location}
                                  </p>
                                )}
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
                                          clearCart(cart.id);
                                        }}
                                      >
                                        <Eraser className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-primary text-primary-foreground text-[11px] px-2 py-1 border-none">Limpar itens</TooltipContent>
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
                                  <TooltipContent side="top" className="bg-primary text-primary-foreground text-[11px] px-2 py-1 border-none">Excluir carrinho</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>

                            {/* Items list — only for active cart */}
                            {isActive && cart.items.length > 0 && (
                              <div className="border-t border-border/30 px-3 py-2 space-y-1.5">
                                {cart.items.slice(0, 5).map((item) => (
                                   <div
                                     key={item.id}
                                     className="flex items-start gap-2.5 py-1.5 px-1.5 rounded-lg hover:bg-background/60 group/item transition-colors relative"
                                   >
                                     <div className="relative flex-shrink-0 group/img">
                                       {item.product_image_url ? (
                                         <img
                                           src={item.product_image_url}
                                           alt={item.product_name}
                                           className="w-9 h-9 rounded-lg object-contain bg-background border border-border/30 p-0.5 mt-0.5 transition-transform group-hover/img:scale-110" 
                                           loading="lazy" 
                                         />
                                       ) : (
                                         <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center mt-0.5">
                                           <Package className="h-3.5 w-3.5 text-muted-foreground/50" />
                                         </div>
                                       )}
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); navigate(`/produto/${item.product_id}`); setOpen(false); }}
                                         className="absolute inset-0 bg-primary/10 flex items-center justify-center rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                       >
                                         <Eye className="h-3 w-3 text-primary" />
                                       </button>
                                     </div>
                                     
                                     <div className="flex-1 min-w-0">
                                       <p className="text-[11px] font-medium text-foreground/90 leading-tight line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                                          onClick={(e) => { e.stopPropagation(); navigate(`/produto/${item.product_id}`); setOpen(false); }}>
                                         {item.product_name}
                                       </p>
                                      {/* Price + Qty stepper row */}
                                       <div className="flex items-center justify-between mt-1.5 gap-2">
                                         <PriceLabel 
                                           label="Unitário" 
                                           value={item.product_price}
                                           isPrimary 
                                           className="flex-row items-center gap-1.5 space-y-0 text-[10px]"
                                         />
                                        {/* Qty stepper */}
                                        <div className="flex items-center gap-0 border border-border/50 rounded-md overflow-hidden">
                                          <button
                                            className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (item.quantity <= 1) {
                                                removeItem(item.id);
                                              } else {
                                                updateItemQuantity(item.id, item.quantity - 1);
                                              }
                                            }}
                                          >
                                            {item.quantity <= 1 ? (
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            ) : (
                                              <Minus className="h-3 w-3" />
                                            )}
                                          </button>
                                          <span className="h-6 min-w-[28px] flex items-center justify-center text-[11px] font-bold tabular-nums bg-muted/20 border-x border-border/30">
                                            {item.quantity}
                                          </span>
                                          <button
                                            className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateItemQuantity(item.id, item.quantity + 1);
                                            }}
                                          >
                                            <Plus className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                     </div>

                                     {/* Subtotal vertical for quick scanning */}
                                     <PriceLabel 
                                       label="Total" 
                                       value={item.product_price * item.quantity}
                                       className="items-end min-w-[60px]"
                                     />

                                     {/* Remove button */}
                                     <button
                                       className="h-5 w-5 flex items-center justify-center opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0 rounded mt-0.5"
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

                  {/* CTA Footer with subtotal */}
                  {activeCart && activeCart.items.length > 0 && (() => {
                    const subtotal = activeCart.items.reduce(
                      (sum, item) => sum + item.product_price * item.quantity,
                      0
                    );
                    return (
                      <div className="p-3 border-t border-border/40 space-y-2">
                        {/* Subtotal */}
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs text-muted-foreground">
                            Subtotal ({activeCart.items.length} {activeCart.items.length === 1 ? "item" : "itens"})
                          </span>
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        <Button
                          className="w-full gap-2 text-xs h-10 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => {
                            const cartIdToDelete = activeCart.id;
                            setOpen(false);
                            navigate("/orcamentos/novo", {
                              state: {
                                fromCart: true,
                                cartId: cartIdToDelete,
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
                            deleteCart(cartIdToDelete);
                          }}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                          Gerar Orçamento
                        </Button>
                      </div>
                    );
                  })()}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
