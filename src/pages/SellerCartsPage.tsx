/**
 * SellerCartsPage - Workspace completo de carrinhos do vendedor
 * Decomposed into sub-components for maintainability.
 */

import { useState, useCallback, useMemo, useRef, useEffect, useContext } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { SellerCart, CartStatus } from "@/hooks/useSellerCarts";
import { useCartTemplates, CartTemplateItem } from "@/hooks/useCartTemplates";
import { ProductsContext } from "@/contexts/ProductsContext";
import { CartCompanyPicker } from "@/components/cart/CartCompanyPicker";
import { SortableCartItem } from "@/components/cart/SortableCartItem";
import {
  formatCurrency, getStatusCfg, STATUS_CONFIG, recordAction,
  CartItemSkeleton, FollowUpTimer, CompareCartsDialog,
  exportCartToCSV, exportCartToPDF, shareCartLink,
  SmartSuggestions, ActionHistoryPanel,
  SaveTemplateDialog, LoadTemplateDialog, MobileSummarySheet,
} from "@/components/cart/CartUtilComponents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { DeleteConfirmDialog, ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, Plus, Building2, Package, Trash2, ArrowRight,
  Eraser, Clock, MapPin, FileText,
  Copy, Download, Share2,
  ChevronDown, Sparkles, TrendingUp, Weight, Box,
} from "lucide-react";
import { toast } from "sonner";
import { showUndoToast } from "@/utils/undoToast";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSEO } from "@/components/seo/PageSEO";

// ============================================
// MAIN PAGE
// ============================================

export default function SellerCartsPage() {
  return (
    <MainLayout>
      <PageSEO title="Carrinhos" description="Gerencie carrinhos de seleção de produtos para seus clientes." path="/carrinhos" noIndex />
      <SellerCartsContent />
    </MainLayout>
  );
}

