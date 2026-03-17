/**
 * Render tests for SellerCartsPage (1686 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

// Mock heavy contexts & hooks
vi.mock("@/contexts/SellerCartContext", () => ({
  useSellerCartContext: vi.fn().mockReturnValue({
    carts: [],
    loading: false,
    createCart: vi.fn(),
    updateCart: vi.fn(),
    deleteCart: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateItem: vi.fn(),
    duplicateCart: vi.fn(),
    duplicateItem: vi.fn(),
    reorderItems: vi.fn(),
    refreshCarts: vi.fn(),
  }),
}));

vi.mock("@/contexts/ProductsContext", () => ({
  ProductsContext: {
    Consumer: ({ children }: any) => children({ products: [], loading: false }),
    Provider: ({ children }: any) => <>{children}</>,
  },
  useProductsContext: vi.fn().mockReturnValue({ products: [], loading: false }),
}));

vi.mock("@/hooks/useCartTemplates", () => ({
  useCartTemplates: vi.fn().mockReturnValue({
    templates: [],
    loading: false,
    saveTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    applyTemplate: vi.fn(),
  }),
}));

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock("@/components/cart/CartCompanyPicker", () => ({
  CartCompanyPicker: () => <div data-testid="company-picker" />,
}));

vi.mock("@/components/common/EmptyState", () => ({
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock("@/components/ui/ConfirmDialog", () => ({
  DeleteConfirmDialog: () => null,
  ConfirmDialog: () => null,
}));

describe("SellerCartsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { default: SellerCartsPage } = await import("@/pages/SellerCartsPage");
    renderWithProviders(<SellerCartsPage />);
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  }, 10000);
});
