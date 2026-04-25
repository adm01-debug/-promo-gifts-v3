import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StepUpAction =
  | "promote_dev"
  | "demote_dev"
  | "mcp_full_issue"
  | "mcp_full_escalate"
  | "secret_rotation"
  | "secret_revoke";

interface StartParams {
  action: StepUpAction;
  targetRef?: string | null;
}

interface StepUpState {
  challengeId: string | null;
  passwordVerified: boolean;
  token: string | null;
  expiresAt: string | null;
  loading: boolean;
  error: string | null;
}

const initial: StepUpState = {
  challengeId: null,
  passwordVerified: false,
  token: null,
  expiresAt: null,
  loading: false,
  error: null,
};

export function useStepUpAuth() {
  const [state, setState] = useState<StepUpState>(initial);

  const reset = useCallback(() => setState(initial), []);

  const requestChallenge = useCallback(async ({ action, targetRef }: StartParams) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase.functions.invoke("step-up-verify", {
      body: { step: "request", action, target_ref: targetRef ?? null },
    });
    if (error || data?.error) {
      setState((s) => ({ ...s, loading: false, error: data?.error || error?.message || "Falha ao iniciar verificação" }));
      return false;
    }
    setState((s) => ({ ...s, loading: false, challengeId: data.challenge_id, expiresAt: data.expires_at }));
    return true;
  }, []);

  const verifyPassword = useCallback(async (password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase.functions.invoke("step-up-verify", {
      body: { step: "verify_password", challenge_id: state.challengeId, password },
    });
    if (error || data?.error) {
      setState((s) => ({ ...s, loading: false, error: "Senha incorreta" }));
      return false;
    }
    setState((s) => ({ ...s, loading: false, passwordVerified: true }));
    return true;
  }, [state.challengeId]);

  const verifyOtp = useCallback(async (otp: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase.functions.invoke("step-up-verify", {
      body: { step: "verify_otp", challenge_id: state.challengeId, otp },
    });
    if (error || data?.error) {
      setState((s) => ({ ...s, loading: false, error: "Código inválido ou expirado" }));
      return null;
    }
    setState((s) => ({ ...s, loading: false, token: data.token, expiresAt: data.expires_at }));
    return data.token as string;
  }, [state.challengeId]);

  return { state, reset, requestChallenge, verifyPassword, verifyOtp };
}
