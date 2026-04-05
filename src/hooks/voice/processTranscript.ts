import { supabase } from "@/integrations/supabase/client";
import type { VoiceAgentAction } from "./types";

/**
 * processVoiceTranscript — Sends transcript to AI and returns structured action.
 */
export async function processVoiceTranscript(transcript: string): Promise<VoiceAgentAction> {
  const { data, error } = await supabase.functions.invoke("voice-agent", {
    body: { transcript },
  });

  if (error) {
    throw new Error(error.message || "AI processing failed");
  }

  const action = data as VoiceAgentAction;

  // Validate required fields
  if (!action?.action || !action?.response) {
    return {
      action: "answer",
      response: action?.response || "Desculpe, não entendi. Pode repetir?",
      data: {},
    };
  }

  return action;
}
