import { useState, useCallback, useRef, useEffect } from "react";
import { useScribe } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { playTtsAudio } from "./voice/playTtsAudio";
import { processVoiceTranscript } from "./voice/processTranscript";
import { withRetry, friendlyErrorMessage } from "./voice/retry";
import { logVoiceCommand } from "./voice/logVoiceCommand";
import type { VoiceAgentAction, VoiceAgentPhase, UseVoiceAgentOptions } from "./voice/types";

export type { VoiceAgentAction, VoiceAgentPhase } from "./voice/types";

const ERROR_RESET_DELAY_MS = 5000;
const PROCESSING_ERROR_RESET_DELAY_MS = 3000;
const SESSION_START_TIMEOUT_MS = 8000;
const SCRIBE_CONNECT_OPTIONS = {
  modelId: "scribe_v2_realtime",
  microphone: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
} as const;

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
  const resetPhaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectScribeRef = useRef<() => void>(() => undefined);

  const clearResetPhaseTimer = useCallback(() => {
    if (resetPhaseTimerRef.current !== null) {
      clearTimeout(resetPhaseTimerRef.current);
      resetPhaseTimerRef.current = null;
    }
  }, []);

  const clearSessionStartTimer = useCallback(() => {
    if (sessionStartTimerRef.current !== null) {
      clearTimeout(sessionStartTimerRef.current);
      sessionStartTimerRef.current = null;
    }
  }, []);

  const scheduleIdleReset = useCallback((delay = ERROR_RESET_DELAY_MS) => {
    clearResetPhaseTimer();
    resetPhaseTimerRef.current = setTimeout(() => {
      resetPhaseTimerRef.current = null;
      setPhase("idle");
      setError(null);
    }, delay);
  }, [clearResetPhaseTimer]);

  const forceDisconnectScribe = useCallback(() => {
    clearSessionStartTimer();
    try {
      disconnectScribeRef.current();
    } catch (disconnectError) {
      console.warn("[Voice] Failed to disconnect Scribe:", disconnectError);
    }
  }, [clearSessionStartTimer]);

  const processTranscript = useCallback(async (text: string) => {
    if (isProcessingRef.current || !text.trim()) return;

    clearResetPhaseTimer();
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
        } finally {
          stopSpeakingRef.current = null;
        }
      }

      logVoiceCommand(action, {
        transcript: text,
        durationMs: Date.now() - startTime,
        success: true,
      });

      setPhase("idle");
      onAction?.(action);
    } catch (err) {
      const message = friendlyErrorMessage(err);
      setError(message);
      setPhase("error");
      onError?.(message);

      logVoiceCommand(
        { action: "answer", response: message, data: {} },
        {
          transcript: text,
          durationMs: Date.now() - startTime,
          success: false,
        }
      );

      scheduleIdleReset(PROCESSING_ERROR_RESET_DELAY_MS);
    } finally {
      isProcessingRef.current = false;
    }
  }, [clearResetPhaseTimer, onAction, onError, scheduleIdleReset]);

  const handleScribeError = useCallback((err: unknown) => {
    console.error("[Voice] Scribe runtime error:", err);
    isStartingRef.current = false;
    clearResetPhaseTimer();
    clearSessionStartTimer();
    forceDisconnectScribe();
    setPartialTranscript("");

    const message = friendlyErrorMessage(err);
    setError(message);
    setPhase("error");
    onError?.(message);
    scheduleIdleReset();
  }, [clearResetPhaseTimer, clearSessionStartTimer, forceDisconnectScribe, onError, scheduleIdleReset]);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    onConnect: () => {
      console.log("[Voice] Scribe socket connected");
    },
    onSessionStarted: () => {
      console.log("[Voice] Scribe session started");
      isStartingRef.current = false;
      clearResetPhaseTimer();
      clearSessionStartTimer();
      setError(null);
      setPhase("listening");
    },
    onDisconnect: () => {
      console.log("[Voice] Scribe disconnected");
      isStartingRef.current = false;
      clearSessionStartTimer();
      setPartialTranscript("");
      setPhase((current) => (
        current === "processing" || current === "speaking" || current === "error"
          ? current
          : "idle"
      ));
    },
    onError: handleScribeError,
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

  disconnectScribeRef.current = () => scribe.disconnect();

  const startListening = useCallback(async () => {
    const scribeStatus = scribe.status ?? "disconnected";
    if (isStartingRef.current || scribeStatus === "connecting") return;

    clearResetPhaseTimer();
    clearSessionStartTimer();

    if (scribeStatus !== "disconnected" || scribe.isConnected) {
      forceDisconnectScribe();
    }

    isStartingRef.current = true;
    setError(null);
    setPartialTranscript("");
    setFinalTranscript("");
    setAgentResponse("");
    setCurrentAction(null);
    setPhase("idle");

    try {
      const { data, error: tokenError } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (tokenError || !data?.token) {
        console.error("[Voice] Token error:", tokenError);
        throw new Error("Não foi possível obter token de transcrição");
      }

      console.log("[Voice] Token obtained, connecting to Scribe...");

      sessionStartTimerRef.current = setTimeout(() => {
        if (!isStartingRef.current) return;
        handleScribeError(new Error("Scribe session start timeout"));
      }, SESSION_START_TIMEOUT_MS);

      await scribe.connect({
        token: data.token,
        ...SCRIBE_CONNECT_OPTIONS,
      });

      console.log("[Voice] Scribe connection initiated");
    } catch (err) {
      isStartingRef.current = false;
      clearSessionStartTimer();
      console.error("[Voice] startListening error:", err);
      const message = friendlyErrorMessage(err);
      setError(message);
      setPhase("error");
      onError?.(message);
      scheduleIdleReset();
    }
  }, [clearResetPhaseTimer, clearSessionStartTimer, forceDisconnectScribe, handleScribeError, onError, scheduleIdleReset, scribe]);

  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    clearResetPhaseTimer();
    clearSessionStartTimer();
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
  }, [clearResetPhaseTimer, clearSessionStartTimer, partialTranscript, phase, processTranscript, scribe]);

  const stopSpeaking = useCallback(() => {
    clearResetPhaseTimer();
    stopSpeakingRef.current?.();
    stopSpeakingRef.current = null;
    setPhase("idle");
  }, [clearResetPhaseTimer]);

  const reset = useCallback(() => {
    isStartingRef.current = false;
    clearResetPhaseTimer();
    clearSessionStartTimer();
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
  }, [clearResetPhaseTimer, clearSessionStartTimer, scribe]);

  useEffect(() => {
    return () => {
      clearResetPhaseTimer();
      clearSessionStartTimer();
      try {
        scribe.disconnect();
      } catch {
      }
      stopSpeakingRef.current?.();
      stopSpeakingRef.current = null;
    };
  }, [clearResetPhaseTimer, clearSessionStartTimer, scribe]);

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
