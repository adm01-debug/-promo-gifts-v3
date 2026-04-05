/**
 * logVoiceCommand — Logs a voice command to the database for analytics.
 * Fire-and-forget — does not throw or block the UI.
 */
import { supabase } from "@/integrations/supabase/client";
import type { VoiceAgentAction } from "./types";

export function logVoiceCommand(
  action: VoiceAgentAction,
  options?: { durationMs?: number; success?: boolean }
) {
  // Fire and forget — don't await, don't block
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("voice_command_logs").insert({
        user_id: user.id,
        transcript: action.data?.query || action.response,
        action: action.action,
        response: action.response,
        data: action.data || {},
        duration_ms: options?.durationMs ?? null,
        success: options?.success ?? true,
      });
    } catch {
      // Silent — analytics should never break UX
    }
  })();
}
