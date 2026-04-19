import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ConnectionType = "supabase" | "bitrix24" | "n8n" | "mcp" | "webhook_outbound";

export function useConnectionTester() {
  const [isTesting, setIsTesting] = useState(false);

  const test = useCallback(async (
    type: ConnectionType,
    config: Record<string, string> = {},
    connectionId?: string,
  ) => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("connection-tester", {
        body: { type, config, connection_id: connectionId },
      });
      if (error) throw error;
      const r = data?.result as { ok: boolean; status?: number; latency_ms?: number; error?: string; message?: string };
      if (r?.ok) {
        toast.success("Conexão OK", {
          description: r.message ?? `${r.status ?? "200"} em ${r.latency_ms ?? "?"}ms`,
        });
      } else {
        toast.error("Falha na conexão", { description: r?.error ?? `HTTP ${r?.status}` });
      }
      return r;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error("Erro ao testar conexão", { description: msg });
      return { ok: false, error: msg };
    } finally {
      setIsTesting(false);
    }
  }, []);

  return { test, isTesting };
}
