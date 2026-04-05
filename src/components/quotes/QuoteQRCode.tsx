// src/components/quotes/QuoteQRCode.tsx

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuoteQRCodeProps {
  /** Link de aprovação do orçamento */
  approvalLink: string;
  /** Número do orçamento (para nome do arquivo) */
  quoteNumber?: string;
  /** Tamanho do QR Code em pixels */
  size?: number;
  /** Mostrar botões de ação */
  showActions?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

/**
 * Componente de QR Code para aprovação de orçamento
 * 
 * Usa API pública do QR Server para gerar QR Code sem dependências
 * 
 * @example
 * ```tsx
 * <QuoteQRCode
 *   approvalLink={`${window.location.origin}/approve/${quote.approval_token}`}
 *   quoteNumber={quote.quote_number}
 * />
 * ```
 */
export function QuoteQRCode({
  approvalLink,
  quoteNumber = 'orcamento',
  size = 200,
  showActions = true,
  className = ""
}: QuoteQRCodeProps) {
  const { toast } = useToast();

  // Gera URL do QR Code usando API pública
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(approvalLink)}`;

  // Baixar QR Code
  const handleDownload = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode-${quoteNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ QR Code baixado!",
        description: `Arquivo qrcode-${quoteNumber}.png salvo com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao baixar QR Code:', error);
      toast({
        title: "❌ Erro ao baixar",
        description: "Não foi possível baixar o QR Code. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Compartilhar link
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Orçamento ${quoteNumber}`,
          text: `Aprove o orçamento ${quoteNumber}`,
          url: approvalLink
        });
      } else {
        // Fallback: copiar para clipboard
        await navigator.clipboard.writeText(approvalLink);
        toast({
          title: "✅ Link copiado!",
          description: "O link de aprovação foi copiado para a área de transferência."
        });
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      // Silenciosamente ignorar se usuário cancelar o share
    }
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-lg">
            <img
              src={qrCodeUrl}
              alt={`QR Code para aprovação do orçamento ${quoteNumber}`}
              width={size}
              height={size}
              className="rounded" loading="lazy" />
          </div>
        </div>

        {/* Texto explicativo */}
        <div className="text-center text-sm text-muted-foreground">
          <p className="font-medium">Escaneie para aprovar</p>
          <p className="text-xs mt-1">
            O cliente pode aprovar o orçamento escaneando este QR Code
          </p>
        </div>

        {/* Ações */}
        {showActions && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex-1"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>
          </div>
        )}

        {/* Link para copiar manualmente */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Link de aprovação:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={approvalLink}
              readOnly
              className="flex-1 px-2 py-1 text-xs border rounded bg-muted font-mono"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(approvalLink);
                toast({
                  title: "✅ Link copiado!",
                  description: "Link copiado para a área de transferência."
                });
              }}
            >
              Copiar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Versão simplificada do QR Code (só a imagem)
 * Útil para incluir em PDFs ou emails
 */
export function QuoteQRCodeSimple({
  approvalLink,
  size = 150
}: {
  approvalLink: string;
  size?: number;
}) {
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(approvalLink)}`;

  return (
    <div className="inline-block p-2 bg-white rounded">
      <img
        src={qrCodeUrl}
        alt="QR Code para aprovação"
        width={size}
        height={size} loading="lazy" />
    </div>
  );
}
