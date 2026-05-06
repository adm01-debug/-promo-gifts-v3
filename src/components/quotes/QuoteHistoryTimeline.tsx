/**
 * QuoteHistoryTimeline — timeline de eventos do orçamento (mudanças de status, edições, comentários).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, History } from 'lucide-react';

interface QuoteHistoryTimelineProps {
  quoteId: string;
}

export function QuoteHistoryTimeline({ quoteId }: QuoteHistoryTimelineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['quote-history', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_history')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="h-4 w-4" /> Nenhum evento registrado.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {data.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-primary" />
          <div className="text-sm">
            <p className="font-medium">{event.action}</p>
            {event.description && <p className="text-muted-foreground">{event.description}</p>}
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(event.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
