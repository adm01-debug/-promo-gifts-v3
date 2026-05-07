/**
 * CartTabsRich - Tabs de carrinhos com status dot colorido, contador inteligente,
 * indicador de follow-up e botão "+" para criar novo.
 */
import { type SellerCart } from "@/hooks/useSellerCarts";
import { Building2, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { getStatusCfg } from "@/components/cart/CartUtilComponents";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { AvatarLogo } from "@/components/shared/AvatarLogo";

interface CartTabsRichProps {
// ... keep existing code
            isActive ? "border-primary/40 bg-primary/10 text-primary shadow-lg ring-2 ring-primary/10 scale-[1.03] z-10"
            : "border-border/30 bg-card hover:border-border/60 hover:bg-muted/30 hover:translate-y-[-1px] shadow-sm"
            )}
          >
            <div className={cn(
              "absolute inset-x-4 -bottom-[1px] h-0.5 bg-primary transition-all duration-500 rounded-full",
              isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
            )} />
            <AvatarLogo 
              name={cart.company_name} 
              logoUrl={cart.company_logo_url} 
              size="md" 
              className="group-hover:scale-110 transition-transform" 
              fallbackClassName={cn(isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-muted/80")}
            />
            <div className="flex flex-col items-start gap-0.5 leading-none">
              <span className="text-sm font-bold max-w-[150px] truncate tracking-tight group-hover:text-primary transition-colors">{cart.company_name}</span>
              <div className="flex items-center gap-2 opacity-80">
                <span className={cn("w-2 h-2 rounded-full ring-2 ring-background shadow-sm", statusCfg.color.split(" ")[0])} aria-hidden />
                <span className="text-[10px] text-muted-foreground font-bold tracking-tight uppercase opacity-60">{statusCfg.label}</span>
              </div>
            </div>
            <span
              data-testid="cart-tab-count"
              data-count={cart.items.length}
              className={cn(
                "ml-1 inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[10px] font-black tabular-nums transition-all duration-500",
                hasItems
                  ? (isActive ? "bg-primary text-primary-foreground scale-110 shadow-lg" : "bg-primary/15 text-primary")
                  : "bg-muted text-muted-foreground opacity-50"
              )}>
              {cart.items.length}
            </span>
            {needsFollowUp && (
              <motion.span
                data-testid="cart-tab-followup"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-warning text-warning-foreground flex items-center justify-center shadow-md border-2 border-background z-20"
                title={`Sem movimento há ${ageDays} dias`}
              >
                <Clock className="h-3 w-3" />
              </motion.span>
            )}
          </button>
        );
      })}

      {canCreateCart && (
        <button
          data-testid="cart-tab-new"
          onClick={onNew}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-dashed border-border/40 transition-all flex-shrink-0 group/new",
            "hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95",
            "text-sm font-bold text-muted-foreground/60"
          )}
          aria-label="Criar novo carrinho"
        >
          <div className="w-6 h-6 rounded-lg bg-muted/40 flex items-center justify-center group-hover/new:bg-primary/20 transition-colors">
            <Plus className="h-4 w-4 group-hover/new:rotate-90 transition-transform duration-300" />
          </div>
          <span>Novo</span>
        </button>
      )}
    </div>
  );
}
