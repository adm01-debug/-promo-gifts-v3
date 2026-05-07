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

import { MainLayout } from "@/components/layout/MainLayout";
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
  ShoppingCart, Plus, Building2, Trash2, Clock, MapPin, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSEO } from "@/components/seo/PageSEO";
import { useSellerCartsPage } from "./seller-carts/useSellerCartsPage";
import { CartSidebar } from "./seller-carts/CartSidebar";
import { AvatarLogo } from "@/components/shared/AvatarLogo";

export default function SellerCartsPage() {
// ... keep existing code
                <div className="relative">
                  <AvatarLogo 
                    name={s.activeCart.company_name} 
                    logoUrl={s.activeCart.company_logo_url} 
                    size="xl" 
                    className="group-hover/header:scale-105 transition-transform duration-300" 
                    fallbackClassName="bg-primary/10 text-primary group-hover/header:bg-primary/20 transition-colors"
                  />
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
