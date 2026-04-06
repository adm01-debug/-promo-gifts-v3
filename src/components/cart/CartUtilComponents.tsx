/**
 * Cart utility components: Skeletons, FollowUpTimer, Compare, Export, Suggestions, History, Templates, Mobile
 */

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Building2, Package, Trash2, ArrowRight, FileText, Copy, Plus,
  MessageSquare, ChevronDown, Timer, Sparkles, TrendingUp,
  Download, Columns, Lightbulb, ChevronUp, Save, BookTemplate, History,
  MoveRight,
} from "lucide-react";
import { toast } from "sonner";
import { SellerCart, CartStatus } from "@/hooks/useSellerCarts";
import { CartTemplateItem } from "@/hooks/useCartTemplates";
import { differenceInDays, differenceInHours, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// HELPERS
// ============================================

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const STATUS_CONFIG: Record<CartStatus, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-primary/10 text-primary border-primary/20" },
  em_negociacao: { label: "Em negociação", color: "bg-warning/10 text-warning border-warning/20" },
  pronto_orcamento: { label: "Pronto p/ orçamento", color: "bg-primary/10 text-primary border-primary/20" },
};

export function getStatusCfg(status: string | undefined | null) {
  return STATUS_CONFIG[(status as CartStatus)] || STATUS_CONFIG.novo;
}

// ============================================
// ACTION HISTORY (in-memory per session)
// ============================================

export interface CartAction {
  type: "add" | "remove" | "qty" | "move" | "duplicate";
  itemName: string;
  detail?: string;
  time: Date;
}

const actionHistoryMap = new Map<string, CartAction[]>();

export function recordAction(cartId: string, action: CartAction) {
  const list = actionHistoryMap.get(cartId) || [];
  list.unshift(action);
  if (list.length > 20) list.pop();
  actionHistoryMap.set(cartId, list);
}

export function getActionHistory(cartId: string): CartAction[] {
  return actionHistoryMap.get(cartId) || [];
}

// ============================================
// SKELETON LOADER
// ============================================

