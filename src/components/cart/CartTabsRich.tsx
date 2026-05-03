/**
 * CartTabsRich - Tabs de carrinhos com status dot colorido, contador inteligente,
 * indicador de follow-up e botão "+" para criar novo.
 */
import { type SellerCart } from "@/hooks/useSellerCarts";
import { Building2, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { getStatusCfg } from "@/components/cart/CartUtilComponents";

interface CartTabsRichProps {
  carts: SellerCart[];
  activeCartId: string | null;
  canCreateCart: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function CartTabsRich({ carts, activeCartId, canCreateCart, onSelect, onNew }: CartTabsRichProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {carts.map(cart => {
        const isActive = cart.id === activeCartId;
        const statusCfg = getStatusCfg(cart.status);
        const ageDays = differenceInDays(new Date(), new Date(cart.created_at));
        const needsFollowUp = ageDays >= 3 && cart.items.length > 0;
        const hasItems = cart.items.length > 0;
        return (
          <button
            key={cart.id}
            onClick={() => onSelect(cart.id)}
            data-testid="cart-tab"
            data-cart-id={cart.id}
            data-active={isActive ? "true" : "false"}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "group relative flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-300",
              isActive
                ? "border-primary/40 bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                : "border-border/40 hover:border-border/60 hover:bg-muted/30 hover:scale-[1.01]"
            )}
          >
            <div className={cn(
              "absolute inset-x-0 -bottom-[1px] h-0.5 bg-primary transition-transform duration-300 rounded-full",
              isActive ? "scale-x-100" : "scale-x-0"
            )} />
            {cart.company_logo_url ? (
              <img src={cart.company_logo_url} alt="" className="w-7 h-7 rounded-lg object-contain bg-background border border-border/50 p-0.5" loading="lazy" />
            ) : (
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isActive ? "bg-primary/15" : "bg-muted")}>
                <Building2 className="h-3.5 w-3.5" />
              </div>
            )}
            <div className="flex flex-col items-start gap-0.5 leading-none">
              <span className="text-sm font-semibold max-w-[160px] truncate tracking-tight">{cart.company_name}</span>
              <div className="flex items-center gap-1.5 opacity-80">
                <span className={cn("w-1.5 h-1.5 rounded-full ring-1 ring-background", statusCfg.color.split(" ")[0])} aria-hidden />
                <span className="text-[10px] text-muted-foreground font-medium">{statusCfg.label}</span>
              </div>
            </div>
            <span
              data-testid="cart-tab-count"
              data-count={cart.items.length}
              className={cn(
                "ml-1 inline-flex items-center justify-center min-w-[22px] h-5.5 px-2 rounded-full text-[10px] font-bold tabular-nums transition-all duration-300",
                hasItems
                  ? (isActive ? "bg-primary text-primary-foreground scale-110 shadow-sm" : "bg-primary/15 text-primary")
                  : "bg-muted text-muted-foreground opacity-60"
              )}>
              {cart.items.length}
            </span>
            {needsFollowUp && (
              <span
                data-testid="cart-tab-followup"
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-warning text-warning-foreground flex items-center justify-center"
                title={`Sem movimento há ${ageDays} dias`}
              >
                <Clock className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        );
      })}

      {canCreateCart && (
        <button
          data-testid="cart-tab-new"
          onClick={onNew}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border/60",
            "hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors",
            "text-sm font-medium text-muted-foreground flex-shrink-0"
          )}
          aria-label="Criar novo carrinho"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      )}
    </div>
  );
}
