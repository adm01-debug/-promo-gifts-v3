import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SecretStatus {
  name: string;
  has_value: boolean;
  masked_suffix: string | null;
  length: number;
}

export function useSecretsManager() {
  const [secrets, setSecrets] = useState<SecretStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const list = useCallback(async (names?: string[]) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("secrets-manager", {
        body: { action: "list", names },
      });
      if (error) throw error;
      setSecrets((data?.secrets ?? []) as SecretStatus[]);
      return data?.secrets as SecretStatus[];
    } catch (err) {
      toast.error("Erro ao listar credenciais", {
        description: err instanceof Error ? err.message : "Erro",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSecret = useCallback(async (name: string, value: string) => {
    const { data, error } = await supabase.functions.invoke("secrets-manager", {
      body: { action: "set", name, value },
    });
    if (error) {
      toast.error("Falha ao salvar credencial", { description: error.message });
      return null;
    }
    toast.success("Credencial registrada", {
      description: data?.message ?? "Use o painel de Secrets do Lovable para persistir.",
    });
    return data;
  }, []);

  return { secrets, isLoading, list, setSecret };
}
