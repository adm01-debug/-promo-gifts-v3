import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ConnectionType = "supabase" | "bitrix24" | "n8n" | "mcp" | "webhook_outbound";
export type ErrorKind =
  | "timeout"
  | "network"
  | "dns"
  | "http"
  | "auth"
  | "config"
  | "unknown";

export interface TestResult {
  ok: boolean;
  status?: number;
  latency_ms?: number;
  error?: string;
  error_kind?: ErrorKind;
  message?: string;
  tested_at?: string;
}

const TOAST_TITLE_BY_KIND: Record<ErrorKind, string> = {
  timeout: "Tempo esgotado",
  network: "Sem conexão com o serviço",
  dns: "URL não encontrada",
  auth: "Credenciais rejeitadas",
  http: "Serviço retornou erro",
  config: "Configuração incompleta",
  unknown: "Falha na conexão",
};

interface TestOptions {
  env_key?: "promobrind" | "crm";
  config?: Record<string, string>;
  connectionId?: string;
}

export function useConnectionTester() {
  const [isTesting, setIsTesting] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  const test = useCallback(async (
    type: ConnectionType,
    optionsOrConfig: TestOptions | Record<string, string> = {},
    legacyConnectionId?: string,
  ): Promise<TestResult> => {
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
        body: { action: "test", type, config, connection_id, env_key },
      });
      if (error) throw error;
      const r = (data?.result ?? {}) as TestResult;
      const normalized: TestResult = {
        ok: !!r.ok,
        status: r.status,
        latency_ms: r.latency_ms,
        error: r.error,
        error_kind: r.error_kind,
        message: r.message,
        tested_at: r.tested_at ?? new Date().toISOString(),
      };
      setLastResult(normalized);
      if (normalized.ok) {
        toast.success("Conexão OK", {
          description: normalized.message ?? `${normalized.status ?? "200"} em ${normalized.latency_ms ?? "?"}ms`,
        });
      } else {
        const title = normalized.error_kind
          ? TOAST_TITLE_BY_KIND[normalized.error_kind]
          : "Falha na conexão";
        toast.error(title, {
          description: normalized.error ?? `HTTP ${normalized.status ?? "?"}`,
        });
      }
      return normalized;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      const failed: TestResult = { ok: false, error: msg, error_kind: "unknown", tested_at: new Date().toISOString() };
      setLastResult(failed);
      toast.error("Erro ao testar conexão", { description: msg });
      return failed;
    } finally {
      setIsTesting(false);
    }
  }, []);

  const fetchLastTest = useCallback(async (
    type: ConnectionType,
    opts: { env_key?: "promobrind" | "crm"; connectionId?: string } = {},
  ): Promise<{
    tested_at: string | null;
    ok: boolean | null;
    message: string | null;
    latency_ms: number | null;
  } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("connection-tester", {
        body: {
          action: "last_test",
          type,
          env_key: opts.env_key,
          connection_id: opts.connectionId,
        },
      });
      if (error) return null;
      const last = data?.last;
      if (!last) return null;
      return {
        tested_at: last.last_test_at ?? null,
        ok: last.last_test_ok ?? null,
        message: last.last_test_message ?? null,
        latency_ms: last.last_latency_ms ?? null,
      };
    } catch {
      return null;
    }
  }, []);

  return { test, isTesting, lastResult, fetchLastTest };
}
