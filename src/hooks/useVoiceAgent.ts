import { useState, useCallback, useRef } from "react";
import { useScribe } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { playTtsAudio } from "./voice/playTtsAudio";
import { processVoiceTranscript } from "./voice/processTranscript";
import { withRetry, friendlyErrorMessage } from "./voice/retry";
import { logVoiceCommand } from "./voice/logVoiceCommand";
import type { VoiceAgentAction, VoiceAgentPhase, UseVoiceAgentOptions } from "./voice/types";

// Re-export types for consumers
export type { VoiceAgentAction, VoiceAgentPhase } from "./voice/types";

export function useVoiceAgent({ onAction, onError }: UseVoiceAgentOptions = {}) {
  const [phase, setPhase] = useState<VoiceAgentPhase>("idle");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [agentResponse, setAgentResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<VoiceAgentAction | null>(null);
  const stopSpeakingRef = useRef<(() => void) | null>(null);
  const isProcessingRef = useRef(false);

  const processTranscript = useCallback(async (text: string) => {
    if (isProcessingRef.current || !text.trim()) return;
    isProcessingRef.current = true;
    setPhase("processing");
    setFinalTranscript(text);
    setAgentResponse("");
    const startTime = Date.now();

    try {
      const action = await withRetry(() => processVoiceTranscript(text));
      setCurrentAction(action);
      setAgentResponse(action.response);

      if (action.response) {
        setPhase("speaking");
        try {
          const { promise, stop } = playTtsAudio(action.response);
          stopSpeakingRef.current = stop;
          await promise;
        } catch {
          // TTS failed silently
        } finally {
          stopSpeakingRef.current = null;
        }
      }

      // Log successful command
      logVoiceCommand(action, { transcript: text, durationMs: Date.now() - startTime, success: true });

      setPhase("idle");
      onAction?.(action);
    } catch (err) {
      const message = friendlyErrorMessage(err);
      setError(message);
      setPhase("error");
      onError?.(message);

      // Log failed command
      logVoiceCommand(
        { action: "answer", response: message, data: {} },
        { transcript: text, durationMs: Date.now() - startTime, success: false }
      );

      setTimeout(() => setPhase("idle"), 3000);
    } finally {
      isProcessingRef.current = false;
    }
  }, [onAction, onError]);

  // ElevenLabs Scribe for STT
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    onPartialTranscript: (data) => {
      setPartialTranscript(data.text);
    },
    onCommittedTranscript: (data) => {
      if (data.text.trim()) {
        setPartialTranscript("");
        processTranscript(data.text.trim());
      }
    },
  });

  const startListening = useCallback(async () => {
    setError(null);
    setPartialTranscript("");
    setFinalTranscript("");
    setAgentResponse("");
    setCurrentAction(null);
    setPhase("listening");

    try {
      const { data, error: tokenError } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (tokenError || !data?.token) {
        throw new Error("Não foi possível obter token de transcrição");
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err) {
      const message = friendlyErrorMessage(err);
      setError(message);
      setPhase("error");
      onError?.(message);
      setTimeout(() => setPhase("idle"), 3000);
    }
  }, [scribe, onError]);

  const stopListening = useCallback(() => {
    scribe.disconnect();
    if (phase === "listening") {
      if (partialTranscript.trim()) {
        processTranscript(partialTranscript.trim());
      } else {
        setPhase("idle");
      }
    }
  }, [scribe, phase, partialTranscript, processTranscript]);

  const stopSpeaking = useCallback(() => {
    stopSpeakingRef.current?.();
    stopSpeakingRef.current = null;
    setPhase("idle");
  }, []);

  const reset = useCallback(() => {
    scribe.disconnect();
    stopSpeakingRef.current?.();
    stopSpeakingRef.current = null;
    setPhase("idle");
    setPartialTranscript("");
    setFinalTranscript("");
    setAgentResponse("");
    setError(null);
    setCurrentAction(null);
    isProcessingRef.current = false;
  }, [scribe]);

  return {
    phase,
    partialTranscript,
    finalTranscript,
    agentResponse,
    error,
    currentAction,
    isConnected: scribe.isConnected,
    startListening,
    stopListening,
    stopSpeaking,
    reset,
  };
}
