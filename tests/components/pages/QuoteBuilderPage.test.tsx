/**
 * Render tests for QuoteBuilderPage (1536 lines)
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
    createQuote: vi.fn().mockResolvedValue({ id: "q1" }),
    updateQuote: vi.fn(),
    deleteQuote: vi.fn(),
  }),
}));

vi.mock("@/hooks/useQuoteTemplates", () => ({
  useQuoteTemplates: vi.fn().mockReturnValue({
    templates: [],
    loading: false,
    saveTemplate: vi.fn(),
  }),
}));

vi.mock("@/lib/crm-db", () => ({
  searchCrm: vi.fn().mockResolvedValue([]),
  selectCrmById: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/contexts/FavoritesContext", () => ({
  useFavoritesContext: vi.fn().mockReturnValue({
    favorites: [],
    isFavorite: vi.fn().mockReturnValue(false),
    toggleFavorite: vi.fn(),
  }),
}));

describe("QuoteBuilderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: QuoteBuilderPage } = await import("@/pages/QuoteBuilderPage");
    renderWithProviders(<QuoteBuilderPage />);
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("renders in new quote mode", async () => {
    const { default: QuoteBuilderPage } = await import("@/pages/QuoteBuilderPage");
    renderWithProviders(<QuoteBuilderPage />, { route: "/orcamentos/novo" });
    expect(document.body).toBeTruthy();
  });
});
