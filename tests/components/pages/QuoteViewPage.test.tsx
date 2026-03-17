/**
 * Render tests for QuoteViewPage (888 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock("@/hooks/useQuotes", () => ({
  useQuotes: vi.fn().mockReturnValue({
    quotes: [],
    loading: false,
    getQuote: vi.fn().mockResolvedValue(null),
    updateQuote: vi.fn(),
  }),
}));

vi.mock("@/hooks/useQuoteApproval", () => ({
  useQuoteApproval: vi.fn().mockReturnValue({
    approvalStatus: null,
    loading: false,
    sendForApproval: vi.fn(),
  }),
}));

vi.mock("@/lib/crm-db", () => ({
  selectCrmById: vi.fn().mockResolvedValue(null),
  updateCrm: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/utils/proposalPdfReactGenerator", () => ({
  generateProposalPDFv2: vi.fn(),
  downloadPDF: vi.fn(),
}));

vi.mock("@/components/pdf/ProposalHtmlTemplate", () => ({
  ProposalHtmlTemplate: () => <div />,
  formatPaymentTerms: vi.fn().mockReturnValue("30 dias"),
  formatDeliveryTime: vi.fn().mockReturnValue("15 dias"),
}));

vi.mock("@/components/quotes/QuoteHistoryPanel", () => ({
  QuoteHistoryPanel: () => <div />,
}));

vi.mock("@/components/quotes/QuoteQRCode", () => ({
  QuoteQRCode: () => <div />,
}));

vi.mock("@/components/quotes/QuoteStatusTimeline", () => ({
  QuoteStatusTimeline: () => <div />,
}));

vi.mock("@/components/quotes/QuoteValidityBanner", () => ({
  QuoteValidityBanner: () => <div />,
}));

vi.mock("@/components/quotes/QuoteConvertToOrder", () => ({
  QuoteConvertToOrder: () => <div />,
}));

vi.mock("@/components/quotes/QuoteMobileActionBar", () => ({
  QuoteMobileActionBar: () => <div />,
}));

vi.mock("@/components/quotes/QuoteItemDetailSheet", () => ({
  QuoteItemDetailSheet: () => <div />,
}));

describe("QuoteViewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: QuoteViewPage } = await import("@/pages/QuoteViewPage");
    renderWithProviders(<QuoteViewPage />, { route: "/orcamentos/view/test-id" });
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  }, 10000);
});
