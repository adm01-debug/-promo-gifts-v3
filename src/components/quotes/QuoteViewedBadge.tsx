/**
 * QuoteViewedBadge — indicador "Visualizado pelo cliente" baseado em
 * quote_approval_tokens.viewed_at. Mostra a data no tooltip.
 */
import { Eye } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ViewedInfo } from '@/hooks/useQuoteViewedMap';

interface QuoteViewedBadgeProps {
  info?: ViewedInfo;
}

export function QuoteViewedBadge({ info }: QuoteViewedBadgeProps) {
  if (!info) return null;

  const date = new Date(info.viewedAt);
  const relative = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  const absolute = format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex h-5 items-center gap-1 rounded-full border border-success/30 bg-success/15 px-1.5 text-[10px] font-medium text-success"
          aria-label={`Visualizado pelo cliente ${relative}`}
        >
          <Eye className="h-2.5 w-2.5" />
          Visualizado
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-medium">Cliente abriu o link</p>
        <p className="text-muted-foreground">{absolute}</p>
        <p className="text-muted-foreground">({relative})</p>
      </TooltipContent>
    </Tooltip>
  );
}
