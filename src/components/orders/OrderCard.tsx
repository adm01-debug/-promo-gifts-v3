/**
 * OrderCard — card de listagem de pedido (uso em OrdersPage).
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ORDER_STATUS_LABELS, type OrderRow } from '@/hooks/useOrders';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  confirmed: 'bg-primary/20 text-primary border-primary/30',
  in_production: 'bg-primary/15 text-primary/80 border-primary/25',
  shipped: 'bg-primary/10 text-primary/70 border-primary/20',
  delivered: 'bg-primary/20 text-primary border-primary/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

interface OrderCardProps {
  order: OrderRow;
  onClick?: () => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  return (
    <Card
      data-testid="order-card"
      data-order-id={order.id}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">#{order.order_number}</p>
            <p className="truncate text-xs text-muted-foreground">
              {format(new Date(order.created_at), 'dd MMM yyyy', { locale: ptBR })}
              {order.client_name && ` · ${order.client_name}`}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          {order.tracking_number && (
            <span className="hidden text-xs text-muted-foreground md:block">
              Rastreio: {order.tracking_number}
            </span>
          )}
          <Badge variant="outline" className={statusColors[order.status] || ''}>
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </Badge>
          {order.total != null && (
            <span className="min-w-[80px] text-right text-sm font-medium text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                order.total,
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
