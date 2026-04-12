/**
 * Status screens for PublicQuoteApprovalPage — loading, expired, already responded, error, submitted.
 */
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle, XCircle, Loader2, AlertTriangle, FileText, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSEO } from "@/components/seo/PageSEO";

export function LoadingScreen() {
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

export function ExpiredScreen() {
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

export function AlreadyRespondedScreen({ data }: { data: any }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          {data.response === "approved" ? (
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
          )}
          <h2 className="font-display text-xl font-bold">
            Proposta {data.response === "approved" ? "aprovada" : "recusada"}
          </h2>
          <p className="text-muted-foreground">
            Esta proposta foi {data.response === "approved" ? "aprovada" : "recusada"} em{" "}
            {format(new Date(data.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
          </p>
          {data.response_notes && (
            <p className="text-sm text-muted-foreground italic">"{data.response_notes}"</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorScreen({ error }: { error: string | null }) {
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

export function SubmittedScreen({ response }: { response: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          {response === "approved" ? (
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
