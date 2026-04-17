/**
 * ClientOverview360 — KPIs (LTV, ticket médio, última compra) + mini-timeline.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, Calendar, ShoppingBag, Sparkles } from "lucide-react";
import { useClientBI } from "@/hooks/bi/useClientBI";
import { cn } from "@/lib/utils";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

interface Props {
  clientId: string;
}

export function ClientOverview360({ clientId }: Props) {
  const bi = useClientBI(clientId);

  if (bi.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const recencyTone =
    bi.daysSinceLastOrder == null
      ? "secondary"
      : bi.daysSinceLastOrder < 30
        ? "default"
        : bi.daysSinceLastOrder < 90
          ? "secondary"
          : "destructive";

  const recencyLabel =
    bi.daysSinceLastOrder == null
      ? "Nunca comprou"
      : bi.daysSinceLastOrder === 0
        ? "Hoje"
        : `${bi.daysSinceLastOrder}d atrás`;

  return (
    <div className="space-y-3">
      {bi.isMock && (
        <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-300">
          <Sparkles className="h-3 w-3" /> Dados simulados · em breve dados reais
        </Badge>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-[1.5px] hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">LTV Total</span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="font-display text-3xl font-bold">{fmtBRL(bi.ltv)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {bi.ordersCount} pedido{bi.ordersCount !== 1 && "s"} no histórico
            </div>
          </CardContent>
        </Card>

        <Card className="border-[1.5px] hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket Médio</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="font-display text-3xl font-bold">{fmtBRL(bi.avgTicket)}</div>
            <div className="text-xs text-muted-foreground mt-1">por pedido fechado</div>
          </CardContent>
        </Card>

        <Card className="border-[1.5px] hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Última Compra</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="font-display text-2xl font-bold">
              {bi.lastOrderDate ? fmtDate(bi.lastOrderDate) : "—"}
            </div>
            <Badge variant={recencyTone as "default" | "secondary" | "destructive"} className="mt-2">
              {recencyLabel}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Timeline movida para EnrichedOrdersTimeline (componente próprio) */}
    </div>
  );
}
