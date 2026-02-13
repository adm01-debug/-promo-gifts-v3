import { useState } from "react";
import { insertCrm } from "@/lib/crm-db";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useQuoteApproval() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateApprovalLink = async (
    quoteId: string,
    expirationDays: number = 30
  ): Promise<string | null> => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return null;
    }

    setIsGenerating(true);
    try {
      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      await insertCrm("quote_approval_tokens", {
        quote_id: quoteId,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      });

      const baseUrl = window.location.origin;
      const approvalUrl = `${baseUrl}/aprovar-orcamento?token=${token}`;

      toast.success("Link de aprovação gerado!");
      return approvalUrl;
    } catch (err) {
      console.error("Error generating approval link:", err);
      toast.error("Erro ao gerar link de aprovação");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copiado para a área de transferência!");
    } catch (err) {
      toast.error("Erro ao copiar link");
    }
  };

  return {
    generateApprovalLink,
    copyToClipboard,
    isGenerating,
  };
}
