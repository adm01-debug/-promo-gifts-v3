/**
 * DevChallengeContext — Wrapper reutilizável de "challenge" para liberar
 * operações sensíveis (full scope) com re-checagem server-side de role `dev`.
 *
 * Uso:
 *   const { challenge } = useDevChallenge();
 *   const token = await challenge({
 *     action: "mcp_full_issue",
 *     actionLabel: "Emitir chave MCP com escopo total",
 *     targetRef: keyId,
 *   });
 *   if (!token) return; // usuário cancelou ou falhou
 *   await supabase.functions.invoke("mcp-keys-issue", { body: { ..., step_up_token: token }});
 *
 * Toda a verificação real (senha + OTP + role dev) acontece server-side
 * na edge function `step-up-verify`. O token é de uso único e validado
 * via RPC `consume_step_up_token` na edge final.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { StepUpAuthDialog } from "@/components/auth/StepUpAuthDialog";
import type { StepUpAction } from "@/hooks/useStepUpAuth";

interface ChallengeRequest {
  action: StepUpAction;
  actionLabel: string;
  targetRef?: string | null;
}

interface DevChallengeContextValue {
  /** Abre o modal de step-up. Resolve com o token verificado, ou `null` se cancelado/falhou. */
  challenge: (req: ChallengeRequest) => Promise<string | null>;
}

const DevChallengeContext = createContext<DevChallengeContextValue | null>(null);

interface PendingChallenge extends ChallengeRequest {
  resolve: (token: string | null) => void;
}

export function DevChallengeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<PendingChallenge | null>(null);
  const pendingRef = useRef<PendingChallenge | null>(null);

  const challenge = useCallback((req: ChallengeRequest) => {
    return new Promise<string | null>((resolve) => {
      const pending: PendingChallenge = { ...req, resolve };
      pendingRef.current = pending;
      setCurrent(pending);
      setOpen(true);
    });
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && pendingRef.current) {
      // Fechado sem verificar => cancelado
      pendingRef.current.resolve(null);
      pendingRef.current = null;
      setCurrent(null);
    }
  };

  const handleVerified = (token: string) => {
    if (pendingRef.current) {
      pendingRef.current.resolve(token);
      pendingRef.current = null;
    }
    setOpen(false);
    setCurrent(null);
  };

  return (
    <DevChallengeContext.Provider value={{ challenge }}>
      {children}
      {current && (
        <StepUpAuthDialog
          open={open}
          onOpenChange={handleOpenChange}
          action={current.action}
          targetRef={current.targetRef ?? null}
          actionLabel={current.actionLabel}
          onVerified={handleVerified}
        />
      )}
    </DevChallengeContext.Provider>
  );
}

export function useDevChallenge(): DevChallengeContextValue {
  const ctx = useContext(DevChallengeContext);
  if (!ctx) {
    throw new Error("useDevChallenge deve ser usado dentro de <DevChallengeProvider>");
  }
  return ctx;
}
