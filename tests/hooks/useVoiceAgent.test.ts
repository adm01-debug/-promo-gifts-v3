/**
 * Exhaustive tests for useVoiceAgent hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock supabase
const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

// Mock ElevenLabs
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
let onPartialTranscript: ((data: { text: string }) => void) | undefined;
let onCommittedTranscript: ((data: { text: string }) => void) | undefined;

vi.mock("@elevenlabs/react", () => ({
  useScribe: (opts: {
    onPartialTranscript?: (data: { text: string }) => void;
    onCommittedTranscript?: (data: { text: string }) => void;
  }) => {
    onPartialTranscript = opts.onPartialTranscript;
    onCommittedTranscript = opts.onCommittedTranscript;
    return {
      connect: mockConnect,
      disconnect: mockDisconnect,
      isConnected: false,
    };
  },
}));

// Mock Audio
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();
let audioOnEnded: (() => void) | undefined;
let audioOnError: (() => void) | undefined;

vi.stubGlobal("Audio", class {
  src = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(src?: string) {
    if (src) this.src = src;
    // Capture handlers
    const self = this;
    Object.defineProperty(this, 'onended', {
      set(fn) { audioOnEnded = fn; },
      get() { return audioOnEnded; },
    });
    Object.defineProperty(this, 'onerror', {
      set(fn) { audioOnError = fn; },
      get() { return audioOnError; },
    });
  }
  play = mockPlay;
  pause = mockPause;
});

import { useVoiceAgent } from "@/hooks/useVoiceAgent";

describe("useVoiceAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    audioOnEnded = undefined;
    audioOnError = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initialization ──
  describe("initialization", () => {
    it("starts with idle phase", () => {
      const { result } = renderHook(() => useVoiceAgent());
      expect(result.current.phase).toBe("idle");
    });

    it("has empty transcripts initially", () => {
      const { result } = renderHook(() => useVoiceAgent());
      expect(result.current.partialTranscript).toBe("");
      expect(result.current.finalTranscript).toBe("");
      expect(result.current.agentResponse).toBe("");
    });

    it("has no error initially", () => {
      const { result } = renderHook(() => useVoiceAgent());
      expect(result.current.error).toBeNull();
    });

    it("has no current action initially", () => {
      const { result } = renderHook(() => useVoiceAgent());
      expect(result.current.currentAction).toBeNull();
    });

    it("is not connected initially", () => {
      const { result } = renderHook(() => useVoiceAgent());
      expect(result.current.isConnected).toBe(false);
    });

    it("exposes all required methods", () => {
      const { result } = renderHook(() => useVoiceAgent());
      expect(typeof result.current.startListening).toBe("function");
      expect(typeof result.current.stopListening).toBe("function");
      expect(typeof result.current.stopSpeaking).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });
  });

  // ── startListening ──
  describe("startListening", () => {
    it("sets phase to listening on success", async () => {
      mockInvoke.mockResolvedValueOnce({ data: { token: "test-token" }, error: null });
      mockConnect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useVoiceAgent());
      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.phase).toBe("listening");
    });

    it("calls elevenlabs-scribe-token edge function", async () => {
      mockInvoke.mockResolvedValueOnce({ data: { token: "test-token" }, error: null });
      mockConnect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useVoiceAgent());
      await act(async () => {
        await result.current.startListening();
      });

      expect(mockInvoke).toHaveBeenCalledWith("elevenlabs-scribe-token");
    });

    it("connects scribe with correct options", async () => {
      mockInvoke.mockResolvedValueOnce({ data: { token: "test-token" }, error: null });
      mockConnect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useVoiceAgent());
      await act(async () => {
        await result.current.startListening();
      });

      expect(mockConnect).toHaveBeenCalledWith({
        token: "test-token",
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
    });

    it("sets error phase when token fetch fails", async () => {
      mockInvoke.mockResolvedValueOnce({ data: null, error: { message: "fail" } });
      const onError = vi.fn();

      const { result } = renderHook(() => useVoiceAgent({ onError }));
      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.phase).toBe("error");
      expect(onError).toHaveBeenCalled();
    });

    it("sets error when no token returned", async () => {
      mockInvoke.mockResolvedValueOnce({ data: {}, error: null });

      const { result } = renderHook(() => useVoiceAgent());
      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.phase).toBe("error");
    });

    it("clears previous state when starting", async () => {
      mockInvoke.mockResolvedValueOnce({ data: { token: "test-token" }, error: null });
      mockConnect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useVoiceAgent());
      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.partialTranscript).toBe("");
      expect(result.current.finalTranscript).toBe("");
      expect(result.current.agentResponse).toBe("");
      expect(result.current.error).toBeNull();
    });
  });

  // ── Transcript Processing ──
  describe("transcript processing", () => {
    it("updates partialTranscript from scribe", async () => {
      mockInvoke.mockResolvedValueOnce({ data: { token: "t" }, error: null });
      mockConnect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useVoiceAgent());
      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        onPartialTranscript?.({ text: "buscar can" });
      });

      expect(result.current.partialTranscript).toBe("buscar can");
    });

    it("processes committed transcript through AI", async () => {
      mockInvoke
        .mockResolvedValueOnce({ data: { token: "t" }, error: null }) // scribe token
        .mockResolvedValueOnce({ data: { action: "search", response: "Buscando", data: { query: "canetas" } }, error: null }); // voice-agent

      // Mock fetch for TTS
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ audioContent: "base64audio" }),
      }));

      const onAction = vi.fn();
      const { result } = renderHook(() => useVoiceAgent({ onAction }));

      await act(async () => {
        await result.current.startListening();
      });

      await act(async () => {
        onCommittedTranscript?.({ text: "buscar canetas" });
        // Wait for async processing
        await new Promise(r => setTimeout(r, 100));
      });

      expect(mockInvoke).toHaveBeenCalledWith("voice-agent", { body: { transcript: "buscar canetas" } });
    });

    it("ignores empty committed transcript", async () => {
      mockInvoke.mockResolvedValueOnce({ data: { token: "t" }, error: null });
      mockConnect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useVoiceAgent());
      await act(async () => {
        await result.current.startListening();
      });

      const initialInvokeCount = mockInvoke.mock.calls.length;

      act(() => {
        onCommittedTranscript?.({ text: "   " });
      });

      // Should NOT have called voice-agent
      expect(mockInvoke.mock.calls.length).toBe(initialInvokeCount);
    });
  });

  // ── stopListening ──
  describe("stopListening", () => {
    it("disconnects scribe", async () => {
      mockInvoke.mockResolvedValueOnce({ data: { token: "t" }, error: null });
      mockConnect.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useVoiceAgent());
      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        result.current.stopListening();
      });

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  // ── stopSpeaking ──
  describe("stopSpeaking", () => {
    it("sets phase to idle", () => {
      const { result } = renderHook(() => useVoiceAgent());
      act(() => {
        result.current.stopSpeaking();
      });
      expect(result.current.phase).toBe("idle");
    });
  });

  // ── reset ──
  describe("reset", () => {
    it("resets all state to initial values", () => {
      const { result } = renderHook(() => useVoiceAgent());
      act(() => {
        result.current.reset();
      });

      expect(result.current.phase).toBe("idle");
      expect(result.current.partialTranscript).toBe("");
      expect(result.current.finalTranscript).toBe("");
      expect(result.current.agentResponse).toBe("");
      expect(result.current.error).toBeNull();
      expect(result.current.currentAction).toBeNull();
    });

    it("disconnects scribe on reset", () => {
      const { result } = renderHook(() => useVoiceAgent());
      act(() => {
        result.current.reset();
      });
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  // ── Error handling ──
  describe("error handling", () => {
    it("calls onError callback on AI processing failure", async () => {
      mockInvoke
        .mockResolvedValueOnce({ data: { token: "t" }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: "AI failed" } });

      const onError = vi.fn();
      const { result } = renderHook(() => useVoiceAgent({ onError }));

      await act(async () => {
        await result.current.startListening();
      });

      await act(async () => {
        onCommittedTranscript?.({ text: "test command" });
        await new Promise(r => setTimeout(r, 100));
      });

      expect(onError).toHaveBeenCalled();
    });

    it("recovers from error phase after timeout", async () => {
      vi.useFakeTimers();
      mockInvoke.mockResolvedValueOnce({ data: null, error: { message: "fail" } });

      const { result } = renderHook(() => useVoiceAgent());

      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.phase).toBe("error");

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.phase).toBe("idle");
      vi.useRealTimers();
    });
  });
});
