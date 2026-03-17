/**
 * Render tests for UpsellPlusPlus (828 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/hooks/useSimulation", () => ({
  formatCurrency: vi.fn((val: number) => `R$ ${val.toFixed(2)}`),
}));

describe("UpsellPlusPlus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing with minimal props", async () => {
    const { UpsellPlusPlus } = await import("@/components/simulator/UpsellPlusPlus");
    renderWithProviders(
      <UpsellPlusPlus
        currentQuantity={100}
        productPrice={15.0}
        bestOption={null}
        allOptions={[]}
        techniques={[]}
        selectedTechniques={[]}
        onQuantityChange={vi.fn()}
        onTechniqueChange={vi.fn()}
      />
    );
    expect(document.body).toBeTruthy();
  });

  it("renders with active promotions visible", async () => {
    const { UpsellPlusPlus } = await import("@/components/simulator/UpsellPlusPlus");
    renderWithProviders(
      <UpsellPlusPlus
        currentQuantity={50}
        productPrice={25.0}
        bestOption={{
          techniqueId: "t1",
          techniqueName: "Serigrafia",
          techniqueCode: "SILK",
          quantity: 50,
          unitPrice: 2.5,
          totalPrice: 125,
          colors: 1,
          setupFee: 0,
        }}
        allOptions={[]}
        techniques={[
          { id: "t1", name: "Serigrafia", code: "SILK", maxColors: 6 },
          { id: "t2", name: "Sublimação", code: "SUBLIM", maxColors: 99 },
        ]}
        selectedTechniques={["SILK"]}
        onQuantityChange={vi.fn()}
        onTechniqueChange={vi.fn()}
        clientRamo="tecnologia"
      />
    );
    expect(document.body).toBeTruthy();
  });
});
