/**
 * CartHealthChecklist - Painel de saúde do carrinho.
 * Substitui o "Score" abstrato por uma checklist acionável.
 */
import { useMemo } from "react";
import { type SellerCart } from "@/hooks/useSellerCarts";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CartHealthChecklistProps {
  cart: SellerCart;
  cartSubtotal: number;
  onFocusNotes?: () => void;
  onAddProducts?: () => void;
}

interface CheckItem {
  id: string;
  label: string;
  ok: boolean;
  onFix?: () => void;
}

export function CartHealthChecklist({ cart, cartSubtotal, onFocusNotes, onAddProducts }: CartHealthChecklistProps) {
  const checks = useMemo<CheckItem[]>(() => {
    const hasMinItems = cart.items.length >= 3;
    const hasNotes = !!cart.notes && cart.notes.trim().length > 10;
    const hasMinValue = cartSubtotal >= 500;
    
    // Improved variant detection: if SKU is composite (contains '-'), it MUST have color_name or notes
    const hasVariants = cart.items.every(i => {
      const isComposite = i.product_sku?.includes("-");
      if (!isComposite) return true;
      return (i.color_name && i.color_name.length > 0) || (i.notes && i.notes.length > 5);
    });
    
    const isReady = cart.status === "pronto_orcamento";
    const hasItemNotes = cart.items.length > 0 && cart.items.every(i => !!i.notes && i.notes.trim().length > 5);

    return [
      { id: "company", label: "Empresa vinculada", ok: !!cart.company_id },
      { id: "items", label: "Mix de produtos (≥ 3 SKUs)", ok: hasMinItems, onFix: onAddProducts },
      { id: "value", label: "Valor mínimo (R$ 500,00)", ok: hasMinValue, onFix: onAddProducts },
      { id: "notes", label: "Observações do pedido", ok: hasNotes, onFocusNotes },
      { id: "item_notes", label: "Instruções detalhadas por item", ok: hasItemNotes },
      { id: "variants", label: "Variantes e Cores", ok: hasVariants },
      { id: "ready", label: "Status: Pronto p/ Orçamento", ok: isReady },
    ];
  }, [cart, cartSubtotal, onFocusNotes, onAddProducts]);

  const okCount = checks.filter(c => c.ok).length;
  const total = checks.length;
  const pct = Math.round((okCount / total) * 100);

  return (
    <Card className="p-4 space-y-3 border-border/30 shadow-sm bg-card/50">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary fill-primary/20" /> Saúde do Carrinho
        </h4>
        <span className={cn(
          "text-xs font-bold tabular-nums",
          pct >= 80 ? "text-primary" : pct >= 50 ? "text-warning" : "text-muted-foreground"
        )}>
          {okCount}/{total}
        </span>
      </div>

      <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 80 ? "bg-primary" : pct >= 50 ? "bg-warning" : "bg-muted-foreground/40"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-1.5">
        {checks.map(c => (
          <li key={c.id}>
            <button
              type="button"
              onClick={c.ok ? undefined : c.onFix}
              disabled={c.ok || !c.onFix}
              className={cn(
                "w-full flex items-center gap-2 text-xs py-1 px-1.5 rounded-md text-left transition-colors",
                !c.ok && c.onFix && "hover:bg-muted/40 cursor-pointer",
                (c.ok || !c.onFix) && "cursor-default"
              )}
            >
              {c.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
              )}
              <span className={cn(c.ok ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground")}>
                {c.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
