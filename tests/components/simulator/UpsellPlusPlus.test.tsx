/**
 * Tests for UpsellPlusPlus (828 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.mock("@/hooks/useSimulation", () => ({
  formatCurrency: vi.fn((val: number) => `R$ ${val.toFixed(2)}`),
}));

describe("UpsellPlusPlus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports UpsellPlusPlus component", async () => {
    const mod = await import("@/components/simulator/UpsellPlusPlus");
    expect(mod.UpsellPlusPlus).toBeDefined();
    expect(typeof mod.UpsellPlusPlus).toBe("function");
  });
});
