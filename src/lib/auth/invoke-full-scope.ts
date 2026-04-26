/**
 * invokeFullScopeFunction
 *
 * Helper centralizado para chamar edge functions sensíveis que exigem
 * step-up (mcp-keys-issue/rotate/update/revoke, etc.). Encapsula:
 *
 *  1. Solicita o desafio via `DevChallengeContext` (senha + OTP server-side).
 *  2. Injeta `step_up_token` no body antes de invocar a função.
 *  3. Detecta `step_up_required` / `step_up_invalid` no retorno e exibe
 *     toast com CTA "Refazer verificação" que automaticamente refaz o
 *     fluxo (challenge → invoke) sem o caller precisar gerenciar estado.
 *  4. Retorna um discriminated union claro para o caller diferenciar
 *     sucesso, cancelamento (modal fechado) e erro genérico.
 *
 * Uso:
 *   const { challenge } = useDevChallenge();
 *   const result = await invokeFullScopeFunction({
 *     challenge,
 *     functionName: "mcp-keys-rotate",
 *     action: "mcp_full_issue",
 *     actionLabel: `Rotacionar chave MCP "${name}"`,
 *     targetRef: keyId,
 *     body: { source_key_id: keyId, justification, confirmation_phrase },
 *   });
 *   if (result.status === "ok") { ... }
 *   else if (result.status === "cancelled") { return; }
 *   else toast.error(...);
 */
import { supabase } from "@/integrations/supabase/client";
import type { StepUpAction } from "@/hooks/useStepUpAuth";
import { handleStepUpError } from "@/lib/auth/step-up-error";

interface ChallengeFn {
  (req: { action: StepUpAction; actionLabel: string; targetRef?: string | null }): Promise<string | null>;
}

export interface InvokeFullScopeOptions<TBody extends Record<string, unknown>> {
  /** `challenge` retornado por `useDevChallenge()`. */
  challenge: ChallengeFn;
  /** Nome da edge function (ex.: `mcp-keys-rotate`). */
  functionName: string;
  /** Ação registrada no `step-up-issue` (define o binding server-side). */
  action: StepUpAction;
  /** Texto humano exibido no diálogo de step-up. */
  actionLabel: string;
  /**
   * ID do recurso alvo (ex.: key_id). Quando omitido/null, o token não
   * é vinculado a um alvo específico (usado por `mcp-keys-issue`).
   */
  targetRef?: string | null;
  /** Body adicional. `step_up_token` é mesclado automaticamente. */
  body: TBody;
  /**
   * Se `true`, repete o fluxo automaticamente quando o backend devolve
   * `step_up_invalid` (ex.: token expirou entre o desafio e a chamada).
   * Default `true`.
   */
  autoRetryOnInvalid?: boolean;
}

export type InvokeFullScopeResult<TData> =
  /** Sucesso: data é o body parseado da edge function. */
  | { status: "ok"; data: TData }
  /** Usuário fechou o modal de step-up sem verificar. */
  | { status: "cancelled" }
  /**
   * Erro de step-up que não pôde ser auto-resolvido. Toast com CTA já foi
   * exibido pelo helper; caller normalmente apenas faz `return`.
   */
  | { status: "step_up_error"; kind: "step_up_required" | "step_up_invalid" | "dev_role_required" }
  /** Erro genérico (rede, validação, 500). Caller decide UI. */
  | { status: "error"; error: unknown; data: unknown };

const MAX_AUTO_RETRIES = 1;

export async function invokeFullScopeFunction<
  TBody extends Record<string, unknown>,
  TData = unknown,
>(opts: InvokeFullScopeOptions<TBody>): Promise<InvokeFullScopeResult<TData>> {
  const {
    challenge,
    functionName,
    action,
    actionLabel,
    targetRef = null,
    body,
    autoRetryOnInvalid = true,
  } = opts;

  const runOnce = async (retriesLeft: number): Promise<InvokeFullScopeResult<TData>> => {
    const token = await challenge({ action, actionLabel, targetRef });
    if (!token) return { status: "cancelled" };

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { ...body, step_up_token: token },
    });

    // Detecta step-up errors e exibe toast com CTA "Refazer verificação".
    let stepUpKind: "step_up_required" | "step_up_invalid" | null = null;
    const handled = handleStepUpError(data, error, () => {
      // Quando o usuário clica em "Refazer verificação", refaz o fluxo
      // completo (novo challenge + novo invoke). Resultado descartado —
      // toasts/state subsequentes são problema do caller original se
      // ele tiver registrado callback. Para integração mais profunda,
      // o caller pode usar `autoRetryOnInvalid`.
      void runOnce(0);
    });

    if (handled) {
      // `handleStepUpError` já consumiu o erro; identifica o tipo p/ retry automático.
      const errStr = (data as { error?: string } | null | undefined)?.error;
      stepUpKind = errStr === "step_up_invalid" ? "step_up_invalid" : "step_up_required";

      if (stepUpKind === "step_up_invalid" && autoRetryOnInvalid && retriesLeft > 0) {
        // Token expirou entre desafio e chamada: tenta uma vez automaticamente.
        return runOnce(retriesLeft - 1);
      }
      return { status: "step_up_error", kind: stepUpKind };
    }

    if (error) return { status: "error", error, data };
    if (!data || (data as { ok?: boolean }).ok === false) {
      return { status: "error", error: null, data };
    }
    return { status: "ok", data: data as TData };
  };

  return runOnce(MAX_AUTO_RETRIES);
}
