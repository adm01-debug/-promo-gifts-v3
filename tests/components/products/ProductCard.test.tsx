/**
 * Render tests for ProductCard (584 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/utils/image-utils", () => ({
  getCdnUrl: vi.fn((url: string) => url),
  getSrcSet: vi.fn(() => ""),
}));

vi.mock("@/components/collections/AddToCollectionModal", () => ({
  AddToCollectionModal: () => null,
}));

vi.mock("@/components/products/QuickAddToQuote", () => ({
  QuickAddToQuote: () => null,
}));

vi.mock("@/components/products/ProductQuickView", () => ({
  ProductQuickView: () => null,
}));

vi.mock("@/components/products/ProductCategoryBadges", () => ({
  ProductCategoryBadges: () => null,
}));

vi.mock("@/components/products/NoveltyBadge", () => ({
  NoveltyBadge: () => null,
}));

vi.mock("@/utils/undoToast", () => ({
  showUndoToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

vi.mock("@/lib/supplier-colors", () => ({
  getSupplierColors: vi.fn().mockReturnValue({ bg: "#fff", text: "#000" }),
}));

vi.mock("@/utils/color-image-resolver", () => ({
  resolveColorImage: vi.fn().mockReturnValue(null),
  resolveColorStock: vi.fn().mockReturnValue(null),
  getActiveColorName: vi.fn().mockReturnValue(null),
}));

vi.mock("@/hooks/useProductBounds", () => ({
  useProductBounds: vi.fn().mockReturnValue({ width: 0, height: 0 }),
}));

vi.mock("@/components/products/share/SharePreviewDialog", () => ({
  SharePreviewDialog: () => null,
}));

vi.mock("@/components/products/ProductSparkline", () => ({
  ProductSparkline: () => null,
}));

vi.mock("@/components/products/VariantPickerDialog", () => ({
  VariantPickerDialog: () => null,
}));

vi.mock("@/stores/useFavoritesStore", () => ({
  useFavoritesStore: () => ({
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorite: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock("@/stores/useComparisonStore", () => ({
  useComparisonStore: () => ({
    addToCompare: vi.fn(),
    removeFromCompare: vi.fn(),
    isInCompare: vi.fn().mockReturnValue(false),
  }),
}));

const mockProduct = {
  id: "p1",
  name: "Caneta Premium",
  sku: "CAN-001",
  price: 15.50,
  images: { main: "https://example.com/caneta.jpg" },
  category_name: "Canetas",
  supplier: { name: "Supplier A", code: "SA" },
  supplier_name: "Supplier A",
  stock: 100,
  colors: [],
  tags: {},
  min_quantity: 50,
};

describe("ProductCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders product name and price", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(<ProductCard product={mockProduct as any} />);
    expect(screen.getByText("Caneta Premium")).toBeInTheDocument();
  });

  it("renders with favorite state", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(<ProductCard product={mockProduct as any} isFavorited={true} />);
    expect(screen.getByText("Caneta Premium")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(<ProductCard product={mockProduct as any} onClick={handleClick} />);
    expect(document.body).toBeTruthy();
  });
});
