/**
 * SellerCartsPage - Workspace de carrinhos do vendedor (Onda Excelência UX).
 * - Header compactado (Carrinhos · X · Y · R$ Z)
 * - Picker em Dialog (Recentes/Favoritas/Todas)
 * - Tabs ricas (status dot, contador colorido, indicador follow-up, +novo)
 * - Cart header fundido (status como Select óbvio)
 * - Empty state inteligente (template / duplicar / catálogo)
 * - Notas sempre visíveis (textarea inline com debounce)
 * - Sidebar reorganizada (Hero pricing → Ação → Menu) + Health Checklist
 */
import { useCallback, useMemo, useRef } from "react";

import { type CartStatus } from "@/hooks/useSellerCarts";
import { CartCompanyPickerDialog } from "@/components/cart/CartCompanyPickerDialog";
import { CartTabsRich } from "@/components/cart/CartTabsRich";
import { CartEmptyStateSmart } from "@/components/cart/CartEmptyStateSmart";
import { SortableCartItem } from "@/components/cart/SortableCartItem";
import {
  getStatusCfg, STATUS_CONFIG, CartItemSkeleton, FollowUpTimer,
  CompareCartsDialog, MobileSummarySheet, formatCurrency,
} from "@/components/cart/CartUtilComponents";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { DeleteConfirmDialog, ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, Plus, Building2, Trash2, Clock, MapPin, FileText, Search, ArrowUpDown, Filter, Package, MoveRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSEO } from "@/components/seo/PageSEO";
import { useSellerCartsPage } from "./seller-carts/useSellerCartsPage";
import { CartSidebar } from "./seller-carts/CartSidebar";

export default function SellerCartsPage() {
  return (
    <>
      <PageSEO title="Carrinhos" description="Gerencie carrinhos de seleção de produtos para seus clientes." path="/carrinhos" noIndex />
      <SellerCartsContent />
    </>
  );
}

const NOTES_PLACEHOLDERS = [
  "Cliente quer entrega para o evento dia DD/MM...",
  "Negociar prazo 30/60/90 dias...",
  "Aprovar arte até dia X — produção começa após confirmação...",
  "Margem-alvo: XX%. Frete por conta do cliente.",
];

