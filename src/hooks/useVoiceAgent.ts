import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playTtsAudio } from "./voice/playTtsAudio";
import { processVoiceTranscript } from "./voice/processTranscript";
import { withRetry, friendlyErrorMessage } from "./voice/retry";
import { logVoiceCommand } from "./voice/logVoiceCommand";
import type { VoiceAgentAction, VoiceAgentPhase, UseVoiceAgentOptions } from "./voice/types";

// Re-export types for consumers
export type { VoiceAgentAction, VoiceAgentPhase } from "./voice/types";

/**
 * Scribe connection managed imperatively via ref.
 * @elevenlabs/react is dynamically imported only when startListening() is called,
 * saving ~205KB from the initial bundle.
 */
interface ScribeRef {
  connect: (opts: { token: string; microphone: MediaTrackConstraints }) => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}

export function useVoiceAgent({ onAction, onError }: UseVoiceAgentOptions = {}) {
  const [phase, setPhase] = useState<VoiceAgentPhase>("idle");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [agentResponse, setAgentResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<VoiceAgentAction | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const stopSpeakingRef = useRef<(() => void) | null>(null);
  const isProcessingRef = useRef(false);
  const scribeRef = useRef<ScribeRef | null>(null);

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

  /**
   * Lazily load @elevenlabs/react and create a scribe instance.
   * Only called on first startListening(), subsequent calls reuse the instance.
   */
  const getOrCreateScribe = useCallback(async (): Promise<ScribeRef> => {
    if (scribeRef.current) return scribeRef.current;

    // Dynamic import — only loads the 205KB bundle when voice is first activated
    const { ScribeClient } = await import("@elevenlabs/react");

    const client = new ScribeClient();

    // Wire up transcript callbacks
    client.on("partialTranscript", (data: { text: string }) => {
      setPartialTranscript(data.text);
    });

    client.on("committedTranscript", (data: { text: string }) => {
      if (data.text.trim()) {
        setPartialTranscript("");
        processTranscript(data.text.trim());
      }
    });

    client.on("connected", () => setIsConnected(true));
    client.on("disconnected", () => setIsConnected(false));

    const instance: ScribeRef = {
      connect: async (opts) => {
        await client.connect({
          ...opts,
          modelId: "scribe_v2_realtime",
          commitStrategy: "vad",
        });
      },
      disconnect: () => {
        try { client.disconnect(); } catch {}
      },
      get isConnected() { return client.isConnected ?? false; },
    };

    scribeRef.current = instance;
    return instance;
  }, [processTranscript]);

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

      const scribe = await getOrCreateScribe();
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
  }, [getOrCreateScribe, onError]);

  const stopListening = useCallback(() => {
    scribeRef.current?.disconnect();
    if (phase === "listening") {
      if (partialTranscript.trim()) {
        processTranscript(partialTranscript.trim());
      } else {
        setPhase("idle");
      }
    }
  }, [phase, partialTranscript, processTranscript]);

  const stopSpeaking = useCallback(() => {
    stopSpeakingRef.current?.();
    stopSpeakingRef.current = null;
    setPhase("idle");
  }, []);

  const reset = useCallback(() => {
    scribeRef.current?.disconnect();
    stopSpeakingRef.current?.();
    stopSpeakingRef.current = null;
    setPhase("idle");
    setPartialTranscript("");
    setFinalTranscript("");
    setAgentResponse("");
    setError(null);
    setCurrentAction(null);
    isProcessingRef.current = false;
  }, []);

  return {
    phase,
    partialTranscript,
    finalTranscript,
    agentResponse,
    error,
    currentAction,
    isConnected,
    startListening,
    stopListening,
    stopSpeaking,
    reset,
  };
}
