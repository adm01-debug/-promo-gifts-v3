/**
 * QuoteOrderBadge — badge clicável que indica que o orçamento foi convertido
 * em pedido. Navega para /pedidos/:id ao clicar.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface QuoteOrderBadgeProps {
  quoteId: string;
  /** Quando true, mostra apenas se houver pedido (silencia loading). */
  silent?: boolean;
}

interface LinkedOrder {
  id: string;
  order_number: string;
  created_at: string;
}

export function QuoteOrderBadge({ quoteId, silent = true }: QuoteOrderBadgeProps) {
  const navigate = useNavigate();
  const [order, setOrder] = useState<LinkedOrder | null>(null);

  useEffect(() => {
    if (!quoteId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        // rls-allow: lookup por id específico; RLS valida ownership
        .from('orders')
        .select('id, order_number, created_at')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setOrder(data as LinkedOrder);
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  if (!order) return silent ? null : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/pedidos/${order.id}`);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/pedidos/${order.id}`);
            }
          }}
          className="inline-flex"
        >
          <Badge
            variant="outline"
            className="cursor-pointer gap-1 border-success/40 bg-success/10 text-[10px] font-semibold text-success hover:bg-success/20"
          >
            <Package className="h-3 w-3" />
            {order.order_number}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Convertido em pedido — clique para abrir</p>
      </TooltipContent>
    </Tooltip>
  );
}
