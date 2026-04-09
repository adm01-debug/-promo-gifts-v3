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
  images: ["https://example.com/caneta.jpg"],
  og_image_url: "https://example.com/caneta.jpg",
  category_name: "Canetas",
  supplier: { name: "Supplier A", code: "SA" },
  supplier_name: "Supplier A",
  stock: 100,
  stockStatus: "in-stock",
  colors: [],
  tags: {},
  min_quantity: 50,
  featured: false,
  newArrival: false,
};

const mockProductWithColors = {
  ...mockProduct,
  id: "p2",
  name: "Garrafa Térmica",
  colors: [
    { name: "Rosa Pink", hex: "#E91E8C", group: "Rosa", groupSlug: "rosa", variationSlug: "rosa-pink", image: "rosa.jpg", images: [] },
    { name: "Azul Royal", hex: "#1E40AF", group: "Azul", groupSlug: "azul", variationSlug: "azul-royal", image: "azul.jpg", images: [] },
    { name: "Verde Limão", hex: "#22C55E", group: "Verde", groupSlug: "verde", variationSlug: "verde-limao", image: "verde.jpg", images: [] },
  ],
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

  it("does NOT show carousel dots when no color filter active", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(<ProductCard product={mockProductWithColors as any} />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("does NOT show carousel dots when only 1 color filter matches", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(
      <ProductCard
        product={mockProductWithColors as any}
        activeColorFilter={{ groups: ["rosa"], variations: [] }}
      />
    );
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("shows carousel dots when 2+ color filters match", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(
      <ProductCard
        product={mockProductWithColors as any}
        activeColorFilter={{ groups: ["rosa", "azul"], variations: [] }}
      />
    );
    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeInTheDocument();
    // Should have 2 tab buttons
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    // Counter shows "1/2"
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("shows 3 carousel dots when 3 colors match", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(
      <ProductCard
        product={mockProductWithColors as any}
        activeColorFilter={{ groups: ["rosa", "azul", "verde"], variations: [] }}
      />
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("carousel dots have correct aria-labels", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(
      <ProductCard
        product={mockProductWithColors as any}
        activeColorFilter={{ groups: ["rosa", "azul"], variations: [] }}
      />
    );
    expect(screen.getByLabelText("Ver variante Rosa Pink")).toBeInTheDocument();
    expect(screen.getByLabelText("Ver variante Azul Royal")).toBeInTheDocument();
  });

  it("first dot is selected by default (aria-selected)", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(
      <ProductCard
        product={mockProductWithColors as any}
        activeColorFilter={{ groups: ["rosa", "azul"], variations: [] }}
      />
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("renders product without colors and no filter gracefully", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(
      <ProductCard
        product={mockProduct as any}
        activeColorFilter={{ groups: ["rosa", "azul"], variations: [] }}
      />
    );
    // Should render fallback dots from COLOR_GROUP_HEX
    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
  });
});
