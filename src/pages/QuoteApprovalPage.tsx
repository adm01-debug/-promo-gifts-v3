/**
 * QuoteApprovalPage — página pública para o cliente visualizar e aprovar/recusar orçamento via token.
 */
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuoteApprovalToken } from '@/hooks/useQuoteApprovalToken';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { QuoteApprovalCard } from '@/components/quotes/QuoteApprovalCard';
import { QuoteSignaturePad } from '@/components/quotes/QuoteSignaturePad';
import { PageSEO } from '@/components/seo/PageSEO';
import { toast } from 'sonner';

export default function QuoteApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const { data: tokenData, isLoading: loadingToken } = useQuoteApprovalToken(token);
  const [pendingResponse, setPendingResponse] = useState<'approved' | 'rejected' | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: quote, isLoading: loadingQuote } = useQuery({
    queryKey: ['public-quote', tokenData?.quote_id],
    enabled: !!tokenData?.quote_id,
    queryFn: async () => {
      const { data, error } = await supabase
        // rls-allow: rota pública por approval_token; RLS permite
        .from('quotes')
        .select('quote_number, client_name, total, valid_until, status')
        .eq('id', tokenData!.quote_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (loadingToken || loadingQuote) return <Skeleton className="mx-auto mt-12 h-72 max-w-2xl" />;

  if (!tokenData || !quote) {
    return (
      <div className="container mx-auto p-12 text-center">
        <PageSEO title="Link inválido" description="Token de aprovação inválido ou expirado" />
        <p className="text-muted-foreground">Link inválido ou expirado.</p>
      </div>
    );
  }

  const isResponded = !!tokenData.responded_at || submitted;

  const handleSign = async (sigData: {
    name: string;
    document: string;
    signatureDataUrl: string;
  }) => {
    if (!pendingResponse) return;
    try {
      const { error } = await supabase.rpc('submit_quote_response', {
        _token: token!,
        _response: pendingResponse,
        _response_notes: `Assinado por ${sigData.name} (${sigData.document})`,
      });
      if (error) throw error;
      // Persist signature meta in token row (best-effort)
      await supabase
        .from('quote_approval_tokens')
        .update({
          signer_name: sigData.name,
          signer_document: sigData.document,
          signed_at: new Date().toISOString(),
        })
        .eq('token', token!);

      setSubmitted(true);
      toast.success('Resposta registrada com sucesso');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao registrar');
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <PageSEO
        title={`Aprovar orçamento ${quote.quote_number}`}
        description="Aprove ou recuse o orçamento enviado a você."
      />
      <QuoteApprovalCard
        quoteNumber={quote.quote_number}
        clientName={quote.client_name}
        total={Number(quote.total ?? 0)}
        validUntil={quote.valid_until}
        status={isResponded ? 'responded' : quote.status}
        isResponded={isResponded}
        onApprove={() => setPendingResponse('approved')}
        onReject={() => setPendingResponse('rejected')}
      />

      {pendingResponse && !isResponded && <QuoteSignaturePad onSign={handleSign} />}
    </div>
  );
}