function SellerCartsContent() {
  const s = useSellerCartsPage();
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const focusNotes = useCallback(() => {
    notesRef.current?.focus();
    notesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const aggregateTotal = useMemo(
    () => s.carts.reduce((sum, c) => sum + c.items.reduce((a, i) => a + i.product_price * i.quantity, 0), 0),
    [s.carts]
  );

  // Stable rotating placeholder per cart
  const notesPlaceholder = useMemo(() => {
    if (!s.activeCart) return NOTES_PLACEHOLDERS[0];
    const seed = s.activeCart.id.charCodeAt(0) % NOTES_PLACEHOLDERS.length;
    return NOTES_PLACEHOLDERS[seed];
  }, [s.activeCart]);

  const handleDuplicateLast = useCallback((sourceCart: typeof s.activeCart) => {
    if (!sourceCart) return;
    sourceCart.items.forEach(i => {
      // re-uses the addToActiveCart through handleLoadTemplate-like flow
      s.handleLoadTemplate([{
        product_id: i.product_id, product_name: i.product_name,
        product_sku: i.product_sku || undefined, product_image_url: i.product_image_url || undefined,
        product_price: i.product_price, quantity: i.quantity,
        color_name: i.color_name || undefined, color_hex: i.color_hex || undefined,
      }]);
    });
  }, [s]);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
      {/* Header compactado */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 data-testid="page-title-carrinhos" className="text-xl lg:text-2xl font-display font-bold text-foreground leading-tight">Carrinhos</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span className="tabular-nums">{s.carts.length}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="tabular-nums">{s.totalItems} itens</span>
              {aggregateTotal > 0 && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="tabular-nums font-medium text-foreground/80">{formatCurrency(aggregateTotal)}</span>
                </>
              )}
              <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-muted-foreground/50" title="Buscar produtos">
                <kbd className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono">Ctrl+K</kbd>
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s.carts.length >= 2 && <CompareCartsDialog carts={s.carts} />}
          
          <div className="flex items-center gap-2 border border-border/40 bg-card/60 rounded-xl p-1 h-9 shadow-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground ml-2" />
            <input 
              type="text" 
              placeholder="Busca global..."
              className="bg-transparent border-none text-xs w-32 sm:w-48 focus:ring-0 placeholder:text-muted-foreground/50 h-full"
              value={s.searchTerm}
              onChange={(e) => s.setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={s.companyFilter} onValueChange={s.setCompanyFilter}>
            <SelectTrigger className="h-9 text-xs w-[140px] gap-2 rounded-xl border-border/40 bg-card/60 shadow-sm">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todas Empresas</SelectItem>
              {Array.from(new Set(s.carts.map(c => c.company_name))).map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex items-center gap-2 border border-border/40 bg-card/60 rounded-xl p-1 h-9 shadow-sm">
            <Package className="h-3.5 w-3.5 text-muted-foreground ml-2" />
            <input 
              type="text" 
              placeholder="Filtrar produto..."
              list="product-suggestions"
              className="bg-transparent border-none text-xs w-32 focus:ring-0 placeholder:text-muted-foreground/50 h-full"
              value={s.productFilter}
              onChange={(e) => s.setProductFilter(e.target.value)}
            />
            <datalist id="product-suggestions">
              {s.productSuggestions.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <Select value={s.sortBy} onValueChange={s.setSortBy}>
            <SelectTrigger className="h-9 text-xs w-[140px] gap-2 rounded-xl border-border/40 bg-card/60 shadow-sm">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="date-desc">Mais recentes</SelectItem>
              <SelectItem value="date-asc">Mais antigos</SelectItem>
              <SelectItem value="total-desc">Maior valor</SelectItem>
              <SelectItem value="total-asc">Menor valor</SelectItem>
            </SelectContent>
          </Select>

          {(s.searchTerm || s.productFilter || s.companyFilter !== "all" || s.sortBy !== "date-desc") && (
            <Button 
              variant="ghost" 
              onClick={s.handleClearFilters}
              size="sm" 
              className="h-9 px-3 rounded-xl text-xs gap-1.5 hover:bg-destructive/5 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}

          {s.canCreateCart && (
            <Button onClick={() => s.setShowNewCart(true)} size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground h-9 shadow-sm rounded-xl px-4">
              <Plus className="h-4 w-4" /> Novo Carrinho
            </Button>
          )}
        </div>
      </header>

      {/* Picker em Dialog */}
      <CartCompanyPickerDialog
        open={s.showNewCart}
        onOpenChange={s.setShowNewCart}
        onCreated={() => s.setShowNewCart(false)}
      />

      {/* Tabs ricas */}
      {s.carts.length > 0 && (
        <CartTabsRich
          carts={s.filteredCarts}
          activeCartId={s.activeCartId}
          canCreateCart={s.canCreateCart}
          onSelect={s.setActiveCartId}
          onNew={() => s.setShowNewCart(true)}
          isLoading={s.isLoading}
        />
      )}

      {/* Conteúdo */}
      {s.isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-4">
            <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border/20 rounded-xl bg-card/40 animate-pulse">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl opacity-30" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 opacity-20" />
                  <Skeleton className="h-3 w-48 opacity-10" />
                </div>
              </div>
              <Skeleton className="h-8 w-32 rounded-lg opacity-20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <CartItemSkeleton key={i} />)}
            </div>
          </div>
          <div className="space-y-4 animate-pulse">
            <Skeleton className="h-[400px] w-full rounded-xl opacity-20" />
            <Skeleton className="h-[200px] w-full rounded-xl opacity-10" />
          </div>
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
            {/* Cart header fundido (status Select óbvio + ações inline) */}
            <Card
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-border/40 shadow-sm relative overflow-hidden group/header"
              style={s.companyAccentColor ? { borderLeft: `4px solid ${s.companyAccentColor}` } : undefined}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative">
                  {s.activeCart.company_logo_url ? (
                    <img src={s.activeCart.company_logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-background border border-border/40 p-1.5 flex-shrink-0 shadow-inner group-hover/header:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover/header:bg-primary/20 transition-colors">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
                    getStatusCfg(s.activeCart.status).color.split(" ")[0]
                  )} />
                </div>
                <div className="min-w-0 flex flex-col gap-0.5">
                  <h2 className="font-display font-bold text-lg truncate tracking-tight text-foreground/90">{s.activeCart.company_name}</h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                    {s.activeCart.company_location && (
                      <span className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 opacity-60" />{s.activeCart.company_location}</span>
                    )}
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="h-3 w-3 opacity-60" />
                      Atualizado {formatDistanceToNow(new Date(s.activeCart.updated_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <Select
                  value={s.activeCart.status}
                  onValueChange={(v) => s.updateCartStatus(s.activeCart!.id, v as CartStatus)}
                >
                  <SelectTrigger className="h-9 text-xs font-bold w-auto min-w-[170px] gap-2 rounded-xl border-border/40 bg-muted/20 hover:bg-muted/40 transition-all">
                    <span className={cn("w-2 h-2 rounded-full inline-block ring-2 ring-background shadow-sm", getStatusCfg(s.activeCart.status).color.split(" ")[0])} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl p-1">
                    {(Object.entries(STATUS_CONFIG) as [CartStatus, typeof STATUS_CONFIG[CartStatus]][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key} className="rounded-lg py-2">
                        <span className="flex items-center gap-2.5">
                          <span className={cn("w-2 h-2 rounded-full shadow-sm", cfg.color.split(" ")[0])} />
                          <span className="font-medium">{cfg.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/5 gap-2 text-xs font-bold h-9 rounded-xl px-3 transition-all" onClick={() => s.setConfirmDeleteCart(true)}>
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </div>
            </Card>

            <FollowUpTimer createdAt={s.activeCart.created_at} />

            {/* Notas sempre visíveis */}
            <div className="space-y-2 group/notes bg-card/40 p-3 rounded-xl border border-border/30">
              <label htmlFor="cart-notes" className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider opacity-70 group-hover/notes:opacity-100 transition-opacity">
                <FileText className="h-3 w-3 text-primary" /> Notas da negociação
              </label>
              <Textarea
                id="cart-notes"
                ref={notesRef}
                value={s.localCartNotes}
                onChange={(e) => s.handleCartNotesChange(e.target.value)}
                placeholder={notesPlaceholder}
                className="text-sm min-h-[90px] resize-y bg-background/50 border-border/30 focus:border-primary/40 focus:ring-primary/10 transition-all rounded-lg"
                rows={3}
              />
            </div>

            {/* Produtos */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4" /> Produtos no carrinho
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2 bg-muted/20 p-1 rounded-lg border border-border/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">Modo:</span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant={s.itemsSortBy === "manual" ? "primary" : "ghost"} 
                      size="icon" 
                      className="h-6 w-12 text-[10px] rounded-md font-bold uppercase"
                      onClick={() => s.setItemsSortBy("manual")}
                    >
                      Manual
                    </Button>
                    <Button 
                      variant={s.itemsSortBy !== "manual" ? "secondary" : "ghost"} 
                      size="icon" 
                      className="h-6 w-12 text-[10px] rounded-md font-bold uppercase"
                      onClick={() => s.itemsSortBy === "manual" && s.setItemsSortBy("price-desc")}
                    >
                      Auto
                    </Button>
                  </div>
                </div>

                <Select 
                  value={s.itemsSortBy} 
                  onValueChange={s.setItemsSortBy}
                  disabled={s.itemsSortBy === "manual" && false} // Just a visual divider if we wanted
                >
                  <SelectTrigger className={cn(
                    "h-8 text-[11px] w-[140px] rounded-lg border-border/40 bg-card/60 transition-all",
                    s.itemsSortBy === "manual" ? "opacity-50 grayscale" : "opacity-100 ring-2 ring-primary/20 border-primary/30"
                  )}>
                    <SelectValue placeholder="Tipo de ordenação" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="manual" className="font-bold text-primary italic">Arrastar Manualmente</SelectItem>
                    <SelectItem value="price-desc">Maior Preço</SelectItem>
                    <SelectItem value="price-asc">Menor Preço</SelectItem>
                    <SelectItem value="qty-desc">Maior Qtd</SelectItem>
                    <SelectItem value="qty-asc">Menor Qtd</SelectItem>
                    <SelectItem value="total-desc">Maior Subtotal</SelectItem>
                    <SelectItem value="total-asc">Menor Subtotal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ações em Massa (Barra flutuante) */}
            <AnimatePresence>
              {s.selectedItemIds.size > 0 && (
                <motion.div 
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-foreground text-background px-6 py-3 rounded-2xl shadow-2xl border border-border/10 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3 pr-4 border-r border-background/20">
                    <span className="text-xs font-black tabular-nums bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center">
                      {s.selectedItemIds.size}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80 whitespace-nowrap">Itens Selecionados</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select onValueChange={s.handleBulkMove}>
                      <SelectTrigger className="h-9 bg-transparent border-background/20 text-background text-xs font-bold rounded-xl w-[180px] hover:bg-background/10 transition-colors">
                        <MoveRight className="h-4 w-4 mr-2 opacity-60" />
                        <SelectValue placeholder="Mover para..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {s.otherCarts.map(c => (
                          <SelectItem key={c.id} value={c.id} className="rounded-lg">{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="ghost" 
                      onClick={s.handleBulkRemove}
                      className="h-9 px-4 rounded-xl text-xs font-bold gap-2 text-destructive-foreground hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" /> Remover
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      onClick={s.clearSelection}
                      className="h-9 px-4 rounded-xl text-xs font-bold gap-2 hover:bg-background/10"
                    >
                      Cancelar
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {s.activeCart.items.length === 0 ? (
              <CartEmptyStateSmart
                activeCart={s.activeCart}
                templates={s.templates as { id: string; name: string; description?: string; items: import("@/hooks/useCartTemplates").CartTemplateItem[] }[]}
                otherCarts={s.otherCarts}
                onApplyTemplate={s.handleLoadTemplate}
                onDuplicateLast={handleDuplicateLast}
                onNavigateProducts={() => s.navigate("/produtos")}
              />
            ) : (
              <DndContext sensors={s.sensors} collisionDetection={closestCenter} onDragEnd={s.handleDragEnd}>
                <SortableContext items={s.sortedItems.map(i => i.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {s.sortedItems.map((item, index) => (
                        <SortableCartItem
                          key={item.id} item={item} index={index}
                          otherCarts={s.otherCarts} companyAccentColor={s.companyAccentColor}
                          stockMap={s.stockMap} onRemove={s.handleRemoveItem}
                          onUpdateQuantity={s.handleUpdateQuantity} onUpdateNotes={s.updateItemNotes}
                          onMoveToCart={s.handleMoveItem} onDuplicateToCart={s.handleDuplicateItem}
                          onNavigate={s.navigate}
                          isSelected={s.selectedItemIds.has(item.id)}
                          isSelectionMode={s.selectedItemIds.size > 0}
                          onToggleSelection={s.toggleItemSelection}
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
              allProducts={s.allProducts} isLoadingProducts={s.isLoadingProducts}
              templates={s.templates} canCreateCart={s.canCreateCart}
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
              onFocusNotes={focusNotes}
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
        testId="cart-confirm-dialog"
      />
      <DeleteConfirmDialog
        open={s.confirmDeleteCart} onOpenChange={s.setConfirmDeleteCart}
        entityName="carrinho" itemName={s.activeCart?.company_name}
        onConfirm={() => { if (s.activeCart) s.deleteCart(s.activeCart.id); s.setConfirmDeleteCart(false); }}
        testId="cart-delete-dialog"
      />
      <ConfirmDialog
        open={s.confirmClearCart} onOpenChange={s.setConfirmClearCart}
        variant="warning" title="Limpar todos os itens?"
        description={`${s.activeCart?.items.length || 0} itens serão removidos do carrinho de ${s.activeCart?.company_name}.`}
        confirmLabel="Limpar" cancelLabel="Cancelar"
        onConfirm={s.handleClearCart}
        testId="cart-clear-dialog"
      />
    </div>
  );
}
