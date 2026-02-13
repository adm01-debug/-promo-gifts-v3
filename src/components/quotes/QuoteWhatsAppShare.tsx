import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QuoteWhatsAppShareProps {
  quoteNumber?: string;
  clientPhone?: string;
  total: number;
  validUntil?: string;
  approvalLink?: string | null;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function QuoteWhatsAppShare({ quoteNumber, clientPhone, total, validUntil, approvalLink }: QuoteWhatsAppShareProps) {
  const handleShare = () => {
    const lines = [
      `📋 *Proposta Comercial ${quoteNumber || ""}*`,
      "",
      `💰 Valor Total: *${formatCurrency(total)}*`,
    ];

    if (validUntil) {
      lines.push(`📅 Válida até: ${validUntil}`);
    }

    if (approvalLink) {
      lines.push("", `✅ Aprovar proposta: ${approvalLink}`);
    }

    lines.push("", "Qualquer dúvida, estou à disposição! 😊");

    const message = encodeURIComponent(lines.join("\n"));
    const phone = clientPhone?.replace(/\D/g, "") || "";
    const url = phone ? `https://wa.me/55${phone}?text=${message}` : `https://wa.me/?text=${message}`;

    window.open(url, "_blank");
    toast.success("WhatsApp aberto!");
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/10 dark:text-emerald-400 dark:border-emerald-400/30">
      <MessageCircle className="h-4 w-4" />
      WhatsApp
    </Button>
  );
}
