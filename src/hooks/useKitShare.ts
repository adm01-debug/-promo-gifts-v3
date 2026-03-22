import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useKitShare() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const generateShareLink = useCallback(async (
    kitId: string,
    clientName?: string,
    clientEmail?: string,
  ): Promise<string | null> => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return null;
    }

    setIsLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data, error } = await supabase
        .from("kit_share_tokens")
        .insert({
          kit_id: kitId,
          seller_id: user.id,
          client_name: clientName || null,
          client_email: clientEmail || null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/kit/${(data as any).token}`;
      toast.success("Link de apresentação gerado!");
      return link;
    } catch (err) {
      console.error("Error generating share link:", err);
      toast.error("Erro ao gerar link de apresentação");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const revokeShareLink = useCallback(async (tokenId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("kit_share_tokens")
        .update({ status: "revoked" })
        .eq("id", tokenId);

      if (error) throw error;
      toast.success("Link revogado");
      return true;
    } catch (err) {
      console.error("Error revoking token:", err);
      toast.error("Erro ao revogar link");
      return false;
    }
  }, []);

  return { generateShareLink, revokeShareLink, isLoading };
}
