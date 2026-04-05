import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
let onSessionStarted: (() => void) | undefined;
let onPartialTranscript: ((data: { text: string }) => void) | undefined;
let onCommittedTranscript: ((data: { text: string }) => void) | undefined;
let onScribeError: ((error: unknown) => void) | undefined;
let scribeStatus = "disconnected";
let scribeConnected = false;
let onDisconnectHandler: (() => void) | undefined;

vi.mock("@elevenlabs/react", () => ({
  useScribe: (opts: {
    onSessionStarted?: () => void;
    onPartialTranscript?: (data: { text: string }) => void;
    onCommittedTranscript?: (data: { text: string }) => void;
    onError?: (error: unknown) => void;
    onDisconnect?: () => void;
  }) => {
    onSessionStarted = opts.onSessionStarted;
    onPartialTranscript = opts.onPartialTranscript;
    onCommittedTranscript = opts.onCommittedTranscript;
    onScribeError = opts.onError;
    onDisconnectHandler = opts.onDisconnect;

    return {
      connect: (...args: unknown[]) => mockConnect(...args),
      disconnect: () => {
        mockDisconnect();
        scribeStatus = "disconnected";
        scribeConnected = false;
        onDisconnectHandler?.();
      },
      get isConnected() {
        return scribeConnected;
      },
      get status() {
        return scribeStatus;
      },
    };
  },
}));

const mockPlayTtsAudio = vi.fn(() => ({ promise: Promise.resolve(), stop: vi.fn() }));
vi.mock("@/hooks/voice/playTtsAudio", () => ({
  playTtsAudio: (...args: unknown[]) => mockPlayTtsAudio(...args),
}));

const mockProcessVoiceTranscript = vi.fn();
vi.mock("@/hooks/voice/processTranscript", () => ({
  processVoiceTranscript: (...args: unknown[]) => mockProcessVoiceTranscript(...args),
}));

const mockLogVoiceCommand = vi.fn();
vi.mock("@/hooks/voice/logVoiceCommand", () => ({
  logVoiceCommand: (...args: unknown[]) => mockLogVoiceCommand(...args),
}));

import { useVoiceAgent } from "@/hooks/useVoiceAgent";

describe("useVoiceAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onSessionStarted = undefined;
    onPartialTranscript = undefined;
    onCommittedTranscript = undefined;
    onScribeError = undefined;
    onDisconnectHandler = undefined;
    scribeStatus = "disconnected";
    scribeConnected = false;
    mockConnect.mockImplementation(async () => {
      scribeStatus = "connecting";
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useVoiceAgent());
    expect(result.current.phase).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it("waits for session_started before moving to listening", async () => {
    mockInvoke.mockResolvedValueOnce({ data: { token: "test-token" }, error: null });

    const { result } = renderHook(() => useVoiceAgent());

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.phase).toBe("idle");
    expect(mockConnect).toHaveBeenCalledWith({
      token: "test-token",
      modelId: "scribe_v2_realtime",
      microphone: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    act(() => {
      scribeStatus = "connected";
      scribeConnected = true;
      onSessionStarted?.();
    });

    expect(result.current.phase).toBe("listening");
  });

  it("updates partial transcript while listening", async () => {
    mockInvoke.mockResolvedValueOnce({ data: { token: "token" }, error: null });

    const { result } = renderHook(() => useVoiceAgent());

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      scribeStatus = "connected";
      scribeConnected = true;
      onSessionStarted?.();
      onPartialTranscript?.({ text: "buscar moch" });
    });

    expect(result.current.partialTranscript).toBe("buscar moch");
    expect(result.current.phase).toBe("listening");
  });

  it("processes committed transcript and returns to idle", async () => {
    const action = {
      action: "search" as const,
      response: "Buscando canetas",
      data: { query: "canetas" },
    };

    mockInvoke.mockResolvedValueOnce({ data: { token: "token" }, error: null });
    mockProcessVoiceTranscript.mockResolvedValueOnce(action);
    const onAction = vi.fn();

    const { result } = renderHook(() => useVoiceAgent({ onAction }));

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      scribeStatus = "connected";
      scribeConnected = true;
      onSessionStarted?.();
    });

    await act(async () => {
      onCommittedTranscript?.({ text: "buscar canetas" });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockProcessVoiceTranscript).toHaveBeenCalledWith("buscar canetas");
    });

    expect(result.current.finalTranscript).toBe("buscar canetas");
    expect(result.current.agentResponse).toBe("Buscando canetas");
    expect(mockPlayTtsAudio).toHaveBeenCalledWith("Buscando canetas");
    expect(onAction).toHaveBeenCalledWith(action);
    expect(result.current.phase).toBe("idle");
  });

  it("disconnects when stopListening is called", async () => {
    mockInvoke.mockResolvedValueOnce({ data: { token: "token" }, error: null });

    const { result } = renderHook(() => useVoiceAgent());

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      result.current.stopListening();
    });

    expect(mockDisconnect).toHaveBeenCalled();
    expect(result.current.phase).toBe("idle");
  });

  it("forces disconnect after websocket-style runtime error and allows retry", async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { token: "first-token" }, error: null })
      .mockResolvedValueOnce({ data: { token: "second-token" }, error: null });

    const { result } = renderHook(() => useVoiceAgent());

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      scribeStatus = "error";
      onScribeError?.(new Error(""));
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe("error");
    expect(result.current.error).toBe("Não foi possível conectar ao serviço de voz. Tente novamente.");

    await act(async () => {
      await result.current.startListening();
    });

    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("fails fast when the session never starts", async () => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValueOnce({ data: { token: "slow-token" }, error: null });
    const onError = vi.fn();

    const { result } = renderHook(() => useVoiceAgent({ onError }));

    await act(async () => {
      await result.current.startListening();
    });

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(mockDisconnect).toHaveBeenCalled();
    expect(result.current.phase).toBe("error");
    expect(result.current.error).toBe("A conexão de voz demorou demais para responder. Tente novamente.");
    expect(onError).toHaveBeenCalledWith("A conexão de voz demorou demais para responder. Tente novamente.");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("resets error state after token failure timeout", async () => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: "fail" } });

    const { result } = renderHook(() => useVoiceAgent());

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.phase).toBe("error");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.error).toBeNull();
  });
});
