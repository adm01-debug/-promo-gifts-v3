import { MessageCircle, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuoteNextActionBannerProps {
  status: string;
  onSendWhatsApp?: () => void;
}

const actionMap: Record<string, { message: string; icon: React.ReactNode; actionLabel?: string }> = {
  draft: { message: "Este orçamento está em rascunho. Finalize e envie ao cliente.", icon: <Send className="h-4 w-4" /> },
  pending: { message: "Orçamento pendente. Envie ao cliente via WhatsApp para acelerar a aprovação.", icon: <MessageCircle className="h-4 w-4" />, actionLabel: "Enviar via WhatsApp" },
  sent: { message: "Aguardando resposta do cliente. Acompanhe o status de visualização.", icon: <ArrowRight className="h-4 w-4" /> },
};

export function QuoteNextActionBanner({ status, onSendWhatsApp }: QuoteNextActionBannerProps) {
  const config = actionMap[status];
  if (!config) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/15 print:hidden">
      <div className="flex items-center gap-2 text-sm text-foreground">
        <span className="text-primary">{config.icon}</span>
        <span>{config.message}</span>
      </div>
      {config.actionLabel && status === "pending" && onSendWhatsApp && (
        <Button size="sm" variant="outline" onClick={onSendWhatsApp} className="shrink-0 gap-2 text-primary border-primary/30 hover:bg-primary/10">
          <MessageCircle className="h-3.5 w-3.5" />
          {config.actionLabel}
        </Button>
      )}
    </div>
  );
}
