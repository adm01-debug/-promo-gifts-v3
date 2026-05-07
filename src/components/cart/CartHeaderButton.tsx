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
import { AvatarLogo } from "@/components/shared/AvatarLogo";

export function CartHeaderButton() {
// ... keep existing code
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
                              <AvatarLogo 
                                name={cart.company_name} 
                                logoUrl={cart.company_logo_url} 
                                size="md" 
                                fallbackClassName={cn(isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}
                              />

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
