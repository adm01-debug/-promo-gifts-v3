import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Building2,
  Mail,
  Package,
  Phone,
  Truck,
  User,
  CreditCard,
  Clock,
  MapPin,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { OrderFulfillmentManager } from '@/components/orders/OrderFulfillmentManager';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-warning/20 text-warning border-warning/30' },
  confirmed: { label: 'Confirmado', color: 'bg-primary/20 text-primary border-primary/30' },
  in_production: { label: 'Em Produção', color: 'bg-primary/15 text-primary/80 border-primary/25' },
  shipped: { label: 'Enviado', color: 'bg-primary/10 text-primary/70 border-primary/20' },
  delivered: { label: 'Entregue', color: 'bg-primary/20 text-primary border-primary/30' },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-destructive/20 text-destructive border-destructive/30',
  },
};

const fulfillmentConfig: Record<string, { label: string; color: string }> = {
  unfulfilled: { label: 'Não Processado', color: 'bg-warning/20 text-warning border-warning/30' },
  partial: { label: 'Parcial', color: 'bg-warning/15 text-warning/80 border-warning/25' },
  fulfilled: { label: 'Completo', color: 'bg-primary/20 text-primary border-primary/30' },
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface OrderItem {
  id: string;
  product_name: string | null;
  product_sku: string | null;
  product_image_url: string | null;
  quantity: number | null;
  unit_price: number | null;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    fetchOrder();
  }, [id, user]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const [orderRes, itemsRes] = await Promise.all([
        supabase
          .from('orders')
          .select(
            'id, order_number, created_at, status, fulfillment_status, subtotal, discount_amount, shipping_cost, total, client_name, client_company, client_email, client_phone, payment_terms, delivery_time, notes, internal_notes, tracking_number, quote_id',
          )
          .eq('id', id!)
          .maybeSingle(),
        supabase
          .from('order_items')
          .select('id, product_name, product_sku, product_image_url, quantity, unit_price')
          .eq('order_id', id!),
      ]);

      if (orderRes.error) throw orderRes.error;
      if (itemsRes.error) throw itemsRes.error;

      if (orderRes.data) {
        setOrder(orderRes.data);
        setTrackingNumber(orderRes.data.tracking_number || '');
      }
      if (itemsRes.data) {
        setItems(itemsRes.data);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Erro ao carregar detalhes do pedido');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setIsSaving(true);
    const { error } = await supabase
      // rls-allow: lookup por id; RLS valida ownership
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id!);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(`Status atualizado para ${statusConfig[newStatus]?.label || newStatus}`);
      setOrder((prev: any) => ({ ...prev, status: newStatus }));
    }
    setIsSaving(false);
  };

  const updateTracking = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Por favor, insira um código de rastreio válido');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ tracking_number: trackingNumber.trim(), updated_at: new Date().toISOString() })
        .eq('id', id!);

      if (error) throw error;

      toast.success('Código de rastreio atualizado');
      setOrder((prev: any) => ({ ...prev, tracking_number: trackingNumber.trim() }));
    } catch (error) {
      console.error('Error updating tracking:', error);
      toast.error('Erro ao salvar rastreio');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="mb-4 h-16 w-16 text-muted-foreground/40" />
          <h2 className="mb-2 font-display text-xl font-semibold">Pedido não encontrado</h2>
          <p className="mb-4 text-muted-foreground">
            O pedido solicitado não existe ou você não tem permissão.
          </p>
          <Button onClick={() => navigate('/pedidos')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos Pedidos
          </Button>
        </div>
      </>
    );
  }

  const sc = statusConfig[order.status] || { label: order.status, color: '' };
  const fc = fulfillmentConfig[order.fulfillment_status] || {
    label: order.fulfillment_status,
    color: '',
  };

  return (
    <>
      <PageSEO
        title={`Pedido #${order.order_number}`}
        description={`Detalhes do pedido ${order.order_number}`}
        path={`/pedidos/${id}`}
        noIndex
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Voltar"
                    onClick={() => navigate('/pedidos')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                  Voltar para lista de pedidos
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div>
              <h1 className="font-display text-2xl font-bold">Pedido #{order.order_number}</h1>
              <p className="text-sm text-muted-foreground">
                Criado em{' '}
                {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={sc.color}>
              {sc.label}
            </Badge>
            <Badge variant="outline" className={fc.color}>
              {fc.label}
            </Badge>
          </div>
        </div>

        <OrderStatusTimeline status={order.status} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-primary" />
                  Itens do Pedido ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 rounded-lg border border-border/50 bg-muted/20 p-3"
                      >
                        {item.product_image_url ? (
                          <img
                            src={item.product_image_url}
                            alt={item.product_name || ''}
                            className="h-14 w-14 rounded-md border object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.product_name}</p>
                          {item.product_sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {item.quantity}x {formatCurrency(item.unit_price || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <Separator className="my-4" />
                <div className="space-y-2">
                  {order.subtotal != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                  )}
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(order.discount_amount)}</span>
                    </div>
                  )}
                  {order.shipping_cost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frete:</span>
                      <span>{formatCurrency(order.shipping_cost)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(order.total || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logística */}
            <OrderFulfillmentManager order={order} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gerenciar Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Status do Pedido</Label>
                  <Select value={order.status} onValueChange={updateStatus} disabled={isSaving}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {order.quote_id && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => navigate(`/orcamentos/${order.quote_id}`)}
                        >
                          <FileText className="h-4 w-4" />
                          Ver Orçamento Original
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                        Acessar a proposta comercial que gerou este pedido
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.client_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{order.client_name}</span>
                  </div>
                )}
                {order.client_company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{order.client_company}</span>
                  </div>
                )}
                {order.client_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{order.client_email}</span>
                  </div>
                )}
                {order.client_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{order.client_phone}</span>
                  </div>
                )}
                {!order.client_name && !order.client_company && (
                  <p className="text-sm text-muted-foreground">Sem informações do cliente</p>
                )}
              </CardContent>
            </Card>

            {/* Commercial Conditions */}
            {(order.payment_terms || order.delivery_time) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Condições
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.payment_terms && (
                    <div className="flex items-start gap-2 text-sm">
                      <CreditCard className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Pagamento</p>
                        <p className="font-medium">{order.payment_terms}</p>
                      </div>
                    </div>
                  )}
                  {order.delivery_time && (
                    <div className="flex items-start gap-2 text-sm">
                      <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo</p>
                        <p className="font-medium">{order.delivery_time}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(order.notes || order.internal_notes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.notes && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Públicas</p>
                      <p className="whitespace-pre-line text-sm">{order.notes}</p>
                    </div>
                  )}
                  {order.internal_notes && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Internas</p>
                      <p className="whitespace-pre-line text-sm text-muted-foreground">
                        {order.internal_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
