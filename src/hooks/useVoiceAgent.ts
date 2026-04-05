import { useState, useCallback, useRef } from "react";
import { useScribe } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

export interface VoiceAgentAction {
  action: "search" | "filter" | "navigate" | "sort" | "clear" | "answer";
  response: string;
  data?: {
    query?: string;
    route?: string;
    sortBy?: string;
    filters?: {
      category?: string;
      color?: string;
      material?: string;
      maxPrice?: number;
      minPrice?: number;
      inStock?: boolean;
      isKit?: boolean;
    };
  };
}

export type VoiceAgentPhase = "idle" | "listening" | "processing" | "speaking" | "error";

interface UseVoiceAgentOptions {
  onAction?: (action: VoiceAgentAction) => void;
  onError?: (error: string) => void;
}

export function useVoiceAgent({ onAction, onError }: UseVoiceAgentOptions = {}) {
  const [phase, setPhase] = useState<VoiceAgentPhase>("idle");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [agentResponse, setAgentResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<VoiceAgentAction | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef(false);

  const processTranscript = useCallback(async (text: string) => {
    if (isProcessingRef.current || !text.trim()) return;
    isProcessingRef.current = true;
    setPhase("processing");
    setFinalTranscript(text);
    setAgentResponse("");

    try {
      // Step 1: Send to AI for interpretation
      const { data: aiResult, error: aiError } = await supabase.functions.invoke("voice-agent", {
        body: { transcript: text },
      });

      if (aiError) throw new Error(aiError.message || "AI processing failed");

      const action = aiResult as VoiceAgentAction;
      setCurrentAction(action);
      setAgentResponse(action.response);

      // Step 2: Speak the response via TTS
      if (action.response) {
        setPhase("speaking");
        try {
          const ttsResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ text: action.response }),
            }
          );

          if (ttsResponse.ok) {
            const ttsData = await ttsResponse.json();
            if (ttsData.audioContent) {
              const audioUrl = `data:audio/mpeg;base64,${ttsData.audioContent}`;
              const audio = new Audio(audioUrl);
              audioRef.current = audio;
              
              audio.onended = () => {
                setPhase("idle");
                onAction?.(action);
              };
              audio.onerror = () => {
                setPhase("idle");
                onAction?.(action);
              };
              await audio.play();
            } else {
              setPhase("idle");
              onAction?.(action);
            }
          } else {
            // TTS failed but still execute the action
            setPhase("idle");
            onAction?.(action);
          }
        } catch {
          // TTS failed, still execute action
          setPhase("idle");
          onAction?.(action);
        }
      } else {
        setPhase("idle");
        onAction?.(action);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar comando";
      setError(message);
      setPhase("error");
      onError?.(message);
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
      // Get scribe token
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
      const message = err instanceof Error ? err.message : "Erro ao iniciar microfone";
      setError(message);
      setPhase("error");
      onError?.(message);
      setTimeout(() => setPhase("idle"), 3000);
    }
  }, [scribe, onError]);

  const stopListening = useCallback(() => {
    scribe.disconnect();
    if (phase === "listening") {
      // If we have a partial transcript, process it
      if (partialTranscript.trim()) {
        processTranscript(partialTranscript.trim());
      } else {
        setPhase("idle");
      }
    }
  }, [scribe, phase, partialTranscript, processTranscript]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPhase("idle");
  }, []);

  const reset = useCallback(() => {
    scribe.disconnect();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
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
