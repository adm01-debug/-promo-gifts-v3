import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ConnectionType = "supabase" | "bitrix24" | "n8n" | "mcp" | "webhook_outbound";

interface TestOptions {
  env_key?: "promobrind" | "crm";
  config?: Record<string, string>;
  connectionId?: string;
}

export function useConnectionTester() {
  const [isTesting, setIsTesting] = useState(false);

  const test = useCallback(async (
    type: ConnectionType,
    optionsOrConfig: TestOptions | Record<string, string> = {},
    legacyConnectionId?: string,
  ) => {
    // Backwards-compat: old callers passed (type, configObj, connectionId)
    let config: Record<string, string> | undefined;
    let connection_id: string | undefined;
    let env_key: "promobrind" | "crm" | undefined;
    if ("config" in optionsOrConfig || "env_key" in optionsOrConfig || "connectionId" in optionsOrConfig) {
      const opts = optionsOrConfig as TestOptions;
      config = opts.config;
      connection_id = opts.connectionId ?? legacyConnectionId;
      env_key = opts.env_key;
    } else {
      config = optionsOrConfig as Record<string, string>;
      connection_id = legacyConnectionId;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("connection-tester", {
        body: { type, config, connection_id, env_key },
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
