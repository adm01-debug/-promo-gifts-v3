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
    const { data, error } = await supabase.functions.invoke("voice-agent", {
      body: { transcript },
    });

    if (error) {
      throw new Error(error.message || "AI processing failed");
    }
    return validateAction(data as VoiceAgentAction);
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
