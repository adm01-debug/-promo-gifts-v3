/**
 * QuoteDetailPage — detalhe completo de um orçamento (itens, histórico, comentários, versões, follow-ups).
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuoteHistoryTimeline } from "@/components/quotes/QuoteHistoryTimeline";
import { QuoteCommentsThread } from "@/components/quotes/QuoteCommentsThread";
import { QuoteVersionsList } from "@/components/quotes/QuoteVersionsList";
import { FollowUpRemindersPanel } from "@/components/quotes/FollowUpRemindersPanel";
import { PageSEO } from "@/components/seo/PageSEO";
import { Badge } from "@/components/ui/badge";

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-96 m-6" />;
  if (!quote) return <p className="p-6 text-center text-muted-foreground">Orçamento não encontrado.</p>;

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">
      <PageSEO title={`Orçamento ${quote.quote_number}`} description="Detalhes do orçamento" />
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Orçamento {quote.quote_number}</h1>
          <p className="text-sm text-muted-foreground">
            {quote.client_name || quote.client_company || "Sem cliente"} · R$ {Number(quote.total ?? 0).toFixed(2)}
          </p>
        </div>
        <Badge>{quote.status}</Badge>
      </header>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="comments">Comentários</TabsTrigger>
          <TabsTrigger value="versions">Versões</TabsTrigger>
          <TabsTrigger value="reminders">Lembretes</TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="mt-4">
          <Card><CardHeader><CardTitle className="text-base">Linha do tempo</CardTitle></CardHeader><CardContent><QuoteHistoryTimeline quoteId={quote.id} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="comments" className="mt-4">
          <Card><CardContent className="pt-6"><QuoteCommentsThread quoteId={quote.id} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="versions" className="mt-4">
          <Card><CardHeader><CardTitle className="text-base">Versões</CardTitle></CardHeader><CardContent><QuoteVersionsList quoteId={quote.id} parentQuoteId={quote.parent_quote_id} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="reminders" className="mt-4">
          <FollowUpRemindersPanel quoteId={quote.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
