import { Profiler, type ProfilerOnRenderCallback } from "react";
import { logger } from "@/lib/logger";

/**
 * Diagnostic Profiler Wrapper
 * 
 * Usage:
 * <DiagnosticProfiler id="MockupGenerator">
 *   <YourComponent />
 * </DiagnosticProfiler>
 */
export function DiagnosticProfiler({ id, children }: { id: string; children: React.ReactNode }) {
  const onRender: ProfilerOnRenderCallback = (
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions
  ) => {
    // Só loga commits significativos ou em modo debug para evitar spam no console
    if (actualDuration > 16 || import.meta.env.DEV) {
      logger.debug(`[Profiler:${id}] ${phase}`, {
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        commitTime: commitTime.toFixed(2),
        startTime: startTime.toFixed(2),
      });
    }
    
    // Tracking global de métricas se necessário
    if (window.__DIAGNOSTICS__) {
      window.__DIAGNOSTICS__.push({
        id,
        phase,
        actualDuration,
        commitTime,
        timestamp: Date.now()
      });
    }
  };

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}

// Inicializa o tracker global de diagnóstico se solicitado via URL ?diagnostics=true
if (typeof window !== "undefined" && window.location.search.includes("diagnostics=true")) {
  (window as any).__DIAGNOSTICS__ = [];
  console.info("🛠️ Modo de Diagnóstico Ativado. Acesse window.__DIAGNOSTICS__ para ver os logs de renderização.");
}
