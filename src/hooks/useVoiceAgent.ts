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
  const isStartingRef = useRef(false);

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

      logVoiceCommand(action, { transcript: text, durationMs: Date.now() - startTime, success: true });

      setPhase("idle");
      onAction?.(action);
    } catch (err) {
      const message = friendlyErrorMessage(err);
      setError(message);
      setPhase("error");
      onError?.(message);

      logVoiceCommand(
        { action: "answer", response: message, data: {} },
        { transcript: text, durationMs: Date.now() - startTime, success: false }
      );

      setTimeout(() => setPhase("idle"), 3000);
    } finally {
      isProcessingRef.current = false;
    }
  }, [onAction, onError]);

  const handleScribeError = useCallback((err: unknown) => {
    console.error("[Voice] Scribe runtime error:", err);
    isStartingRef.current = false;
    const message = friendlyErrorMessage(err);
    setError(message);
    setPhase("error");
    onError?.(message);
    setTimeout(() => setPhase("idle"), 5000);
  }, [onError]);

  // ElevenLabs Scribe for STT
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    onConnect: () => {
      console.log("[Voice] Scribe socket connected");
    },
    onSessionStarted: () => {
      console.log("[Voice] Scribe session started");
      isStartingRef.current = false;
      setError(null);
      setPhase("listening");
    },
    onDisconnect: () => {
      console.log("[Voice] Scribe disconnected");
      isStartingRef.current = false;
      setPartialTranscript("");
      setPhase((current) => (
        current === "processing" || current === "speaking" || current === "error"
          ? current
          : "idle"
      ));
    },
    onError: handleScribeError,
    onAuthError: ({ error }) => handleScribeError(new Error(error)),
    onQuotaExceededError: ({ error }) => handleScribeError(new Error(error)),
    onCommitThrottledError: ({ error }) => handleScribeError(new Error(error)),
    onTranscriberError: ({ error }) => handleScribeError(new Error(error)),
    onUnacceptedTermsError: ({ error }) => handleScribeError(new Error(error)),
    onRateLimitedError: ({ error }) => handleScribeError(new Error(error)),
    onInputError: ({ error }) => handleScribeError(new Error(error)),
    onQueueOverflowError: ({ error }) => handleScribeError(new Error(error)),
    onResourceExhaustedError: ({ error }) => handleScribeError(new Error(error)),
    onSessionTimeLimitExceededError: ({ error }) => handleScribeError(new Error(error)),
    onChunkSizeExceededError: ({ error }) => handleScribeError(new Error(error)),
    onInsufficientAudioActivityError: ({ error }) => handleScribeError(new Error(error)),
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
    if (isStartingRef.current || scribe.isConnected || scribe.status === "connecting") return;
    isStartingRef.current = true;
    setError(null);
    setPartialTranscript("");
    setFinalTranscript("");
    setAgentResponse("");
    setCurrentAction(null);
    setPhase("idle");

    try {
      // Skip pre-check — let ElevenLabs Scribe handle mic access directly
      // The previous getUserMedia pre-check was causing issues on some devices
      
      const { data, error: tokenError } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (tokenError || !data?.token) {
        console.error("[Voice] Token error:", tokenError);
        throw new Error("Não foi possível obter token de transcrição");
      }

      console.log("[Voice] Token obtained, connecting to Scribe...");

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("[Voice] Scribe connection initiated");
    } catch (err) {
      isStartingRef.current = false;
      console.error("[Voice] startListening error:", err);
      const message = friendlyErrorMessage(err);
      setError(message);
      setPhase("error");
      onError?.(message);
      setTimeout(() => setPhase("idle"), 5000);
    }
  }, [scribe, onError]);

  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    scribe.disconnect();
    if (phase === "listening") {
      if (partialTranscript.trim()) {
        processTranscript(partialTranscript.trim());
      } else {
        setPhase("idle");
      }
    } else if (phase !== "processing" && phase !== "speaking") {
      setPhase("idle");
    }
  }, [scribe, phase, partialTranscript, processTranscript]);

  const stopSpeaking = useCallback(() => {
    stopSpeakingRef.current?.();
    stopSpeakingRef.current = null;
    setPhase("idle");
  }, []);

  const reset = useCallback(() => {
    isStartingRef.current = false;
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