function SellerCartsContent() {
  const navigate = useNavigate();
  const location = useLocation();
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
    addToActiveCart,
    removeItem,
    updateItemQuantity,
    updateItemNotes,
    updateItemSortOrder,
    updateCartNotes,
    updateCartStatus,
    duplicateCart,
    moveItemToCart,
    duplicateItemToCart,
  } = useSellerCartContext();

  const { templates, saveTemplate, deleteTemplate } = useCartTemplates();

  // Products context for stock alerts + suggestions
  const productsCtx = useContext(ProductsContext);
  const allProducts = productsCtx?.products || [];

  const [showNewCart, setShowNewCart] = useState(false);

  useEffect(() => {
    if (location.pathname === "/carrinhos/novo") {
      setShowNewCart(true);
    }
  }, [location.pathname]);

  const [cartNotesOpen, setCartNotesOpen] = useState(false);
  const [localCartNotes, setLocalCartNotes] = useState("");
  const debounceNotesRef = useRef<ReturnType<typeof setTimeout>>();

  // Build stock map from products
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    allProducts.forEach((p: { id: string; stock?: number }) => {
      if (p.stock !== undefined && p.stock !== null) {
        map.set(p.id, p.stock);
      }
    });
    return map;
  }, [allProducts]);

  // Weight/volume calculation
  const weightVolume = useMemo(() => {
    if (!activeCart) return null;
    let totalWeightG = 0;
    let totalVolumeCm3 = 0;
    let hasData = false;

    activeCart.items.forEach(item => {
      const product = allProducts.find((p: { id: string }) => p.id === item.product_id) as { dimensions?: { weight_g?: number }; boxVolumeCm3?: number } | undefined;
      if (!product) return;

      const weight = product.dimensions?.weight_g || 0;
      const volume = product.boxVolumeCm3 || 0;

      if (weight > 0) {
        totalWeightG += weight * item.quantity;
        hasData = true;
      }
      if (volume > 0) {
        totalVolumeCm3 += volume * item.quantity;
        hasData = true;
      }
    });

    if (!hasData) return null;
    return {
      weightKg: totalWeightG / 1000,
      volumeM3: totalVolumeCm3 / 1000000,
      volumeCm3: totalVolumeCm3,
    };
  }, [activeCart, allProducts]);

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
    const item = activeCart?.items.find(i => i.id === itemId);
    removeItem(itemId);

    if (item && activeCart) {
      recordAction(activeCart.id, { type: "remove", itemName, time: new Date() });
      showUndoToast({
        title: `${itemName} removido`,
        description: activeCart.company_name,
        onUndo: () => {
          addToActiveCart({
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku || undefined,
            product_image_url: item.product_image_url || undefined,
            product_price: item.product_price,
            quantity: item.quantity,
            color_name: item.color_name || undefined,
            color_hex: item.color_hex || undefined,
          });
        },
      });
    }
  }, [removeItem, activeCart, addToActiveCart]);

  const handleUpdateQuantity = useCallback((itemId: string, qty: number) => {
    updateItemQuantity(itemId, qty);
    const item = activeCart?.items.find(i => i.id === itemId);
    if (item && activeCart) {
      recordAction(activeCart.id, { type: "qty", itemName: item.product_name, detail: `${qty}`, time: new Date() });
    }
  }, [updateItemQuantity, activeCart]);

  const handleMoveItem = useCallback((itemId: string, targetCartId: string) => {
    const item = activeCart?.items.find(i => i.id === itemId);
    const targetCart = carts.find(c => c.id === targetCartId);
    moveItemToCart(itemId, targetCartId);
    if (item && activeCart) {
      recordAction(activeCart.id, { type: "move", itemName: item.product_name, detail: targetCart?.company_name, time: new Date() });
    }
  }, [moveItemToCart, activeCart, carts]);

  const handleDuplicateItem = useCallback((itemId: string, targetCartId: string) => {
    const item = activeCart?.items.find(i => i.id === itemId);
    const targetCart = carts.find(c => c.id === targetCartId);
    duplicateItemToCart(itemId, targetCartId);
    if (item && activeCart) {
      recordAction(activeCart.id, { type: "duplicate", itemName: item.product_name, detail: targetCart?.company_name, time: new Date() });
    }
  }, [duplicateItemToCart, activeCart, carts]);

  const handleSaveTemplate = useCallback((name: string, description: string) => {
    if (!activeCart) return;
    const items: CartTemplateItem[] = activeCart.items.map(i => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_sku: i.product_sku || undefined,
      product_image_url: i.product_image_url || undefined,
      product_price: i.product_price,
      quantity: i.quantity,
      color_name: i.color_name || undefined,
      color_hex: i.color_hex || undefined,
    }));
    saveTemplate.mutate({ name, description, items });
  }, [activeCart, saveTemplate]);

  const handleLoadTemplate = useCallback((items: CartTemplateItem[]) => {
    items.forEach(item => {
      addToActiveCart({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        product_image_url: item.product_image_url,
        product_price: item.product_price,
        quantity: item.quantity,
        color_name: item.color_name,
        color_hex: item.color_hex,
      });
    });
    toast.success("Template aplicado ao carrinho");
  }, [addToActiveCart]);

  const [confirmQuoteCart, setConfirmQuoteCart] = useState<SellerCart | null>(null);
  const [confirmDeleteCart, setConfirmDeleteCart] = useState(false);
  const [confirmClearCart, setConfirmClearCart] = useState(false);

  const handleGenerateQuote = useCallback((cart: SellerCart) => {
    setConfirmQuoteCart(cart);
  }, []);

  const confirmGenerateQuote = useCallback(() => {
    if (!confirmQuoteCart) return;
    navigate("/orcamentos/novo", {
      state: {
        fromCart: true,
        cartId: confirmQuoteCart.id,
        companyId: confirmQuoteCart.company_id,
        companyName: confirmQuoteCart.company_name,
        companyLocation: confirmQuoteCart.company_location,
        items: confirmQuoteCart.items.map(i => ({
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
    deleteCart(confirmQuoteCart.id);
    setConfirmQuoteCart(null);
  }, [confirmQuoteCart, navigate, deleteCart]);

  const otherCarts = useMemo(
    () => carts.filter(c => c.id !== activeCartId),
    [carts, activeCartId]
  );

  const cartAge = activeCart ? differenceInDays(new Date(), new Date(activeCart.created_at)) : 0;
  const cartSubtotal = activeCart ? activeCart.items.reduce((s, i) => s + i.product_price * i.quantity, 0) : 0;
  const cartTotalQty = activeCart ? activeCart.items.reduce((s, i) => s + i.quantity, 0) : 0;

  const companyAccentColor = useMemo(() => {
    if (!activeCart) return null;
    const cart = activeCart as SellerCart & { company_primary_color?: string };
    if (cart.company_primary_color) return cart.company_primary_color;
    return null;
  }, [activeCart]);

  return (
    <div className="space-y-6 animate-fade-in pb-32 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Meus Carrinhos
            </h1>
            <p className="text-muted-foreground">
              {carts.length} {carts.length === 1 ? "carrinho" : "carrinhos"} • {totalItems} {totalItems === 1 ? "produto" : "produtos"}
              <span className="hidden sm:inline text-muted-foreground/60 ml-2">
                <kbd className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono">Ctrl+K</kbd> para buscar produtos
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {carts.length >= 2 && <CompareCartsDialog carts={carts} />}
          {canCreateCart && (
            <Button
              onClick={() => setShowNewCart(true)}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Novo Carrinho
            </Button>
          )}
        </div>
      </div>

      {/* New cart picker */}
      <AnimatePresence>
        {showNewCart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm">Vincular a uma empresa</h3>
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
            return (
              <button
                key={cart.id}
                onClick={() => setActiveCartId(cart.id)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 whitespace-nowrap flex-shrink-0",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20 animate-pulse-subtle"
                    : "border-border/40 hover:border-border/60 hover:bg-muted/30 text-muted-foreground"
                )}
              >
                {cart.company_logo_url ? (
                  
<img src={cart.company_logo_url} alt="" className="w-7 h-7 rounded-lg object-contain bg-background border border-border/50 p-0.5"  loading="lazy" />
                ) : (
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isActive ? "bg-primary/15" : "bg-muted")}>
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                )}
                <span className="text-sm font-medium">{cart.company_name}</span>
                <Badge variant="secondary" className={cn("text-[10px] px-1.5", isActive && "bg-primary/15 text-primary")}>
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
            <Card
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-border/40"
              style={companyAccentColor ? { borderTopColor: companyAccentColor, borderTopWidth: "3px" } : undefined}
            >
              <div className="flex items-center gap-3">
                {activeCart.company_logo_url ? (
                  
<img src={activeCart.company_logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-background border border-border/50 p-1"  loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-semibold text-lg">{activeCart.company_name}</h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity",
                          getStatusCfg(activeCart.status).color
                        )}>
                          {getStatusCfg(activeCart.status).label}
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
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive gap-1.5 text-xs"
                onClick={() => setConfirmDeleteCart(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
              </div>
            </Card>

            <FollowUpTimer createdAt={activeCart.created_at} />

            {/* Cart general notes */}
            <Collapsible open={cartNotesOpen} onOpenChange={setCartNotesOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors" aria-label="Recolher">
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

            {/* Products grid */}
            {activeCart.items.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border/40">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="font-display text-lg font-medium text-muted-foreground mb-1">Carrinho vazio</h3>
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
                          companyAccentColor={companyAccentColor}
                          stockMap={stockMap}
                          onRemove={handleRemoveItem}
                          onUpdateQuantity={handleUpdateQuantity}
                          onUpdateNotes={updateItemNotes}
                          onMoveToCart={handleMoveItem}
                          onDuplicateToCart={handleDuplicateItem}
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
            <div className="hidden md:block xl:sticky xl:top-20 xl:self-start space-y-4">
              <Card className="p-5 space-y-4 border-primary/10">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Resumo do Carrinho
                </h3>

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

                  {weightVolume && (
                    <>
                      {weightVolume.weightKg > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            Peso estimado
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
                            <Box className="h-3 w-3" />
                            Volume estimado
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
                    <span className="font-bold text-lg text-primary tabular-nums">
                      {formatCurrency(cartSubtotal)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full gap-2 h-11 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                  onClick={() => handleGenerateQuote(activeCart)}
                >
                  <ArrowRight className="h-4 w-4" />
                  Gerar Orçamento
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => shareCartLink(activeCart.id)}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Compartilhar
                  </Button>
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
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => exportCartToCSV(activeCart)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => exportCartToPDF(activeCart)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                </div>

                <SaveTemplateDialog cart={activeCart} onSave={handleSaveTemplate} />
                <LoadTemplateDialog
                  templates={templates}
                  onLoad={handleLoadTemplate}
                  onDelete={(id) => deleteTemplate.mutate(id)}
                />

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 w-full"
                    onClick={() => setConfirmClearCart(true)}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Limpar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => navigate("/produtos")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>
              </Card>

              {/* Insights card */}
              <Card className="p-4 space-y-3 border-border/30">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-warning" />
                  Insights
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Score de conversão
                    </span>
                    <span className={cn(
                      "font-bold tabular-nums",
                      activeCart.items.length >= 5 ? "text-primary" :
                        activeCart.items.length >= 3 ? "text-warning" : "text-muted-foreground"
                    )}>
                      {Math.min(100, Math.round(
                        (activeCart.items.length * 15) +
                        (cartSubtotal > 1000 ? 20 : cartSubtotal > 500 ? 10 : 0) +
                        (activeCart.notes ? 10 : 0) +
                        (activeCart.status === "pronto_orcamento" ? 15 : activeCart.status === "em_negociacao" ? 5 : 0)
                      ))}%
                    </span>
                  </div>

                  <SmartSuggestions cart={activeCart} allProducts={allProducts} />
                  <ActionHistoryPanel cartId={activeCart.id} />

                  {cartAge >= 3 && (
                    <p className="text-[10px] text-warning bg-warning/5 rounded-lg px-2.5 py-1.5 border border-warning/10">
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
                        
<img src={cart.company_logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-background border border-border/50 p-0.5"  loading="lazy" />
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
                        getStatusCfg(cart.status).color
                      )}>
                        {getStatusCfg(cart.status).label}
                      </Badge>
                    </button>
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Mobile bottom sheet summary */}
      {activeCart && (
        <MobileSummarySheet
          cart={activeCart}
          subtotal={cartSubtotal}
          totalQty={cartTotalQty}
          onGenerateQuote={() => handleGenerateQuote(activeCart)}
        />
      )}

      {/* Confirm generate quote dialog */}
      <ConfirmDialog
        open={!!confirmQuoteCart}
        onOpenChange={(open) => { if (!open) setConfirmQuoteCart(null); }}
        variant="warning"
        title={`Gerar orçamento para ${confirmQuoteCart?.company_name}?`}
        description={`Os ${confirmQuoteCart?.items.length || 0} itens serão transferidos para um novo orçamento e o carrinho será removido.`}
        confirmLabel="Gerar Orçamento"
        cancelLabel="Cancelar"
        onConfirm={confirmGenerateQuote}
      />

      {/* Confirm delete cart dialog */}
      <DeleteConfirmDialog
        open={confirmDeleteCart}
        onOpenChange={setConfirmDeleteCart}
        entityName="carrinho"
        itemName={activeCart?.company_name}
        onConfirm={() => {
          if (activeCart) deleteCart(activeCart.id);
          setConfirmDeleteCart(false);
        }}
      />

      {/* Confirm clear cart dialog */}
      <ConfirmDialog
        open={confirmClearCart}
        onOpenChange={setConfirmClearCart}
        variant="warning"
        title="Limpar todos os itens?"
        description={`${activeCart?.items.length || 0} itens serão removidos do carrinho de ${activeCart?.company_name}.`}
        confirmLabel="Limpar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          activeCart?.items.forEach(i => removeItem(i.id));
          toast.success("Carrinho limpo");
          setConfirmClearCart(false);
        }}
      />
    </div>
  );
}
