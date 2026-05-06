import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Eye,
  Clock,
  XCircle,
  CheckCircle,
  RefreshCw,
  Ban,
} from "lucide-react";
import { useQuoteApproval, type ApprovalToken } from "@/hooks/useQuoteApproval";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface QuoteApprovalLinkCardProps {
  quoteId: string;
  clientName?: string;
  clientEmail?: string;
}

export function QuoteApprovalLinkCard({ quoteId, clientName, clientEmail }: QuoteApprovalLinkCardProps) {
  const { generateApprovalLink, getApprovalStatus, revokeToken, isLoading } = useQuoteApproval();
  const [approvalToken, setApprovalToken] = useState<ApprovalToken | null>(null);
  const [approvalLink, setApprovalLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    const check = async () => {
      setIsCheckingStatus(true);
      const token = await getApprovalStatus(quoteId);
      if (token) {
        setApprovalToken(token);
        setApprovalLink(`${window.location.origin}/proposta/${token.token}`);
      }
      setIsCheckingStatus(false);
    };
    check();
  }, [quoteId, getApprovalStatus]);

  const handleGenerate = async () => {
    const result = await generateApprovalLink(quoteId, clientName, clientEmail);
    if (result) {
      setApprovalToken(result.token as ApprovalToken);
      setApprovalLink(result.link);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(approvalLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleRevoke = async () => {
    if (!approvalToken) return;
    const success = await revokeToken(approvalToken.id);
    if (success) {
      setApprovalToken(null);
      setApprovalLink("");
    }
  };

  const handleRegenerate = async () => {
    if (approvalToken) {
      await revokeToken(approvalToken.id);
    }
    setApprovalToken(null);
    setApprovalLink("");
    const result = await generateApprovalLink(quoteId, clientName, clientEmail);
    if (result) {
      setApprovalToken(result.token as ApprovalToken);
      setApprovalLink(result.link);
    }
  };

  if (isCheckingStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!approvalToken) return null;

    if (approvalToken.response === "approved") {
      return (
        <Badge className="bg-success/10 text-success border-success/30 gap-1">
          <CheckCircle className="h-3 w-3" /> Aprovado
        </Badge>
      );
    }
    if (approvalToken.response === "rejected") {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
          <XCircle className="h-3 w-3" /> Rejeitado
        </Badge>
      );
    }
    if (approvalToken.status === "revoked") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Ban className="h-3 w-3" /> Revogado
        </Badge>
      );
    }
    if (approvalToken.viewed_at) {
      return (
        <Badge className="bg-info/10 text-info border-info/30 gap-1">
          <Eye className="h-3 w-3" /> Visualizado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" /> Aguardando
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Link de Aprovação
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {approvalToken && approvalToken.status !== "revoked" ? (
          <>
            {/* Link display */}
            <div className="flex gap-2">
              <Input
                readOnly
                value={approvalLink}
                className="text-xs font-mono bg-muted/30"
              />
              <Button size="icon" aria-label="Confirmar" variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                size="icon" aria-label="Abrir link"
                variant="outline"
                className="shrink-0"
                onClick={() => window.open(approvalLink, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {/* Status info */}
            <div className="text-xs text-muted-foreground space-y-1">
              {approvalToken.viewed_at && (
                <p className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Visualizado em {format(new Date(approvalToken.viewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
              {approvalToken.responded_at && (
                <p className="flex items-center gap-1">
                  {approvalToken.response === "approved" ? (
                    <CheckCircle className="h-3 w-3 text-success" />
                  ) : (
                    <XCircle className="h-3 w-3 text-destructive" />
                  )}
                  {approvalToken.response === "approved" ? "Aprovado" : "Rejeitado"} em{" "}
                  {format(new Date(approvalToken.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
              {approvalToken.response_notes && (
                <p className="italic mt-1">"{approvalToken.response_notes}"</p>
              )}
              {approvalToken.expires_at && !approvalToken.responded_at && (
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expira em {format(new Date(approvalToken.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>

            {/* Actions */}
            {!approvalToken.responded_at && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleRegenerate}>
                  <RefreshCw className="h-3 w-3" /> Regenerar
                </Button>
                <Button size="sm" variant="ghost" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={handleRevoke}>
                  <Ban className="h-3 w-3" /> Revogar
                </Button>
              </div>
            )}
          </>
        ) : (
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Gerar Link de Aprovação
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
