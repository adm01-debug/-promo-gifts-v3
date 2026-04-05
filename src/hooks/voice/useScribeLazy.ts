/**
 * useScribeLazy — Lazy-loads @elevenlabs/react's useScribe only when needed.
 * Returns a stable interface matching what useVoiceAgent expects.
 */
import { useState, useCallback, useRef } from "react";

interface ScribeCallbacks {
  onPartialTranscript: (data: { text: string }) => void;
  onCommittedTranscript: (data: { text: string }) => void;
}

interface ScribeInstance {
  connect: (opts: { token: string; microphone: MediaTrackConstraints }) => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}

export function useScribeLazy(callbacks: ScribeCallbacks) {
  const [isConnected, setIsConnected] = useState(false);
  const instanceRef = useRef<ScribeInstance | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const connect = useCallback(async (opts: { token: string; microphone: MediaTrackConstraints }) => {
    // Dynamically import @elevenlabs/react only when connecting
    const { useScribe } = await import("@elevenlabs/react");
    
    // Since useScribe is a hook, we can't call it here dynamically.
    // Instead, we'll use the lower-level WebSocket API directly.
    // Fall back to the WebSocket-based Scribe API.
    const ws = new WebSocket(
      `wss://api.elevenlabs.io/v1/speech-to-text/scribe_v2_realtime?token=${opts.token}`
    );

    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: opts.microphone });
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    ws.onopen = () => {
      setIsConnected(true);
      // Send config
      ws.send(JSON.stringify({
        type: "config",
        data: {
          model_id: "scribe_v2_realtime",
          commit_strategy: "vad",
          audio_format: "pcm_16000",
        },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "partial_transcript" && msg.text) {
          callbacksRef.current.onPartialTranscript({ text: msg.text });
        } else if (msg.type === "committed_transcript" && msg.text) {
          callbacksRef.current.onCommittedTranscript({ text: msg.text });
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    // Send audio data
    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        pcm16[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
      }
      // Convert to base64
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      ws.send(JSON.stringify({
        type: "audio",
        data: btoa(binary),
      }));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    instanceRef.current = {
      connect: async () => {},
      disconnect: () => {
        ws.close();
        processor.disconnect();
        source.disconnect();
        audioContext.close();
        stream.getTracks().forEach((t) => t.stop());
        setIsConnected(false);
      },
      isConnected: true,
    };
  }, []);

  const disconnect = useCallback(() => {
    instanceRef.current?.disconnect();
    instanceRef.current = null;
    setIsConnected(false);
  }, []);

  return { connect, disconnect, isConnected };
}
