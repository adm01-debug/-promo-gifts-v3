/**
 * Tests for GlobalCommandBar (644 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: vi.fn().mockReturnValue({
    theme: "light",
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));

describe("GlobalCommandBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports GlobalCommandBar component", async () => {
    const mod = await import("@/components/command/GlobalCommandBar");
    expect(mod.GlobalCommandBar).toBeDefined();
    expect(typeof mod.GlobalCommandBar).toBe("function");
  });

  it("exports useCommandBar hook", async () => {
    const { useCommandBar } = await import("@/components/command/GlobalCommandBar");
    expect(typeof useCommandBar).toBe("function");
  });
});
