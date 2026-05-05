
import { renderHook, act } from "@testing-library/react";
import { useCatalogState } from "../useCatalogState";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";

// Mock do Toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock do BroadcastChannel
const postMessageMock = vi.fn();
const closeMock = vi.fn();
const onmessageSetter = vi.fn();

class MockBroadcastChannel {
  name: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  constructor(name: string) {
    this.name = name;
  }
  postMessage = postMessageMock;
  close = closeMock;
}

global.BroadcastChannel = MockBroadcastChannel as any;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </QueryClientProvider>
);

describe("useCatalogState - BroadcastChannel Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simular que o BroadcastChannel funciona
    Object.defineProperty(MockBroadcastChannel.prototype, 'onmessage', {
      set: onmessageSetter,
      configurable: true
    });
  });

  it("deve atualizar o estado quando receber PRESET_APPLIED via BroadcastChannel", async () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });

    // Encontrar o listener registrado
    const onMessageCallback = onmessageSetter.mock.calls.find(call => typeof call[0] === 'function')?.[0];
    
    if (!onMessageCallback) {
      // Tentar uma abordagem alternativa se o setter não foi capturado (depende da implementação do hook)
      // Em useCatalogState.ts, channel.onmessage = (event) => ...
    }

    const mockPresetId = "test-preset-123";
    const mockFilters = {
      colors: ["#FF0000"],
      categories: [1],
      priceRange: [0, 500],
      inStock: true,
      isKit: false,
      featured: false,
      suppliers: [],
      publicoAlvo: [],
      datasComemorativas: [],
      endomarketing: [],
      materiais: [],
    };

    await act(async () => {
      // Simulando o evento do BroadcastChannel
      // @ts-ignore - simulando o evento que o hook espera
      onMessageCallback({
        data: {
          type: 'PRESET_APPLIED',
          presetId: mockPresetId,
          filters: mockFilters
        }
      });
    });

    expect(result.current.activePresetId).toBe(mockPresetId);
    expect(result.current.filters.colors).toContain("#FF0000");
    expect(result.current.filters.inStock).toBe(true);
  });

  it("deve enviar mensagem para o BroadcastChannel ao aplicar um preset manualmente", () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });

    const mockFilters = { ...result.current.filters, inStock: !result.current.filters.inStock };
    const mockPresetId = "manual-preset";

    act(() => {
      result.current.setFiltersWithPreset(mockFilters, mockPresetId);
    });

    expect(postMessageMock).toHaveBeenCalledWith({
      type: 'PRESET_APPLIED',
      presetId: mockPresetId,
      filters: mockFilters
    });
  });
});
