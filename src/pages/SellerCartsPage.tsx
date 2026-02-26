/**
 * SellerCartsPage - Página dedicada de carrinhos do vendedor
 * Layout expandido com tabs por empresa, grid de produtos e painel de resumo
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { CartCompanyPicker } from "@/components/cart/CartCompanyPicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/common/EmptyState";
import { DeleteConfirmDialog } from "@/components/ui/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, Plus, Building2, Package, Trash2, ArrowRight,
  Eraser, Minus, Clock, MapPin, FileText, MoveRight,
  AlertTriangle, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SellerCartsPage() {
  return (
    <MainLayout>
      <SellerCartsContent />
    </MainLayout>
  );
}

function SellerCartsContent() {
  const navigate = useNavigate();
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
  } = useSellerCartContext();

  const [showNewCart, setShowNewCart] = useState(false);

  const handleGenerateQuote = (cart: typeof carts[0]) => {
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
              return (
                <button
                  key={cart.id}
                  onClick={() => setActiveCartId(cart.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 whitespace-nowrap flex-shrink-0",
                    isActive
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 shadow-sm"
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

        {/* Active cart content */}
        {carts.length === 0 ? (
          <EmptyState
            variant="cart"
            title="Nenhum carrinho criado"
            description="Crie um carrinho vinculado a uma empresa para coletar produtos e gerar orçamentos rapidamente."
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
                    <h2 className="font-semibold text-lg">{activeCart.company_name}</h2>
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
                        Excluir Carrinho
                      </Button>
                    }
                    title={`Excluir carrinho de ${activeCart.company_name}?`}
                    description={`Todos os ${activeCart.items.length} itens serão removidos. Esta ação não pode ser desfeita.`}
                    onConfirm={() => deleteCart(activeCart.id)}
                    itemName="carrinho"
                  />
                </div>
              </Card>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {activeCart.items.map((item, index) => {
                      const itemTotal = item.product_price * item.quantity;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <Card className="overflow-hidden group hover:border-emerald-500/20 transition-all duration-200">
                            {/* Product image */}
                            <div
                              className="relative aspect-square bg-muted/30 cursor-pointer"
                              onClick={() => navigate(`/produto/${item.product_id}`)}
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

                              {/* Quick view overlay */}
                              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                                  <Eye className="h-3.5 w-3.5" />
                                  Ver Produto
                                </Button>
                              </div>

                              {/* Remove btn */}
                              <button
                                className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItem(item.id);
                                  toast.success(`${item.product_name} removido`);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

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
                                        removeItem(item.id);
                                        toast.success(`${item.product_name} removido`);
                                      } else {
                                        updateItemQuantity(item.id, item.quantity - 1);
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
                                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <span className="text-sm font-bold text-foreground tabular-nums">
                                  {formatCurrency(itemTotal)}
                                </span>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
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
                      <span className="text-muted-foreground">Produtos distintos</span>
                      <span className="font-medium tabular-nums">{activeCart.items.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantidade total</span>
                      <span className="font-medium tabular-nums">
                        {activeCart.items.reduce((s, i) => s + i.quantity, 0).toLocaleString("pt-BR")} un.
                      </span>
                    </div>
                    <div className="border-t border-border/30 pt-2.5 flex justify-between">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-bold text-lg text-emerald-500 tabular-nums">
                        {formatCurrency(activeCart.items.reduce((s, i) => s + i.product_price * i.quantity, 0))}
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={() => {
                        activeCart.items.forEach(i => removeItem(i.id));
                        toast.success("Carrinho limpo");
                      }}
                    >
                      <Eraser className="h-3.5 w-3.5" />
                      Limpar Itens
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={() => navigate("/produtos")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Produtos
                    </Button>
                  </div>
                </Card>

                {/* Other carts quick access */}
                {carts.length > 1 && (
                  <Card className="p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Outros Carrinhos
                    </h4>
                    {carts
                      .filter(c => c.id !== activeCartId)
                      .map(cart => (
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
                          <MoveRight className="h-3.5 w-3.5 text-muted-foreground" />
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
