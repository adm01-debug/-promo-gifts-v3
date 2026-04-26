/**
 * step-up-error
 *
 * Helpers para detectar e tratar erros `step_up_required` / `step_up_invalid`
 * retornados por edge functions sensíveis (mcp-keys-update, mcp-keys-rotate, etc.).
 *
 * O cliente Supabase entrega o body parseado em `data` mesmo quando a
 * resposta é 4xx, mas também propaga `error` (FunctionsHttpError). Esta
 * função inspeciona ambos os caminhos sem expor `request_id` ou stacks.
 */
import { toast } from "sonner";

export type StepUpErrorKind = "step_up_required" | "step_up_invalid";

interface BackendErrorShape {
  error?: string;
  message?: string;
}

/** Tenta extrair `error` do body devolvido pela edge function. */
export function extractStepUpError(
  data: unknown,
  error: unknown,
): { kind: StepUpErrorKind; message: string } | null {
  const candidates: BackendErrorShape[] = [];
  if (data && typeof data === "object") candidates.push(data as BackendErrorShape);
  if (error && typeof error === "object") {
    const e = error as { context?: { body?: unknown }; message?: string };
    // FunctionsHttpError em algumas versões expõe context.body com o JSON cru.
    const body = e.context?.body;
    if (typeof body === "string") {
      try { candidates.push(JSON.parse(body) as BackendErrorShape); } catch { /* noop */ }
    } else if (body && typeof body === "object") {
      candidates.push(body as BackendErrorShape);
    }
    if (typeof e.message === "string") candidates.push({ error: e.message });
  }
  for (const c of candidates) {
    if (c.error === "step_up_required" || c.error === "step_up_invalid") {
      return {
        kind: c.error,
        message: typeof c.message === "string" && c.message.trim().length > 0
          ? c.message
          : c.error === "step_up_required"
            ? "Confirme sua identidade (senha + código por e-mail) para continuar."
            : "Verificação dupla expirou ou é inválida. Refaça a confirmação.",
      };
    }
  }
  return null;
}

/**
 * Exibe um toast padronizado com botão "Refazer verificação" que reabre o
 * `StepUpAuthDialog` (callback `onRetry`). IDs estáveis evitam duplicação
 * caso o mesmo erro volte em cliques rápidos.
 */
export function showStepUpToast(
  kind: StepUpErrorKind,
  message: string,
  onRetry: () => void,
): void {
  const title = kind === "step_up_required"
    ? "Verificação dupla obrigatória"
    : "Verificação dupla inválida";
  toast.error(title, {
    id: `step-up-${kind}`,
    description: message,
    duration: 8000,
    action: {
      label: "Refazer verificação",
      onClick: onRetry,
    },
  });
}

/**
 * Atalho: detecta + dispara o toast. Retorna `true` se foi tratado como
 * erro de step-up (caller deve abortar fluxo padrão de erro).
 */
export function handleStepUpError(
  data: unknown,
  error: unknown,
  onRetry: () => void,
): boolean {
  const detected = extractStepUpError(data, error);
  if (!detected) return false;
  showStepUpToast(detected.kind, detected.message, onRetry);
  return true;
}
