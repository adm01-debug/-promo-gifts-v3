/**
 * Status screens for PublicQuoteApprovalPage — loading, expired, already responded, error, submitted.
 */
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageSEO } from '@/components/seo/PageSEO';
import type { SignatureReceipt } from './usePublicQuoteApproval';

function formatDocMask(digits?: string): string {
  if (!digits) return '';
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d;
}

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <PageSEO
        title="Aprovação de Orçamento"
        description="Revise e aprove seu orçamento de brindes promocionais."
        noIndex
      />
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando proposta...</p>
      </div>
    </div>
  );
}

export function ExpiredScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="space-y-4 pb-8 pt-8">
          <AlertTriangle className="mx-auto h-16 w-16 text-warning" />
          <h2 className="font-display text-xl font-bold">Link expirado</h2>
          <p className="text-muted-foreground">
            Este link de aprovação expirou. Entre em contato com o vendedor para receber um novo
            link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AlreadyRespondedScreen({ data }: { data: any }) {
  const isApproved = data.response === 'approved';
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="space-y-4 pb-8 pt-8">
          {isApproved ? (
            <CheckCircle className="mx-auto h-16 w-16 text-success" />
          ) : (
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
          )}
          <h2 className="font-display text-xl font-bold">
            Proposta {isApproved ? 'aprovada' : 'recusada'}
          </h2>
          <p className="text-muted-foreground">
            Esta proposta foi {isApproved ? 'aprovada' : 'recusada'} em{' '}
            {format(new Date(data.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
          </p>
          {data.response_notes && (
            <p className="text-sm italic text-muted-foreground">"{data.response_notes}"</p>
          )}
          {isApproved && data.signer_name && (
            <div className="space-y-1 rounded-md border bg-muted/50 p-3 text-left text-xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Assinatura eletrônica
              </div>
              <p>
                <span className="text-muted-foreground">Assinado por:</span> {data.signer_name}
              </p>
              {data.signer_document && (
                <p>
                  <span className="text-muted-foreground">Documento:</span>{' '}
                  {formatDocMask(data.signer_document)}
                </p>
              )}
              {data.signature_hash && (
                <p className="break-all">
                  <span className="text-muted-foreground">Hash:</span>{' '}
                  <code className="text-[10px]">{data.signature_hash.slice(0, 32)}…</code>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorScreen({ error }: { error: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="space-y-4 pb-8 pt-8">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="font-display text-xl font-bold">Proposta não encontrada</h2>
          <p className="text-muted-foreground">{error || 'Verifique o link e tente novamente.'}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function SubmittedScreen({
  response,
  receipt,
}: {
  response: string;
  receipt?: SignatureReceipt | null;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="space-y-4 pb-8 pt-8">
          {response === 'approved' ? (
            <>
              <div className="relative mx-auto h-20 w-20">
                <CheckCircle className="h-20 w-20 text-success" />
                <Sparkles className="absolute -right-1 -top-1 h-6 w-6 text-warning" />
              </div>
              <h2 className="font-display text-2xl font-bold text-success">Proposta aprovada!</h2>
              <p className="text-muted-foreground">
                Obrigado! O vendedor foi notificado e entrará em contato em breve.
              </p>
              {receipt && (
                <div className="space-y-1.5 rounded-md border border-success/30 bg-success/5 p-3 text-left text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" /> Comprovante de assinatura
                    eletrônica
                  </div>
                  <p>
                    <span className="text-muted-foreground">Assinado por:</span>{' '}
                    <strong>{receipt.signer_name}</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Documento:</span>{' '}
                    {formatDocMask(receipt.signer_document)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Data/hora:</span>{' '}
                    {format(new Date(receipt.signed_at), "dd/MM/yyyy 'às' HH:mm:ss", {
                      locale: ptBR,
                    })}
                  </p>
                  <p>
                    <span className="text-muted-foreground">IP:</span>{' '}
                    <code className="text-[10px]">{receipt.signer_ip}</code>
                  </p>
                  <p className="break-all">
                    <span className="text-muted-foreground">Hash de integridade:</span>
                    <br />
                    <code className="text-[10px]">{receipt.signature_hash}</code>
                  </p>
                  <p className="mt-1.5 border-t pt-1 text-[10px] text-muted-foreground">
                    Este aceite foi registrado eletronicamente conforme o art. 10, §2º da MP
                    2.200-2/2001 e tem validade jurídica.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-20 w-20 text-destructive" />
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
