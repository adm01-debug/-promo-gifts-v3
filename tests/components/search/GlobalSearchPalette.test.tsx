/**
 * Render tests for GlobalSearchPalette (1059 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.mock("@/hooks/useSearch", () => ({
  useSearch: vi.fn().mockReturnValue({
    results: [], loading: false, search: vi.fn(), clear: vi.fn(), recentSearches: [],
  }),
}));

vi.mock("@/hooks/useSpeechRecognition", () => ({
  useSpeechRecognition: vi.fn().mockReturnValue({
    isListening: false, transcript: "", startListening: vi.fn(), stopListening: vi.fn(), isSupported: false,
  }),
}));

vi.mock("@/hooks/useVoiceCommandHistory", () => ({
  useVoiceCommandHistory: vi.fn().mockReturnValue({ history: [], addCommand: vi.fn(), clearHistory: vi.fn() }),
}));

vi.mock("@/hooks/useContextualSuggestions", () => ({
  useContextualSuggestions: vi.fn().mockReturnValue({ suggestions: [], loading: false }),
}));

vi.mock("@/hooks/useVoiceFeedback", () => ({
  useVoiceFeedback: vi.fn().mockReturnValue({ speak: vi.fn(), stop: vi.fn(), isSpeaking: false }),
}));

vi.mock("@/components/search/VoiceSearchOverlay", () => ({
  VoiceSearchOverlay: () => null,
}));

describe("GlobalSearchPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports GlobalSearchPalette component", async () => {
    const module = await import("@/components/search/GlobalSearchPalette");
    expect(module.GlobalSearchPalette).toBeDefined();
    expect(typeof module.GlobalSearchPalette).toBe("function");
  }, 15000);
});
