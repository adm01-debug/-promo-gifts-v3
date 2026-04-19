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

  const rotateSecret = useCallback(async (name: string, value: string, notes?: string) => {
    const { data, error } = await supabase.functions.invoke("secrets-manager", {
      body: { action: "rotate", name, value, notes },
    });
    if (error) {
      toast.error("Falha ao rotacionar credencial", { description: error.message });
      return null;
    }
    toast.success("Rotação registrada", {
      description: data?.message ?? "Atualize o valor no painel de Secrets para finalizar.",
    });
    return data;
  }, []);

  const getRotationHistory = useCallback(async (name?: string) => {
    const { data, error } = await supabase.functions.invoke("secrets-manager", {
      body: { action: "rotation_history", name },
    });
    if (error) {
      toast.error("Falha ao carregar histórico", { description: error.message });
      return [];
    }
    return (data?.history ?? []) as Array<{
      id: string;
      secret_name: string;
      rotated_by: string;
      rotated_at: string;
      previous_suffix: string | null;
      new_suffix: string | null;
      notes: string | null;
    }>;
  }, []);

  return { secrets, isLoading, list, setSecret, rotateSecret, getRotationHistory };
}
