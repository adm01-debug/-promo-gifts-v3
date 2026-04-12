import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  Calendar,
  User,
  Phone,
  Mail,
  Loader2,
  AlertTriangle,
  FileText,
  Truck,
  CreditCard,
  Clock,
  Palette,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSEO } from "@/components/seo/PageSEO";
import { PublicQuoteItemsList, PublicQuoteTotals } from "./public-approval/PublicQuoteItems";

interface QuoteData {
  quote: any;
  seller: any;
  token: any;
}

export default function PublicQuoteApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [alreadyResponded, setAlreadyResponded] = useState<any>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchQuote = async () => {
      setIsLoading(true);
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "quote-public-view",
          { body: { action: "get_quote", token } }
        );

        // supabase.functions.invoke returns the parsed body even on non-2xx
        // but sets fnError for network failures
        if (fnError && !result) {
          throw new Error(fnError.message);
        }

        // Handle error responses from the edge function
        if (result?.error) {
          if (result.expired) {
            setIsExpired(true);
          } else {
            setError(result.error);
          }
          return;
        }

        if (result.already_responded) {
          setAlreadyResponded(result);
          return;
        }

        setData(result);
      } catch (err) {
        setError("Erro ao carregar proposta");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuote();
  }, [token]);

  const handleResponse = async (response: "approved" | "rejected") => {
    if (!token) return;
    setIsSubmitting(true);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
          "quote-public-view",
          {
            body: {
              action: "respond",
              token,
              response,
              response_notes: responseNotes.trim() || null,
            },
          }
        );

        if (fnError && !result) throw new Error(fnError.message);
        if (result?.error) throw new Error(result.error);

      setSubmitted(response);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
      <PageSEO title="Aprovação de Orçamento" description="Revise e aprove seu orçamento de brindes promocionais." noIndex />
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando proposta...</p>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertTriangle className="h-16 w-16 text-warning mx-auto" />
            <h2 className="font-display text-xl font-bold">Link expirado</h2>
            <p className="text-muted-foreground">
              Este link de aprovação expirou. Entre em contato com o vendedor para receber um novo link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyResponded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            {alreadyResponded.response === "approved" ? (
              <CheckCircle className="h-16 w-16 text-success mx-auto" />
            ) : (
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
            )}
            <h2 className="font-display text-xl font-bold">
              Proposta {alreadyResponded.response === "approved" ? "aprovada" : "recusada"}
            </h2>
            <p className="text-muted-foreground">
              Esta proposta foi {alreadyResponded.response === "approved" ? "aprovada" : "recusada"} em{" "}
              {format(new Date(alreadyResponded.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
            </p>
            {alreadyResponded.response_notes && (
              <p className="text-sm text-muted-foreground italic">
                "{alreadyResponded.response_notes}"
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="font-display text-xl font-bold">Proposta não encontrada</h2>
            <p className="text-muted-foreground">{error || "Verifique o link e tente novamente."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            {submitted === "approved" ? (
              <>
                <div className="relative mx-auto w-20 h-20">
                  <CheckCircle className="h-20 w-20 text-success" />
                  <Sparkles className="h-6 w-6 text-warning absolute -top-1 -right-1" />
                </div>
                <h2 className="font-display text-2xl font-bold text-success">Proposta aprovada!</h2>
                <p className="text-muted-foreground">
                  Obrigado! O vendedor foi notificado e entrará em contato em breve.
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-20 w-20 text-destructive mx-auto" />
                <h2 className="font-display text-2xl font-bold">Proposta recusada</h2>
                <p className="text-muted-foreground">
                  Sua resposta foi registrada. O vendedor foi notificado.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quote, seller } = data;
  const items = quote.items || [];

  // Calculate personalization totals per item
  const calcPersTotal = (item: any) => {
    const persCost = (item.personalizations || []).reduce(
      (sum: number, p: any) => sum + (p.total_cost || 0),
      0
    );
    return persCost;
  };

  const subtotal = items.reduce((sum: number, item: any) => {
    return sum + item.quantity * item.unit_price + calcPersTotal(item);
  }, 0);

  const discountAmount = quote.discount_percent
    ? subtotal * (quote.discount_percent / 100)
    : quote.discount_amount || 0;

  const shippingCost =
    quote.shipping_type === "fob" || quote.shipping_type === "fob_pre"
      ? quote.shipping_cost || 0
      : 0;

  const total = subtotal - discountAmount + shippingCost;

  const shippingLabels: Record<string, string> = {
    cif: "CIF (incluso)",
    fob: "FOB (a cobrar)",
    fob_pre: "FOB Pré-pago",
    retirada: "Retirada",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Proposta Comercial</h1>
              <p className="text-muted-foreground mt-1">
                #{quote.quote_number}
              </p>
            </div>
            {quote.valid_until && (
              <Badge variant="outline" className="gap-1.5">
                <Clock className="h-3 w-3" />
                Válido até {format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Seller Info */}
        {seller && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={seller.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(seller.full_name || "V").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{seller.full_name || "Vendedor"}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                    {seller.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {seller.email}
                      </span>
                    )}
                    {seller.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {seller.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Info */}
        {(quote.client_name || quote.client_company) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Destinatário
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {quote.client_name && <p className="font-medium">{quote.client_name}</p>}
              {quote.client_company && <p className="text-muted-foreground">{quote.client_company}</p>}
            </CardContent>
          </Card>
        )}

        <PublicQuoteItemsList items={items} />
        <PublicQuoteTotals
          subtotal={subtotal}
          discountAmount={discountAmount}
          discountPercent={quote.discount_percent}
          shippingCost={shippingCost}
          shippingType={quote.shipping_type}
          total={total}
        />

        {/* Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quote.payment_terms && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Condições de Pagamento
                </div>
                <p className="text-sm text-muted-foreground">{quote.payment_terms}</p>
              </CardContent>
            </Card>
          )}
          {quote.delivery_time && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  Prazo de Entrega
                </div>
                <p className="text-sm text-muted-foreground">
                  {quote.delivery_time.startsWith("date:")
                    ? `Entrega até ${format(new Date(quote.delivery_time.replace("date:", "")), "dd/MM/yyyy")}`
                    : quote.delivery_time}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {quote.notes && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-1">Observações</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Response Section */}
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Responder Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Observações ou comentários (opcional)..."
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              className="min-h-[80px] resize-none bg-background"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => handleResponse("approved")}
                disabled={isSubmitting}
                className="flex-1 h-12 text-base bg-success hover:bg-success/90 text-success-foreground"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                Aprovar Proposta
              </Button>
              <Button
                onClick={() => handleResponse("rejected")}
                disabled={isSubmitting}
                variant="destructive"
                className="flex-1 h-12 text-base"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                Recusar Proposta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-8 py-6 text-center text-xs text-muted-foreground">
        <p>Proposta gerada automaticamente • Promo Gifts</p>
      </div>
    </div>
  );
}
