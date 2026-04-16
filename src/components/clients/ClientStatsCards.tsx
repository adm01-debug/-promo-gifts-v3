/**
 * ClientStatsCards — KPIs do cliente (LTV, pedidos, ticket médio, último pedido).
 */
import { Card, CardContent } from "@/components/ui/card";
import { Package, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientStatsCardsProps {
  ordersCount: number;
  totalLtv: number;
  avgTicket: number;
  lastOrderAt?: string | null;
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ClientStatsCards({ ordersCount, totalLtv, avgTicket, lastOrderAt }: ClientStatsCardsProps) {
  const items = [
    { icon: Package, label: "Pedidos", value: String(ordersCount) },
    { icon: DollarSign, label: "LTV", value: formatBRL(totalLtv) },
    { icon: TrendingUp, label: "Ticket médio", value: formatBRL(avgTicket) },
    {
      icon: Calendar,
      label: "Último pedido",
      value: lastOrderAt ? format(new Date(lastOrderAt), "dd MMM yyyy", { locale: ptBR }) : "—",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </div>
            <p className="text-lg font-semibold text-foreground truncate">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
