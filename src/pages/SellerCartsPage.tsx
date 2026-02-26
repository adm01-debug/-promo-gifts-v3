/**
 * SellerCartsPage - Página dedicada de carrinhos do vendedor
 * Workspace completo com drag & drop, notas, status, duplicação,
 * alertas de estoque, timer de follow-up e insights inteligentes.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { SellerCart, SellerCartItem, CartStatus } from "@/hooks/useSellerCarts";
import { CartCompanyPicker } from "@/components/cart/CartCompanyPicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/common/EmptyState";
import { DeleteConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, Plus, Building2, Package, Trash2, ArrowRight,
  Eraser, Minus, Clock, MapPin, FileText, MoveRight,
  Eye, MoreHorizontal, Copy, GripVertical, MessageSquare,
  ChevronDown, AlertTriangle, Timer, Sparkles, TrendingUp,
  Download, Share2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_CONFIG: Record<CartStatus, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  em_negociacao: { label: "Em negociação", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  pronto_orcamento: { label: "Pronto p/ orçamento", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

// ============================================
// SORTABLE ITEM CARD
// ============================================

function SortableCartItem({
  item,
  index,
  otherCarts,
  onRemove,
  onUpdateQuantity,
  onUpdateNotes,
  onMoveToCart,
  onNavigate,
}: {
  item: SellerCartItem;
  index: number;
  otherCarts: SellerCart[];
  onRemove: (id: string, name: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onMoveToCart: (itemId: string, targetCartId: string) => void;
  onNavigate: (path: string) => void;
}) {
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

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onUpdateNotes(item.id, value), 800);
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className={cn(
        "overflow-hidden group hover:border-emerald-500/20 transition-all duration-200",
        isDragging && "shadow-xl ring-2 ring-emerald-500/30"
      )}>
        {/* Product image */}
        <div className="relative aspect-square bg-muted/30">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 z-10 h-7 w-7 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <div
            className="w-full h-full cursor-pointer"
            onClick={() => onNavigate(`/produto/${item.product_id}`)}
          >
            {item.product_image_url ? (
              <img
                src={item.product_image_url}
                alt={item.product_name}
                className="w-full h-full object-contain p-4"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Quick view overlay */}
          <div
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
                <button className="h-7 w-7 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onNavigate(`/produto/${item.product_id}`)}>
                  <Eye className="h-3.5 w-3.5 mr-2" /> Ver Produto
                </DropdownMenuItem>
                {otherCarts.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {otherCarts.map(c => (
                      <DropdownMenuItem key={c.id} onClick={() => onMoveToCart(item.id, c.id)}>
                        <MoveRight className="h-3.5 w-3.5 mr-2" />
                        Mover → {c.company_name}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRemove(item.id, item.product_name)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Color badge */}
          {item.color_name && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-full px-2 py-1">
              <div className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: item.color_hex || undefined }} />
              <span className="text-[10px] font-medium">{item.color_name}</span>
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="p-3 space-y-2">
          {item.product_sku && (
            <span className="text-[10px] text-muted-foreground font-mono">{item.product_sku}</span>
          )}
          <h4 className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">
            {item.product_name}
          </h4>

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-500 tabular-nums">
              {formatCurrency(item.product_price)}
            </span>
          </div>

          {/* Quantity stepper */}
          <div className="flex items-center justify-between pt-1 border-t border-border/30">
            <div className="flex items-center gap-0 border border-border/50 rounded-lg overflow-hidden">
              <button
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
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
              </button>
              <span className="h-8 min-w-[40px] flex items-center justify-center text-xs font-bold tabular-nums bg-muted/20 border-x border-border/30">
                {item.quantity.toLocaleString("pt-BR")}
              </span>
              <button
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {formatCurrency(itemTotal)}
            </span>
          </div>

          {/* Collapsible notes */}
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full">
                <MessageSquare className="h-3 w-3" />
                {item.notes ? "Observações" : "Adicionar observação"}
                <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", notesOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1.5">
              <Textarea
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
}

// ============================================
// SKELETON LOADER
// ============================================

function CartItemSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-20" />
        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </Card>
  );
}

// ============================================
// FOLLOW-UP TIMER
// ============================================

