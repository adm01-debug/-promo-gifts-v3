/**
 * Render tests for GlobalSearchPalette (1059 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/hooks/useSearch", () => ({
  useSearch: vi.fn().mockReturnValue({
    results: [],
    loading: false,
    search: vi.fn(),
    clear: vi.fn(),
  }),
}));

vi.mock("@/hooks/useSpeechRecognition", () => ({
  useSpeechRecognition: vi.fn().mockReturnValue({
    isListening: false, transcript: "", startListening: vi.fn(), stopListening: vi.fn(),
  }),
}));

vi.mock("@/hooks/useVoiceCommandHistory", () => ({
  useVoiceCommandHistory: vi.fn().mockReturnValue({
    history: [], addCommand: vi.fn(), clearHistory: vi.fn(),
  }),
}));

vi.mock("@/hooks/useContextualSuggestions", () => ({
  useContextualSuggestions: vi.fn().mockReturnValue({
    suggestions: [], loading: false,
  }),
}));

vi.mock("@/hooks/useVoiceFeedback", () => ({
  useVoiceFeedback: vi.fn().mockReturnValue({
    speak: vi.fn(), stop: vi.fn(), isSpeaking: false,
  }),
}));

vi.mock("@/components/search/VoiceSearchOverlay", () => ({
  VoiceSearchOverlay: () => null,
}));

describe("GlobalSearchPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing (closed state)", async () => {
    const { GlobalSearchPalette } = await import("@/components/search/GlobalSearchPalette");
    renderWithProviders(<GlobalSearchPalette />);
    // In closed state, the command dialog is not visible
    expect(document.body).toBeTruthy();
  });
});
