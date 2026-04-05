import { supabase } from "@/integrations/supabase/client";
import type { VoiceAgentAction } from "./types";

/**
 * processVoiceTranscript — Sends transcript to AI and returns structured action.
 */
export async function processVoiceTranscript(transcript: string): Promise<VoiceAgentAction> {
  // Timeout after 15s to avoid hanging UI
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-agent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${(await (await import("@/integrations/supabase/client")).supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ transcript }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const data = await response.json();
    return validateAction(data as VoiceAgentAction);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("timeout");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function validateAction(action: VoiceAgentAction): VoiceAgentAction {
  if (!action?.action || !action?.response) {
    return {
      action: "answer",
      response: action?.response || "Desculpe, não entendi. Pode repetir?",
      data: {},
    };
  }

  return action;
}
