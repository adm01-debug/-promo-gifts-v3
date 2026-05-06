/**
 * QuoteCommentsThread — thread de comentários internos do orçamento.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

interface QuoteCommentsThreadProps {
  quoteId: string;
}

export function QuoteCommentsThread({ quoteId }: QuoteCommentsThreadProps) {
  const [content, setContent] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['quote-comments', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_comments')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const { error } = await supabase.from('quote_comments').insert({
        quote_id: quoteId,
        user_id: u.user.id,
        content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent('');
      qc.invalidateQueries({ queryKey: ['quote-comments', quoteId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 font-medium">
        <MessageSquare className="h-4 w-4 text-primary" /> Comentários
      </h3>

      {isLoading ? (
        <Skeleton className="h-20" />
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Sem comentários ainda.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((c) => (
            <li key={c.id} className="rounded-xl border bg-muted/30 p-3 text-sm">
              <p className="whitespace-pre-wrap">{c.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleString('pt-BR')}
                {c.is_edited && ' · editado'}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Escreva um comentário interno..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <Button
          size="sm"
          onClick={() => create.mutate()}
          disabled={!content.trim() || create.isPending}
          className="self-end"
        >
          <Send className="mr-1 h-4 w-4" /> Enviar
        </Button>
      </div>
    </div>
  );
}
