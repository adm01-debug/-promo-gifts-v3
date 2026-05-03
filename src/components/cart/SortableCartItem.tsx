/**
 * SortableCartItem - Draggable product card for seller carts
 */

import { useState, useRef, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  Package, Trash2, Minus, Plus, Eye, MoreHorizontal, GripVertical,
  MessageSquare, ChevronDown, Calculator, MoveRight, CopyPlus,
  AlertTriangle,
} from "lucide-react";
import { type SellerCart, type SellerCartItem } from "@/hooks/useSellerCarts";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface SortableCartItemProps {
  item: SellerCartItem;
  index: number;
  otherCarts: SellerCart[];
  companyAccentColor?: string | null;
  stockMap: Map<string, number>;
  onRemove: (id: string, name: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onMoveToCart: (itemId: string, targetCartId: string) => void;
  onDuplicateToCart: (itemId: string, targetCartId: string) => void;
  onNavigate: (path: string) => void;
}

export const SortableCartItem = memo(function SortableCartItem({
  item, index, otherCarts, companyAccentColor, stockMap,
  onRemove, onUpdateQuantity, onUpdateNotes, onMoveToCart, onDuplicateToCart, onNavigate,
}: SortableCartItemProps) {
  const [notesOpen, setNotesOpen] = useState(!!item.notes);
  const [localNotes, setLocalNotes] = useState(item.notes || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const itemTotal = item.product_price * item.quantity;
  const stock = stockMap.get(item.product_id);
  const isLowStock = stock !== undefined && stock < item.quantity;
  const isOutOfStock = stock !== undefined && stock === 0;

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onUpdateNotes(item.id, value), 800);
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      data-testid="cart-item"
      data-cart-item-id={item.id}
      data-product-id={item.product_id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className={cn(
        "overflow-hidden group hover:border-primary/20 transition-all duration-200",
        isDragging && "shadow-xl ring-2 ring-primary/30",
        isOutOfStock && "opacity-60"
      )}>
        {companyAccentColor && (
          <div className="h-1 w-full" style={{ backgroundColor: companyAccentColor }} />
        )}

        {/* Product image */}
        <div className="relative aspect-square bg-muted/30">
          <button
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 z-10 h-7 w-7 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
           aria-label="Arrastar">
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <div
            data-testid="cart-item-image"
            className="w-full h-full cursor-pointer"
            onClick={() => onNavigate(`/produto/${item.product_id}`)}
          >
            {item.product_image_url ? (
              
<img src={item.product_image_url} alt={item.product_name} className="w-full h-full object-contain p-4" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Quick view overlay */}
          <div
            data-testid="cart-item-view"
            className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={() => onNavigate(`/produto/${item.product_id}`)}
          >
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
              <Eye className="h-3.5 w-3.5" />
              Ver Produto
            </Button>
          </div>

          {/* Actions menu */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="cart-item-menu-trigger" className="h-7 w-7 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground" aria-label="Mais opções">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem data-testid="cart-item-action-view" onClick={() => onNavigate(`/produto/${item.product_id}`)}>
                  <Eye className="h-3.5 w-3.5 mr-2" /> Ver Produto
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="cart-item-action-simulate" onClick={() => onNavigate(`/simulador?product=${item.product_id}`)}>
                  <Calculator className="h-3.5 w-3.5 mr-2" /> Simular Personalização
                </DropdownMenuItem>
                {otherCarts.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger data-testid="cart-item-action-move">
                        <MoveRight className="h-3.5 w-3.5 mr-2" /> Mover para...
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {otherCarts.map(c => (
                          <DropdownMenuItem key={c.id} data-testid="cart-item-move-target" data-target-cart-id={c.id} onClick={() => onMoveToCart(item.id, c.id)}>
                            {c.company_name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger data-testid="cart-item-action-duplicate">
                        <CopyPlus className="h-3.5 w-3.5 mr-2" /> Duplicar para...
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {otherCarts.map(c => (
                          <DropdownMenuItem key={c.id} data-testid="cart-item-duplicate-target" data-target-cart-id={c.id} onClick={() => onDuplicateToCart(item.id, c.id)}>
                            {c.company_name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="cart-item-action-remove"
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRemove(item.id, item.product_name)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stock alert badge */}
          {(isLowStock || isOutOfStock) && (
            <div
              data-testid={isOutOfStock ? "cart-item-stock-out" : "cart-item-stock-low"}
              className={cn(
                "absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium",
                isOutOfStock
                  ? "bg-destructive/90 text-destructive-foreground"
                  : "bg-warning/90 text-warning-foreground",
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              {isOutOfStock ? "Sem estoque" : `Estoque: ${stock}`}
            </div>
          )}

          {/* Color badge */}
          {item.color_name && (
            <div data-testid="cart-item-color" className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-full px-2 py-1">
              <div className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: item.color_hex || undefined }} />
              <span data-testid="cart-item-color-name" className="text-[10px] font-medium">{item.color_name}</span>
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="p-3 space-y-2">
          {item.product_sku && (
            <span data-testid="cart-item-sku" className="text-[10px] text-muted-foreground font-mono">{item.product_sku}</span>
          )}
          <h4 data-testid="cart-item-name" className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">
            {item.product_name}
          </h4>

          <div className="flex items-center justify-between">
            <span data-testid="cart-item-unit-price" className="text-sm font-bold text-primary tabular-nums">
              {formatCurrency(item.product_price)}
            </span>
          </div>

          {/* Quantity stepper */}
          <div className="flex items-center justify-between pt-1 border-t border-border/30">
            <div data-testid="cart-item-qty-stepper" className="flex items-center gap-0 border border-border/50 rounded-lg overflow-hidden bg-background">
              <button
                data-testid="cart-qty-decrement"
                aria-label="Diminuir quantidade"
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => {
                  if (item.quantity <= 1) {
                    onRemove(item.id, item.product_name);
                  } else {
                    onUpdateQuantity(item.id, item.quantity - 1);
                  }
                }}
              >
                {item.quantity <= 1 ? (
                  <Trash2 data-testid="cart-qty-remove-icon" className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <Minus data-testid="cart-qty-decrement-icon" className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                type="number"
                data-testid="cart-qty-input"
                value={item.quantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > 0) onUpdateQuantity(item.id, val);
                }}
                className="h-8 w-12 text-center text-xs font-bold tabular-nums bg-transparent border-x border-border/30 focus:outline-none focus:ring-1 focus:ring-primary/20 appearance-none m-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                data-testid="cart-qty-increment"
                aria-label="Aumentar quantidade"
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 active:bg-muted/80 transition-colors"
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <span data-testid="cart-item-total" className="text-sm font-bold text-foreground tabular-nums">
              {formatCurrency(itemTotal)}
            </span>
          </div>

          {/* Collapsible notes */}
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <CollapsibleTrigger asChild>
              <button data-testid="cart-item-notes-toggle" className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full" aria-label="Recolher">
                <MessageSquare className="h-3 w-3" />
                {item.notes ? "Observações" : "Adicionar observação"}
                <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", notesOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1.5">
              <Textarea
                data-testid="cart-item-notes-input"
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Ex: personalizar com logo do cliente..."
                className="text-xs min-h-[60px] resize-none"
                rows={2}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Card>
    </motion.div>
  );
});

SortableCartItem.displayName = 'SortableCartItem';