export function CartItemSkeleton() {
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

export function FollowUpTimer({ createdAt }: { createdAt: string }) {
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
          ? "bg-warning/10 text-warning border-warning/20"
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
// COMPARE SIDE-BY-SIDE DIALOG
// ============================================

export function CompareCartsDialog({ carts }: { carts: SellerCart[] }) {
  if (carts.length < 2) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Columns className="h-3.5 w-3.5" />
          Comparar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Comparar Carrinhos</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh]">
          <div className={cn("grid gap-4", carts.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
            {carts.map(cart => {
              const subtotal = cart.items.reduce((s, i) => s + i.product_price * i.quantity, 0);
              const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0);
              const statusCfg = getStatusCfg(cart.status);
              return (
                <Card key={cart.id} className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {cart.company_logo_url ? (
                      
<img src={cart.company_logo_url} alt="Logo da empresa" className="w-8 h-8 rounded-lg object-contain bg-background border border-border/50 p-0.5"  loading="lazy" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{cart.company_name}</p>
                      <Badge variant="outline" className={cn("text-[9px]", statusCfg.color)}>
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SKUs</span>
                      <span className="font-medium">{cart.items.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Qtd total</span>
                      <span className="font-medium">{totalQty.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/30 pt-1.5">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-bold text-primary">{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {cart.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-xs p-1.5 rounded-lg bg-muted/30">
                        {item.product_image_url ? (
                          
<img src={item.product_image_url} alt="Logo da empresa" className="w-8 h-8 rounded object-contain bg-background"  loading="lazy" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <Package className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{item.product_name}</p>
                          <p className="text-muted-foreground">{item.quantity}x {formatCurrency(item.product_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// EXPORT UTILITIES
// ============================================

export function exportCartToCSV(cart: SellerCart) {
  const header = "SKU,Produto,Cor,Qtd,Preço Unit.,Subtotal,Observações";
  const rows = cart.items.map(i =>
    [
      i.product_sku || "",
      `"${i.product_name}"`,
      i.color_name || "",
      i.quantity,
      i.product_price.toFixed(2),
      (i.product_price * i.quantity).toFixed(2),
      `"${(i.notes || "").replace(/"/g, '""')}"`,
    ].join(",")
  );
  const total = cart.items.reduce((s, i) => s + i.product_price * i.quantity, 0);
  rows.push(`,,,,Total,${total.toFixed(2)},`);

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carrinho-${cart.company_name.replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exportado com sucesso");
}

export async function exportCartToPDF(cart: SellerCart) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  const total = cart.items.reduce((s, i) => s + i.product_price * i.quantity, 0);
  const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0);

  doc.setFontSize(18);
  doc.text(`Carrinho — ${cart.company_name}`, 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(cart.company_location || "", 14, 28);
  doc.text(`${cart.items.length} SKUs • ${totalQty} unidades • ${formatCurrency(total)}`, 14, 34);
  if (cart.notes) {
    doc.text(`Notas: ${cart.notes}`, 14, 40);
  }

  autoTable(doc, {
    startY: cart.notes ? 46 : 40,
    head: [["SKU", "Produto", "Cor", "Qtd", "Unit.", "Subtotal", "Obs."]],
    body: cart.items.map(i => [
      i.product_sku || "-",
      i.product_name,
      i.color_name || "-",
      i.quantity.toString(),
      formatCurrency(i.product_price),
      formatCurrency(i.product_price * i.quantity),
      i.notes || "",
    ]),
    foot: [["", "", "", totalQty.toString(), "", formatCurrency(total), ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
  });

  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text("Gerado pelo CRM", 14, doc.internal.pageSize.getHeight() - 10);
  doc.save(`carrinho-${cart.company_name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  toast.success("PDF exportado com sucesso");
}

export function shareCartLink(cartId: string) {
  const url = `${window.location.origin}/carrinhos/${cartId}`;
  navigator.clipboard.writeText(url).then(() => {
    toast.success("Link copiado!", { description: url });
  });
}

// ============================================
// SMART SUGGESTIONS
// ============================================

interface ProductLike {
  id: string;
  name: string;
  category_name?: string;
  category?: { name?: string };
  is_active?: boolean;
}

export function SmartSuggestions({ cart, allProducts }: { cart: SellerCart; allProducts: ProductLike[] }) {
  const suggestions = useMemo(() => {
    const tips: { icon: typeof Lightbulb; text: string }[] = [];
    const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = cart.items.reduce((s, i) => s + i.product_price * i.quantity, 0);

    if (cart.items.length === 1) {
      tips.push({ icon: Lightbulb, text: "Carrinhos com 3+ SKUs distintos convertem 40% mais" });
    }
    if (totalQty < 50) {
      tips.push({ icon: TrendingUp, text: "Pedidos acima de 50 unidades costumam ter melhor margem" });
    }
    if (subtotal > 5000 && !cart.notes) {
      tips.push({ icon: MessageSquare, text: "Negociações acima de R$5k com notas detalhadas fecham mais rápido" });
    }
    if (cart.items.some(i => !i.notes) && cart.items.length > 2) {
      tips.push({ icon: FileText, text: "Adicione observações em cada item para acelerar a produção" });
    }

    if (allProducts.length > 0 && cart.items.length > 0) {
      const cartCategoryNames = new Set(
        cart.items
          .map(i => {
            const prod = allProducts.find(p => p.id === i.product_id);
            return prod?.category_name || prod?.category?.name;
          })
          .filter(Boolean)
      );
      const cartProductIds = new Set(cart.items.map(i => i.product_id));
      const similar = allProducts.find(p => {
        const pCatName = p.category_name || p.category?.name;
        return !cartProductIds.has(p.id) &&
          pCatName &&
          cartCategoryNames.has(pCatName) &&
          p.is_active !== false;
      });
      if (similar) {
        tips.push({
          icon: Sparkles,
          text: `Clientes similares também compraram: ${similar.name}`,
        });
      }
    }

    return tips.slice(0, 3);
  }, [cart, allProducts]);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {suggestions.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground/80 bg-muted/20 rounded-lg px-2.5 py-2 border border-border/20">
            <Icon className="h-3 w-3 mt-0.5 text-warning flex-shrink-0" />
            <span>{s.text}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// ACTION HISTORY PANEL
// ============================================

export function ActionHistoryPanel({ cartId }: { cartId: string }) {
  const history = getActionHistory(cartId);
  if (history.length === 0) return null;

  const icons: Record<string, typeof Plus> = {
    add: Plus,
    remove: Trash2,
    qty: Package,
    move: MoveRight,
    duplicate: Copy,
  };

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full" aria-label="Recolher">
          <History className="h-3.5 w-3.5" />
          Histórico de ações ({history.length})
          <ChevronDown className="h-3 w-3 ml-auto" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {history.slice(0, 10).map((action, i) => {
            const Icon = icons[action.type] || Package;
            return (
              <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground py-1">
                <Icon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate flex-1">
                  {action.type === "add" && `Adicionou ${action.itemName}`}
                  {action.type === "remove" && `Removeu ${action.itemName}`}
                  {action.type === "qty" && `Alterou qtd de ${action.itemName}${action.detail ? ` → ${action.detail}` : ""}`}
                  {action.type === "move" && `Moveu ${action.itemName}${action.detail ? ` → ${action.detail}` : ""}`}
                  {action.type === "duplicate" && `Duplicou ${action.itemName}${action.detail ? ` → ${action.detail}` : ""}`}
                </span>
                <span className="text-[9px] tabular-nums flex-shrink-0">
                  {formatDistanceToNow(action.time, { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================
// SAVE AS TEMPLATE DIALOG
// ============================================

export function SaveTemplateDialog({ cart, onSave }: { cart: SellerCart; onSave: (name: string, desc: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 w-full">
          <Save className="h-3.5 w-3.5" />
          Salvar como Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar Template de Carrinho</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder='Ex: "Kit Onboarding"'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            placeholder="Descrição opcional..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-muted-foreground">{cart.items.length} itens serão salvos no template</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onSave(name.trim(), desc.trim());
              setOpen(false);
              setName("");
              setDesc("");
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// LOAD TEMPLATE DIALOG
// ============================================

export function LoadTemplateDialog({
  templates,
  onLoad,
  onDelete,
}: {
  templates: { id: string; name: string; description: string | null; items: CartTemplateItem[]; created_at: string }[];
  onLoad: (items: CartTemplateItem[]) => void;
  onDelete: (id: string) => void;
}) {
  if (templates.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 w-full">
          <BookTemplate className="h-3.5 w-3.5" />
          Usar Template ({templates.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[70vh]">
        <DialogHeader>
          <DialogTitle>Templates Salvos</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-2">
            {templates.map(t => (
              <Card key={t.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{t.items.length} itens</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onLoad(t.items)}>
                      Aplicar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => onDelete(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// MOBILE SUMMARY BOTTOM SHEET
// ============================================

export function MobileSummarySheet({
  cart,
  subtotal,
  totalQty,
  onGenerateQuote,
}: {
  cart: SellerCart;
  subtotal: number;
  totalQty: number;
  onGenerateQuote: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (cart.items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <motion.div
        className="bg-card border-t border-border shadow-2xl rounded-t-2xl"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{cart.items.length} SKUs • {totalQty} un.</span>
            <span className="text-sm font-bold text-primary tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          <ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden px-5 pb-3"
            >
              <div className="space-y-2 text-xs mb-3">
                {cart.items.slice(0, 5).map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span className="truncate flex-1 mr-2">{item.product_name}</span>
                    <span className="tabular-nums text-muted-foreground">{item.quantity}x</span>
                  </div>
                ))}
                {cart.items.length > 5 && (
                  <p className="text-muted-foreground">+{cart.items.length - 5} itens</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-5 pb-1">
          <Button
            className="w-full gap-2 h-11 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            onClick={onGenerateQuote}
          >
            <ArrowRight className="h-4 w-4" />
            Gerar Orçamento
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
