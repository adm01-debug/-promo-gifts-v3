import { describe, it, expect } from "vitest";
import { formatCurrency, calcPersonalizationTotal } from "@/pages/public-approval/usePublicQuoteApproval";

describe("formatCurrency", () => {
  it("formats BRL currency correctly", () => {
    expect(formatCurrency(1234.56)).toBe("R$\u00a01.234,56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("R$\u00a00,00");
  });

  it("formats negative values", () => {
    expect(formatCurrency(-50)).toBe("-R$\u00a050,00");
  });
});

describe("calcPersonalizationTotal", () => {
  it("returns 0 for item without personalizations", () => {
    expect(calcPersonalizationTotal({})).toBe(0);
    expect(calcPersonalizationTotal({ personalizations: [] })).toBe(0);
  });

  it("sums total_cost from personalizations", () => {
    const item = {
      personalizations: [
        { total_cost: 10 },
        { total_cost: 25.5 },
        { total_cost: 0 },
      ],
    };
    expect(calcPersonalizationTotal(item)).toBe(35.5);
  });

  it("handles null total_cost gracefully", () => {
    const item = {
      personalizations: [
        { total_cost: null },
        { total_cost: 15 },
      ],
    };
    expect(calcPersonalizationTotal(item)).toBe(15);
  });
});
