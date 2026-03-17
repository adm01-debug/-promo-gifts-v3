/**
 * Render tests for GlobalCommandBar (644 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../render-helpers";
import React from "react";

describe("GlobalCommandBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { GlobalCommandBar } = await import("@/components/command/GlobalCommandBar");
    renderWithProviders(<GlobalCommandBar />);
    expect(document.body).toBeTruthy();
  });

  it("renders with showTrigger", async () => {
    const { GlobalCommandBar } = await import("@/components/command/GlobalCommandBar");
    renderWithProviders(<GlobalCommandBar showTrigger={true} />);
    expect(document.body).toBeTruthy();
  });

  it("exports useCommandBar hook", async () => {
    const { useCommandBar } = await import("@/components/command/GlobalCommandBar");
    expect(typeof useCommandBar).toBe("function");
  });
});