function FollowUpTimer({ createdAt }: { createdAt: string }) {
  const days = differenceInDays(new Date(), new Date(createdAt));
  const hours = differenceInHours(new Date(), new Date(createdAt));

  if (days < 1) return null;

  const isUrgent = days >= 3;
  const isWarning = days >= 2;

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border",
      isUrgent
        ? "bg-destructive/10 text-destructive border-destructive/20"
        : isWarning
          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
          : "bg-muted/50 text-muted-foreground border-border/30"
    )}>
      <Timer className="h-3.5 w-3.5" />
      <span>
        {isUrgent
          ? `${days} dias — Hora do follow-up!`
          : isWarning
            ? `${days} dias desde a criação`
            : `Criado há ${hours}h`}
      </span>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function SellerCartsPage() {
  return (
    <MainLayout>
      <SellerCartsContent />
    </MainLayout>
  );
}

function SellerCartsContent() {
  const navigate = useNavigate();
  const { cartId: routeCartId } = useParams<{ cartId?: string }>();
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
    updateItemNotes,
    updateItemSortOrder,
    updateCartNotes,
    updateCartStatus,
    duplicateCart,
    moveItemToCart,
  } = useSellerCartContext();

  const [showNewCart, setShowNewCart] = useState(false);
  const [cartNotesOpen, setCartNotesOpen] = useState(false);
  const [localCartNotes, setLocalCartNotes] = useState("");
  const debounceNotesRef = useRef<ReturnType<typeof setTimeout>>();

  // Deep link support
  useEffect(() => {
    if (routeCartId && carts.length > 0) {
      const found = carts.find(c => c.id === routeCartId);
      if (found) setActiveCartId(routeCartId);
    }
  }, [routeCartId, carts, setActiveCartId]);

  // Sync local cart notes
  useEffect(() => {
    setLocalCartNotes(activeCart?.notes || "");
    setCartNotesOpen(!!activeCart?.notes);
  }, [activeCart?.id, activeCart?.notes]);

  const handleCartNotesChange = (value: string) => {
    setLocalCartNotes(value);
    if (debounceNotesRef.current) clearTimeout(debounceNotesRef.current);
    debounceNotesRef.current = setTimeout(() => {
      if (activeCart) updateCartNotes(activeCart.id, value);
    }, 800);
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeCart) return;

    const items = activeCart.items;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const updates = reordered.map((item, idx) => ({ id: item.id, sort_order: idx }));
    updateItemSortOrder(updates);
  }, [activeCart, updateItemSortOrder]);

  const handleRemoveItem = useCallback((itemId: string, itemName: string) => {
    removeItem(itemId);
    toast.success(`${itemName} removido`, {
      action: { label: "Desfazer", onClick: () => toast.info("Use Ctrl+Z para desfazer (em breve)") },
    });
  }, [removeItem]);

  const handleGenerateQuote = (cart: SellerCart) => {
    const cartIdToDelete = cart.id;
    navigate("/orcamentos/novo", {
      state: {
        fromCart: true,
        cartId: cartIdToDelete,
        companyId: cart.company_id,
        companyName: cart.company_name,
        companyLocation: cart.company_location,
        items: cart.items.map(i => ({
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
  };

  const otherCarts = useMemo(
    () => carts.filter(c => c.id !== activeCartId),
    [carts, activeCartId]
  );

  // Computed insights
  const cartAge = activeCart
    ? differenceInDays(new Date(), new Date(activeCart.created_at))
    : 0;
  const cartSubtotal = activeCart
    ? activeCart.items.reduce((s, i) => s + i.product_price * i.quantity, 0)
    : 0;
  const cartTotalQty = activeCart
    ? activeCart.items.reduce((s, i) => s + i.quantity, 0)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <ShoppingCart className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Meus Carrinhos
            </h1>
            <p className="text-muted-foreground">
              {carts.length} {carts.length === 1 ? "carrinho" : "carrinhos"} • {totalItems} {totalItems === 1 ? "produto" : "produtos"}
            </p>
          </div>
        </div>

        {canCreateCart && (
          <Button
            onClick={() => setShowNewCart(true)}
            className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="h-4 w-4" />
            Novo Carrinho
          </Button>
        )}
      </div>

      {/* New cart picker */}
      <AnimatePresence>
        {showNewCart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Vincular a uma empresa</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowNewCart(false)}>
                  Cancelar
                </Button>
              </div>
              <CartCompanyPicker
                onCreated={() => setShowNewCart(false)}
                onCancel={() => setShowNewCart(false)}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart tabs */}
      {carts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {carts.map((cart) => {
            const isActive = cart.id === activeCartId;
            const statusCfg = STATUS_CONFIG[(cart.status as CartStatus) || "novo"];
            return (
              <button
                key={cart.id}
                onClick={() => setActiveCartId(cart.id)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 whitespace-nowrap flex-shrink-0",
                  isActive
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 shadow-sm ring-2 ring-emerald-500/20 animate-pulse-subtle"
                    : "border-border/40 hover:border-border/60 hover:bg-muted/30 text-muted-foreground"
                )}
              >
                {cart.company_logo_url ? (
                  <img src={cart.company_logo_url} alt="" className="w-7 h-7 rounded-lg object-contain bg-background border border-border/50 p-0.5" />
                ) : (
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isActive ? "bg-emerald-500/15" : "bg-muted")}>
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                )}
                <span className="text-sm font-medium">{cart.company_name}</span>
                <Badge variant="secondary" className={cn("text-[10px] px-1.5", isActive && "bg-emerald-500/15 text-emerald-500")}>
                  {cart.items.length}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <CartItemSkeleton key={i} />)}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : carts.length === 0 ? (
        <EmptyState
          variant="cart"
          title="Monte o carrinho perfeito para seu cliente"
          description="Crie carrinhos vinculados a empresas, adicione produtos do catálogo e gere orçamentos profissionais em segundos."
          action={{
            label: "Criar Primeiro Carrinho",
            onClick: () => setShowNewCart(true),
          }}
        />
      ) : activeCart ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* Main: Products grid */}
          <div className="space-y-4">
            {/* Cart info bar */}
            <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-border/40">
              <div className="flex items-center gap-3">
                {activeCart.company_logo_url ? (
                  <img src={activeCart.company_logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-background border border-border/50 p-1" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg">{activeCart.company_name}</h2>
                    {/* Status badge dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity",
                          STATUS_CONFIG[(activeCart.status as CartStatus) || "novo"].color
                        )}>
                          {STATUS_CONFIG[(activeCart.status as CartStatus) || "novo"].label}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {(Object.entries(STATUS_CONFIG) as [CartStatus, typeof STATUS_CONFIG[CartStatus]][]).map(([key, cfg]) => (
                          <DropdownMenuItem
                            key={key}
                            onClick={() => updateCartStatus(activeCart.id, key)}
                            className={cn(activeCart.status === key && "font-semibold")}
                          >
                            <span className={cn("w-2 h-2 rounded-full mr-2", cfg.color.split(" ")[0])} />
                            {cfg.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {activeCart.company_location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {activeCart.company_location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(activeCart.updated_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DeleteConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-1.5 text-xs">
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  }
                  title={`Excluir carrinho de ${activeCart.company_name}?`}
                  description={`Todos os ${activeCart.items.length} itens serão removidos. Esta ação não pode ser desfeita.`}
                  onConfirm={() => deleteCart(activeCart.id)}
                  itemName="carrinho"
                />
              </div>
            </Card>

            {/* Follow-up timer */}
            <FollowUpTimer createdAt={activeCart.created_at} />

            {/* Cart general notes */}
            <Collapsible open={cartNotesOpen} onOpenChange={setCartNotesOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <FileText className="h-3.5 w-3.5" />
                  {activeCart.notes ? "Notas da negociação" : "Adicionar notas da negociação"}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", cartNotesOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Textarea
                  value={localCartNotes}
                  onChange={(e) => handleCartNotesChange(e.target.value)}
                  placeholder="Ex: Cliente interessado em kits de onboarding, negociação de prazo 30/60/90..."
                  className="text-sm min-h-[80px]"
                  rows={3}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Products */}
            {activeCart.items.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border/40">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-1">Carrinho vazio</h3>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  Navegue pelo catálogo e adicione produtos a este carrinho
                </p>
                <Button variant="outline" onClick={() => navigate("/produtos")} className="gap-2">
                  <Package className="h-4 w-4" />
                  Explorar Produtos
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeCart.items.map(i => i.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {activeCart.items.map((item, index) => (
                        <SortableCartItem
                          key={item.id}
                          item={item}
                          index={index}
                          otherCarts={otherCarts}
                          onRemove={handleRemoveItem}
                          onUpdateQuantity={updateItemQuantity}
                          onUpdateNotes={updateItemNotes}
                          onMoveToCart={moveItemToCart}
                          onNavigate={navigate}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Sidebar: Summary */}
          {activeCart.items.length > 0 && (
            <div className="xl:sticky xl:top-20 xl:self-start space-y-4">
              <Card className="p-5 space-y-4 border-emerald-500/10">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  Resumo do Carrinho
                </h3>

                {/* Stats */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SKUs distintos</span>
                    <span className="font-medium tabular-nums">{activeCart.items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantidade total</span>
                    <span className="font-medium tabular-nums">
                      {cartTotalQty.toLocaleString("pt-BR")} un.
                    </span>
                  </div>
                  <div className="border-t border-border/30 pt-2.5 flex justify-between">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-bold text-lg text-emerald-500 tabular-nums">
                      {formatCurrency(cartSubtotal)}
                    </span>
                  </div>
                </div>

                {/* Generate quote CTA */}
                <Button
                  className="w-full gap-2 h-11 font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                  onClick={() => handleGenerateQuote(activeCart)}
                >
                  <ArrowRight className="h-4 w-4" />
                  Gerar Orçamento
                </Button>

                {/* Secondary actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => {
                      if (canCreateCart) {
                        duplicateCart(activeCart.id);
                      } else {
                        toast.error("Limite de 3 carrinhos atingido");
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => {
                      activeCart.items.forEach(i => removeItem(i.id));
                      toast.success("Carrinho limpo");
                    }}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Limpar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 col-span-2"
                    onClick={() => navigate("/produtos")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Produtos
                  </Button>
                </div>
              </Card>

              {/* Insights card */}
              <Card className="p-4 space-y-3 border-border/30">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Insights
                </h4>
                <div className="space-y-2">
                  {/* Conversion score */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Score de conversão
                    </span>
                    <span className={cn(
                      "font-bold tabular-nums",
                      activeCart.items.length >= 5 ? "text-emerald-500" :
                        activeCart.items.length >= 3 ? "text-amber-500" : "text-muted-foreground"
                    )}>
                      {Math.min(100, Math.round(
                        (activeCart.items.length * 15) +
                        (cartSubtotal > 1000 ? 20 : cartSubtotal > 500 ? 10 : 0) +
                        (activeCart.notes ? 10 : 0) +
                        (activeCart.status === "pronto_orcamento" ? 15 : activeCart.status === "em_negociacao" ? 5 : 0)
                      ))}%
                    </span>
                  </div>
                  {/* Tips */}
                  {!activeCart.notes && (
                    <p className="text-[10px] text-muted-foreground/70 bg-muted/30 rounded-lg px-2.5 py-1.5">
                      💡 Adicione notas da negociação para +10% no score
                    </p>
                  )}
                  {activeCart.items.length < 3 && (
                    <p className="text-[10px] text-muted-foreground/70 bg-muted/30 rounded-lg px-2.5 py-1.5">
                      📦 Carrinhos com 5+ itens têm maior taxa de conversão
                    </p>
                  )}
                  {cartAge >= 3 && (
                    <p className="text-[10px] text-amber-600 bg-amber-500/5 rounded-lg px-2.5 py-1.5 border border-amber-500/10">
                      ⏰ Carrinho há {cartAge} dias — considere fazer follow-up!
                    </p>
                  )}
                </div>
              </Card>

              {/* Other carts quick access */}
              {otherCarts.length > 0 && (
                <Card className="p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Outros Carrinhos
                  </h4>
                  {otherCarts.map(cart => (
                    <button
                      key={cart.id}
                      onClick={() => setActiveCartId(cart.id)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border/30 hover:border-border/60 hover:bg-muted/20 transition-all text-left"
                    >
                      {cart.company_logo_url ? (
                        <img src={cart.company_logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-background border border-border/50 p-0.5" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{cart.company_name}</p>
                        <p className="text-[10px] text-muted-foreground">{cart.items.length} itens</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[9px] px-1.5",
                        STATUS_CONFIG[(cart.status as CartStatus) || "novo"].color
                      )}>
                        {STATUS_CONFIG[(cart.status as CartStatus) || "novo"].label}
                      </Badge>
                    </button>
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
