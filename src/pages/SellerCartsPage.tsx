/**
 * SellerCartsPage - Workspace completo de carrinhos do vendedor
 * Decomposed: hook in useSellerCartsPage, sidebar in CartSidebar.
 */
import { MainLayout } from "@/components/layout/MainLayout";
import { CartStatus } from "@/hooks/useSellerCarts";
import { CartCompanyPicker } from "@/components/cart/CartCompanyPicker";
import { SortableCartItem } from "@/components/cart/SortableCartItem";
import {
  getStatusCfg, STATUS_CONFIG, CartItemSkeleton, FollowUpTimer,
  CompareCartsDialog, MobileSummarySheet,
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, Plus, Building2, Package, Trash2,
  Clock, MapPin, FileText, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSEO } from "@/components/seo/PageSEO";
import { useSellerCartsPage } from "./seller-carts/useSellerCartsPage";
import { CartSidebar } from "./seller-carts/CartSidebar";

export default function SellerCartsPage() {
  return (
    <MainLayout>
      <PageSEO title="Carrinhos" description="Gerencie carrinhos de seleção de produtos para seus clientes." path="/carrinhos" noIndex />
      <SellerCartsContent />
    </MainLayout>
  );
}

function SellerCartsContent() {
  const s = useSellerCartsPage();

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Meus Carrinhos</h1>
            <p className="text-muted-foreground">
              {s.carts.length} {s.carts.length === 1 ? "carrinho" : "carrinhos"} • {s.totalItems} {s.totalItems === 1 ? "produto" : "produtos"}
              <span className="hidden sm:inline text-muted-foreground/60 ml-2">
                <kbd className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono">Ctrl+K</kbd> para buscar produtos
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {s.carts.length >= 2 && <CompareCartsDialog carts={s.carts} />}
          {s.canCreateCart && (
            <Button onClick={() => s.setShowNewCart(true)} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4" /> Novo Carrinho
            </Button>
          )}
        </div>
      </div>

      {/* New cart picker */}
      <AnimatePresence>
        {s.showNewCart && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm">Vincular a uma empresa</h3>
                <Button variant="ghost" size="sm" onClick={() => s.setShowNewCart(false)}>Cancelar</Button>
              </div>
              <CartCompanyPicker onCreated={() => s.setShowNewCart(false)} onCancel={() => s.setShowNewCart(false)} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart tabs */}
      {s.carts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {s.carts.map((cart) => {
            const isActive = cart.id === s.activeCartId;
            return (
              <button
                key={cart.id}
                onClick={() => s.setActiveCartId(cart.id)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 whitespace-nowrap flex-shrink-0",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20 animate-pulse-subtle"
                    : "border-border/40 hover:border-border/60 hover:bg-muted/30 text-muted-foreground"
                )}
              >
                {cart.company_logo_url ? (
                  <img src={cart.company_logo_url} alt="" className="w-7 h-7 rounded-lg object-contain bg-background border border-border/50 p-0.5" loading="lazy" />
                ) : (
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isActive ? "bg-primary/15" : "bg-muted")}>
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                )}
                <span className="text-sm font-medium">{cart.company_name}</span>
                <Badge variant="secondary" className={cn("text-[10px] px-1.5", isActive && "bg-primary/15 text-primary")}>{cart.items.length}</Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {s.isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <CartItemSkeleton key={i} />)}
          </div>
          <div className="space-y-4"><Skeleton className="h-64 w-full rounded-xl" /></div>
        </div>
      ) : s.carts.length === 0 ? (
        <EmptyState
          variant="cart"
          title="Monte o carrinho perfeito para seu cliente"
          description="Crie carrinhos vinculados a empresas, adicione produtos do catálogo e gere orçamentos profissionais em segundos."
          action={{ label: "Criar Primeiro Carrinho", onClick: () => s.setShowNewCart(true) }}
        />
      ) : s.activeCart ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-4">
            {/* Cart info bar */}
            <Card
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-border/40"
              style={s.companyAccentColor ? { borderTopColor: s.companyAccentColor, borderTopWidth: "3px" } : undefined}
            >
              <div className="flex items-center gap-3">
                {s.activeCart.company_logo_url ? (
                  <img src={s.activeCart.company_logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-background border border-border/50 p-1" loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-semibold text-lg">{s.activeCart.company_name}</h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity", getStatusCfg(s.activeCart.status).color)}>
                          {getStatusCfg(s.activeCart.status).label}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {(Object.entries(STATUS_CONFIG) as [CartStatus, typeof STATUS_CONFIG[CartStatus]][]).map(([key, cfg]) => (
                          <DropdownMenuItem key={key} onClick={() => s.updateCartStatus(s.activeCart!.id, key)} className={cn(s.activeCart!.status === key && "font-semibold")}>
                            <span className={cn("w-2 h-2 rounded-full mr-2", cfg.color.split(" ")[0])} />
                            {cfg.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {s.activeCart.company_location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.activeCart.company_location}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(s.activeCart.updated_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-1.5 text-xs" onClick={() => s.setConfirmDeleteCart(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            </Card>

            <FollowUpTimer createdAt={s.activeCart.created_at} />

            {/* Notes */}
            <Collapsible open={s.cartNotesOpen} onOpenChange={s.setCartNotesOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors" aria-label="Recolher">
                  <FileText className="h-3.5 w-3.5" />
                  {s.activeCart.notes ? "Notas da negociação" : "Adicionar notas da negociação"}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", s.cartNotesOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Textarea value={s.localCartNotes} onChange={(e) => s.handleCartNotesChange(e.target.value)} placeholder="Ex: Cliente interessado em kits de onboarding, negociação de prazo 30/60/90..." className="text-sm min-h-[80px]" rows={3} />
              </CollapsibleContent>
            </Collapsible>

            {/* Products grid */}
            {s.activeCart.items.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 rounded-xl border-[1.5px] border-dashed border-primary/10">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="font-display text-lg font-medium text-muted-foreground mb-1">Carrinho vazio</h3>
                <p className="text-sm text-muted-foreground/70 mb-4">Navegue pelo catálogo e adicione produtos a este carrinho</p>
                <Button variant="outline" onClick={() => s.navigate("/produtos")} className="gap-2">
                  <Package className="h-4 w-4" /> Explorar Produtos
                </Button>
              </div>
            ) : (
              <DndContext sensors={s.sensors} collisionDetection={closestCenter} onDragEnd={s.handleDragEnd}>
                <SortableContext items={s.activeCart.items.map(i => i.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {s.activeCart.items.map((item, index) => (
                        <SortableCartItem
                          key={item.id} item={item} index={index}
                          otherCarts={s.otherCarts} companyAccentColor={s.companyAccentColor}
                          stockMap={s.stockMap} onRemove={s.handleRemoveItem}
                          onUpdateQuantity={s.handleUpdateQuantity} onUpdateNotes={s.updateItemNotes}
                          onMoveToCart={s.handleMoveItem} onDuplicateToCart={s.handleDuplicateItem}
                          onNavigate={s.navigate}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Sidebar */}
          {s.activeCart.items.length > 0 && (
            <CartSidebar
              cart={s.activeCart} otherCarts={s.otherCarts}
              cartSubtotal={s.cartSubtotal} cartTotalQty={s.cartTotalQty}
              cartAge={s.cartAge} weightVolume={s.weightVolume}
              allProducts={s.allProducts} templates={s.templates}
              canCreateCart={s.canCreateCart}
              onGenerateQuote={s.handleGenerateQuote}
              onShareCart={s.shareCartLink}
              onDuplicateCart={(id) => {
                if (s.canCreateCart) s.duplicateCart(id);
                else toast.error("Limite de 3 carrinhos atingido");
              }}
              onExportCSV={s.exportCartToCSV}
              onExportPDF={s.exportCartToPDF}
              onSaveTemplate={s.handleSaveTemplate}
              onLoadTemplate={s.handleLoadTemplate}
              onDeleteTemplate={s.deleteTemplate}
              onClear={() => s.setConfirmClearCart(true)}
              onNavigate={s.navigate}
              onSetActiveCartId={s.setActiveCartId}
            />
          )}
        </div>
      ) : null}

      {/* Mobile summary */}
      {s.activeCart && (
        <MobileSummarySheet cart={s.activeCart} subtotal={s.cartSubtotal} totalQty={s.cartTotalQty} onGenerateQuote={() => s.handleGenerateQuote(s.activeCart!)} />
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={!!s.confirmQuoteCart}
        onOpenChange={(open) => { if (!open) s.setConfirmQuoteCart(null); }}
        variant="warning"
        title={`Gerar orçamento para ${s.confirmQuoteCart?.company_name}?`}
        description={`Os ${s.confirmQuoteCart?.items.length || 0} itens serão transferidos para um novo orçamento e o carrinho será removido.`}
        confirmLabel="Gerar Orçamento" cancelLabel="Cancelar"
        onConfirm={s.confirmGenerateQuote}
      />
      <DeleteConfirmDialog
        open={s.confirmDeleteCart} onOpenChange={s.setConfirmDeleteCart}
        entityName="carrinho" itemName={s.activeCart?.company_name}
        onConfirm={() => { if (s.activeCart) s.deleteCart(s.activeCart.id); s.setConfirmDeleteCart(false); }}
      />
      <ConfirmDialog
        open={s.confirmClearCart} onOpenChange={s.setConfirmClearCart}
        variant="warning" title="Limpar todos os itens?"
        description={`${s.activeCart?.items.length || 0} itens serão removidos do carrinho de ${s.activeCart?.company_name}.`}
        confirmLabel="Limpar" cancelLabel="Cancelar"
        onConfirm={() => { s.activeCart?.items.forEach(i => s.removeItem(i.id)); toast.success("Carrinho limpo"); s.setConfirmClearCart(false); }}
      />
    </div>
  );
}
