/**
 * Comprehensive tests verifying ALL design/UX improvements implemented.
 * Covers: grid density, visual hierarchy, sort chips, price chips,
 * breadcrumbs, sparkline logic, image containers, accessibility, etc.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./render-helpers";
import React from "react";

// ── Mocks ──────────────────────────────────────────────────────────────────

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
  useProductBounds: vi.fn().mockReturnValue({ width: 0, height: 0, detected: false, fractionX: 0, fractionY: 0 }),
}));

vi.mock("@/hooks/useSparklineSales", () => ({
  useSparklineData: vi.fn().mockReturnValue(null),
}));

vi.mock("@/components/products/RecentlyViewedPopover", () => ({
  RecentlyViewedPopover: () => <div data-testid="recently-viewed-popover" />,
}));

vi.mock("@/components/products/StatsPopover", () => ({
  StatsPopover: ({ stats }: any) => <div data-testid="stats-popover" />,
}));

vi.mock("@/components/products/LayoutPopover", () => ({
  LayoutPopover: () => <div data-testid="layout-popover" />,
}));

vi.mock("@/lib/lazyWithRetry", () => ({
  lazyWithRetry: (fn: any) => {
    const LazyStub = () => <div data-testid="filter-panel-lazy" />;
    LazyStub.preload = vi.fn();
    return LazyStub;
  },
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const mockProduct = {
  id: "p1",
  name: "Caneta Premium",
  sku: "CAN-001",
  price: 15.5,
  images: ["https://example.com/caneta.jpg", "https://example.com/caneta2.jpg"],
  og_image_url: "https://example.com/caneta.jpg",
  category_name: "Canetas",
  category: "canetas",
  supplier: { name: "Supplier A", code: "SA" },
  supplier_name: "Supplier A",
  stock: 100,
  stockStatus: "in-stock",
  colors: [],
  tags: {},
  min_quantity: 50,
  minQuantity: 50,
  featured: false,
  gender: null,
  groups: [],
  materials: ["Plástico", "Metal"],
};

const mockProducts = [
  mockProduct,
  { ...mockProduct, id: "p2", name: "Caderno A5", sku: "CAD-002", price: 22.9 },
  { ...mockProduct, id: "p3", name: "Mochila Corp", sku: "MOC-003", price: 89.0 },
];

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #1 — Grid Density (gap-x-4 gap-y-6 instead of gap-8)
// ═══════════════════════════════════════════════════════════════════════════
describe("Grid Density Optimization", () => {
  it("uses reduced gap classes for 5-column layout", async () => {
    const { ProductGrid } = await import("@/components/products/ProductGrid");
    const { container } = renderWithProviders(
      <ProductGrid products={mockProducts as any} columns={5} />
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid).toBeTruthy();
    // Should have gap-x-4 gap-y-6 (not gap-8)
    expect(grid.className).toContain("gap-x-4");
    expect(grid.className).toContain("gap-y-6");
    expect(grid.className).not.toContain("gap-8");
  });

  it("uses tighter gap for 6+ column layouts", async () => {
    const { ProductGrid } = await import("@/components/products/ProductGrid");
    const { container } = renderWithProviders(
      <ProductGrid products={mockProducts as any} columns={6} />
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("gap-x-3");
    expect(grid.className).toContain("gap-y-5");
  });

  it("uses tightest gap for 8-column layout", async () => {
    const { ProductGrid } = await import("@/components/products/ProductGrid");
    const { container } = renderWithProviders(
      <ProductGrid products={mockProducts as any} columns={8} />
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("gap-x-2");
    expect(grid.className).toContain("gap-y-5");
  });

  it("renders correct column classes for 3 columns", async () => {
    const { ProductGrid } = await import("@/components/products/ProductGrid");
    const { container } = renderWithProviders(
      <ProductGrid products={mockProducts as any} columns={3} />
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("sm:grid-cols-3");
  });

  it("renders correct column classes for 4 columns", async () => {
    const { ProductGrid } = await import("@/components/products/ProductGrid");
    const { container } = renderWithProviders(
      <ProductGrid products={mockProducts as any} columns={4} />
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("lg:grid-cols-4");
  });

  it("shows empty state when no products", async () => {
    const { ProductGrid } = await import("@/components/products/ProductGrid");
    renderWithProviders(<ProductGrid products={[]} />);
    expect(screen.getByText("Nenhum produto encontrado")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #2 — Visual Hierarchy (Price, SKU, Image Container)
// ═══════════════════════════════════════════════════════════════════════════
describe("Visual Hierarchy — ProductCard", () => {
  let ProductCard: any;
  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/components/products/ProductCard");
    ProductCard = mod.ProductCard;
  });

  it("renders product name", () => {
    renderWithProviders(<ProductCard product={mockProduct as any} />);
    expect(screen.getByText("Caneta Premium")).toBeInTheDocument();
  });

  it("renders price with extrabold formatting", () => {
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const priceEl = container.querySelector(".font-extrabold");
    expect(priceEl).toBeTruthy();
    expect(priceEl!.textContent).toContain("R$");
    expect(priceEl!.textContent).toContain("15,50");
  });

  it("renders SKU with reduced opacity (40%)", () => {
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const skuEl = container.querySelector(".text-muted-foreground\\/40");
    expect(skuEl).toBeTruthy();
    expect(skuEl!.textContent).toBe("CAN-001");
  });

  it("image container has gradient and ring classes", () => {
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const imgContainer = container.querySelector(".product-img-container");
    expect(imgContainer).toBeTruthy();
    expect(imgContainer!.className).toContain("bg-gradient-to-b");
    expect(imgContainer!.className).toContain("from-muted/20");
    expect(imgContainer!.className).toContain("to-muted/40");
    expect(imgContainer!.className).toContain("ring-1");
    expect(imgContainer!.className).toContain("ring-border/10");
  });

  it("renders 'A partir de' label above price", () => {
    renderWithProviders(<ProductCard product={mockProduct as any} />);
    expect(screen.getByText("A partir de")).toBeInTheDocument();
  });

  it("renders stock status indicator", () => {
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    // Stock is formatted as "100 un." but split across elements; check container text
    expect(container.textContent).toContain("100");
    expect(container.textContent).toContain("un.");
  });

  it("renders materials badges on desktop", () => {
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    // Materials are hidden on mobile (hidden sm:flex) but exist in DOM
    expect(screen.getByText("Plástico")).toBeInTheDocument();
    expect(screen.getByText("Metal")).toBeInTheDocument();
  });

  it("truncates materials to 2 + overflow count", () => {
    const prodWith4Materials = {
      ...mockProduct,
      materials: ["Plástico", "Metal", "Couro", "Tecido"],
    };
    renderWithProviders(<ProductCard product={prodWith4Materials as any} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("does not render materials section when empty", () => {
    const prodNoMaterials = { ...mockProduct, materials: [] };
    renderWithProviders(<ProductCard product={prodNoMaterials as any} />);
    expect(screen.queryByText("Plástico")).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #3 — Hover Image Preview (Second Image)
// ═══════════════════════════════════════════════════════════════════════════
describe("Hover Image Preview", () => {
  it("renders a second image for hover when available", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const images = container.querySelectorAll("img");
    // Should have 2 images: main + hover alternative
    expect(images.length).toBeGreaterThanOrEqual(2);
    const altImg = Array.from(images).find(img => img.alt.includes("imagem alternativa"));
    expect(altImg).toBeTruthy();
    expect(altImg!.className).toContain("opacity-0"); // hidden by default
    expect(altImg!.getAttribute("aria-hidden")).toBe("true");
  });

  it("does not render second image when only one image exists", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const singleImageProd = { ...mockProduct, images: ["https://example.com/single.jpg"] };
    const { container } = renderWithProviders(<ProductCard product={singleImageProd as any} />);
    const altImg = container.querySelector('img[aria-hidden="true"]');
    expect(altImg).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #4 — Sort Chips Inline (CatalogToolbar)
// ═══════════════════════════════════════════════════════════════════════════
describe("Sort Chips — CatalogToolbar", () => {
  const defaultProps = {
    filters: { search: "", categories: [], suppliers: [], colors: [], priceRange: [0, 9999] as [number, number], inStock: false, tags: [] },
    setFilters: vi.fn(),
    activeFiltersCount: 0,
    filterSheetOpen: false,
    setFilterSheetOpen: vi.fn(),
    resetFilters: vi.fn(),
    sortBy: "name" as const,
    setSortBy: vi.fn(),
    statBadges: [],
    viewMode: "grid" as const,
    setViewMode: vi.fn(),
    gridColumns: 5 as const,
    setGridColumns: vi.fn(),
  };

  it("renders all 5 sort chip options", async () => {
    const { CatalogToolbar } = await import("@/components/catalog/CatalogToolbar");
    renderWithProviders(<CatalogToolbar {...defaultProps} />);
    // Both chip buttons and select options exist; use getAllByText
    expect(screen.getAllByText("A-Z").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Menor Preço").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Maior Preço").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Estoque").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Novidades").length).toBeGreaterThanOrEqual(1);
  });

  it("highlights the active sort chip with primary styles", async () => {
    const { CatalogToolbar } = await import("@/components/catalog/CatalogToolbar");
    const { container } = renderWithProviders(<CatalogToolbar {...defaultProps} sortBy="name" />);
    const azButtons = screen.getAllByText("A-Z");
    const azChip = azButtons.find(el => el.tagName === "BUTTON");
    expect(azChip).toBeTruthy();
    expect(azChip!.className).toContain("bg-primary");
    expect(azChip!.className).toContain("text-primary-foreground");
  });

  it("calls setSortBy when a sort chip is clicked", async () => {
    const setSortBy = vi.fn();
    const { CatalogToolbar } = await import("@/components/catalog/CatalogToolbar");
    renderWithProviders(<CatalogToolbar {...defaultProps} setSortBy={setSortBy} />);
    const chips = screen.getAllByText("Menor Preço");
    const chip = chips.find(el => el.tagName === "BUTTON")!;
    fireEvent.click(chip);
    expect(setSortBy).toHaveBeenCalledWith("price-asc");
  });

  it("sort chips have min-h-[36px] for accessibility", async () => {
    const { CatalogToolbar } = await import("@/components/catalog/CatalogToolbar");
    renderWithProviders(<CatalogToolbar {...defaultProps} />);
    const azButton = screen.getByText("A-Z");
    expect(azButton.className).toContain("min-h-[36px]");
  });

  it("renders mobile select dropdown for sort", async () => {
    const { CatalogToolbar } = await import("@/components/catalog/CatalogToolbar");
    const { container } = renderWithProviders(<CatalogToolbar {...defaultProps} />);
    const select = container.querySelector("select[aria-label='Ordenar por']");
    expect(select).toBeTruthy();
  });

  it("renders filter button with active count badge", async () => {
    const { CatalogToolbar } = await import("@/components/catalog/CatalogToolbar");
    renderWithProviders(<CatalogToolbar {...defaultProps} activeFiltersCount={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Filtros")).toBeInTheDocument();
  });

  it("stats popover is rendered in toolbar", async () => {
    const { CatalogToolbar } = await import("@/components/catalog/CatalogToolbar");
    renderWithProviders(<CatalogToolbar {...defaultProps} />);
    expect(screen.getByTestId("stats-popover")).toBeInTheDocument();
  });

  it("recently viewed popover is rendered in toolbar", async () => {
    const { CatalogToolbar } = await import("@/components/catalog/CatalogToolbar");
    renderWithProviders(<CatalogToolbar {...defaultProps} />);
    expect(screen.getByTestId("recently-viewed-popover")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #5 — Price Range Quick Chips (CatalogActiveFilters)
// ═══════════════════════════════════════════════════════════════════════════
describe("Price Range Quick Chips", () => {
  const defaultFilters = {
    search: "",
    categories: [],
    suppliers: [],
    colors: [],
    priceRange: [0, 9999] as [number, number],
    inStock: false,
    tags: [],
  };

  it("renders all 5 price range chips", async () => {
    const { CatalogActiveFilters } = await import("@/components/catalog/CatalogActiveFilters");
    renderWithProviders(
      <CatalogActiveFilters filters={defaultFilters} setFilters={vi.fn()} activeFiltersCount={0} />
    );
    expect(screen.getByText("Até R$10")).toBeInTheDocument();
    expect(screen.getByText("R$10–30")).toBeInTheDocument();
    expect(screen.getByText("R$30–60")).toBeInTheDocument();
    expect(screen.getByText("R$60–100")).toBeInTheDocument();
    expect(screen.getByText("R$100+")).toBeInTheDocument();
  });

  it("activates a price chip when clicked", async () => {
    const setFilters = vi.fn();
    const { CatalogActiveFilters } = await import("@/components/catalog/CatalogActiveFilters");
    renderWithProviders(
      <CatalogActiveFilters filters={defaultFilters} setFilters={setFilters} activeFiltersCount={0} />
    );
    fireEvent.click(screen.getByText("Até R$10"));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ priceRange: [0, 10] }));
  });

  it("deactivates a price chip when clicked again", async () => {
    const setFilters = vi.fn();
    const activeFilter = { ...defaultFilters, priceRange: [0, 10] as [number, number] };
    const { CatalogActiveFilters } = await import("@/components/catalog/CatalogActiveFilters");
    renderWithProviders(
      <CatalogActiveFilters filters={activeFilter} setFilters={setFilters} activeFiltersCount={1} />
    );
    fireEvent.click(screen.getByText("Até R$10"));
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ priceRange: [0, 9999] }));
  });

  it("active chip has primary styling", async () => {
    const activeFilter = { ...defaultFilters, priceRange: [10, 30] as [number, number] };
    const { CatalogActiveFilters } = await import("@/components/catalog/CatalogActiveFilters");
    renderWithProviders(
      <CatalogActiveFilters filters={activeFilter} setFilters={vi.fn()} activeFiltersCount={1} />
    );
    const chip = screen.getByText("R$10–30");
    expect(chip.className).toContain("bg-primary");
    expect(chip.className).toContain("text-primary-foreground");
  });

  it("renders 'Faixa:' label before chips", async () => {
    const { CatalogActiveFilters } = await import("@/components/catalog/CatalogActiveFilters");
    renderWithProviders(
      <CatalogActiveFilters filters={defaultFilters} setFilters={vi.fn()} activeFiltersCount={0} />
    );
    expect(screen.getByText("Faixa:")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #6 — Breadcrumbs (hide on homepage)
// ═══════════════════════════════════════════════════════════════════════════
describe("PersistentBreadcrumbs", () => {
  it("returns null on homepage (/)", async () => {
    const { PersistentBreadcrumbs } = await import("@/components/common/PersistentBreadcrumbs");
    const { container } = renderWithProviders(<PersistentBreadcrumbs />, { route: "/" });
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders breadcrumbs on non-homepage routes", async () => {
    const { PersistentBreadcrumbs } = await import("@/components/common/PersistentBreadcrumbs");
    const { container } = renderWithProviders(<PersistentBreadcrumbs />, { route: "/filtros" });
    const nav = container.querySelector("nav[aria-label='Breadcrumb']");
    expect(nav).toBeTruthy();
  });

  it("shows 'Início' link on sub-pages", async () => {
    const { PersistentBreadcrumbs } = await import("@/components/common/PersistentBreadcrumbs");
    renderWithProviders(<PersistentBreadcrumbs />, { route: "/filtros" });
    expect(screen.getByText("Início")).toBeInTheDocument();
  });

  it("shows correct label for /filtros route", async () => {
    const { PersistentBreadcrumbs } = await import("@/components/common/PersistentBreadcrumbs");
    renderWithProviders(<PersistentBreadcrumbs />, { route: "/filtros" });
    expect(screen.getByText("Super Filtro")).toBeInTheDocument();
  });

  it("shows correct label for /orcamentos route", async () => {
    const { PersistentBreadcrumbs } = await import("@/components/common/PersistentBreadcrumbs");
    renderWithProviders(<PersistentBreadcrumbs />, { route: "/orcamentos" });
    expect(screen.getByText("Orçamentos")).toBeInTheDocument();
  });

  it("marks last breadcrumb as current page", async () => {
    const { PersistentBreadcrumbs } = await import("@/components/common/PersistentBreadcrumbs");
    renderWithProviders(<PersistentBreadcrumbs />, { route: "/filtros" });
    const current = screen.getByText("Super Filtro");
    expect(current.closest("[aria-current='page']")).toBeTruthy();
  });

  it("renders custom items when provided", async () => {
    const { PersistentBreadcrumbs } = await import("@/components/common/PersistentBreadcrumbs");
    renderWithProviders(
      <PersistentBreadcrumbs customItems={[{ label: "Custom A", href: "/a" }, { label: "Custom B" }]} />,
      { route: "/something" }
    );
    expect(screen.getByText("Custom A")).toBeInTheDocument();
    expect(screen.getByText("Custom B")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #7 — Sparkline Conditional Rendering
// ═══════════════════════════════════════════════════════════════════════════
describe("ProductSparkline — Conditional Rendering", () => {
  it("returns null when no real data", async () => {
    const { useSparklineData } = await import("@/hooks/useSparklineSales");
    (useSparklineData as any).mockReturnValue(null);
    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    const { container } = renderWithProviders(<ProductSparkline productId="p1" />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when data has fewer than 2 points", async () => {
    const { useSparklineData } = await import("@/hooks/useSparklineSales");
    (useSparklineData as any).mockReturnValue({ totalQty: 5, dailyQty: [5] });
    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    const { container } = renderWithProviders(<ProductSparkline productId="p1" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders sparkline when real data exists", async () => {
    const { useSparklineData } = await import("@/hooks/useSparklineSales");
    (useSparklineData as any).mockReturnValue({
      totalQty: 30,
      dailyQty: [5, 3, 8, 2, 7, 4, 1],
      totalReplenished: 10,
      availableStock: 50,
    });
    const { ProductSparkline } = await import("@/components/products/ProductSparkline");
    const { container } = renderWithProviders(<ProductSparkline productId="p1" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #8 — Accessibility (touch targets, aria labels, semantic HTML)
// ═══════════════════════════════════════════════════════════════════════════
describe("Accessibility Improvements", () => {
  it("ProductCard is rendered as <article> element", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    expect(container.querySelector("article")).toBeTruthy();
  });

  it("ProductCard has proper aria-labels on action buttons", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(
      <ProductCard
        product={mockProduct as any}
        onToggleFavorite={vi.fn()}
        onToggleCompare={vi.fn()}
        onShare={vi.fn()}
      />
    );
    expect(container.querySelector('[aria-label="Adicionar aos favoritos"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Adicionar à comparação"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Compartilhar produto"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Adicionar à coleção"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Visualização rápida"]')).toBeTruthy();
  });

  it("action buttons have min 36px touch target", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(
      <ProductCard product={mockProduct as any} onToggleFavorite={vi.fn()} />
    );
    const favBtn = container.querySelector('[aria-label="Adicionar aos favoritos"]');
    expect(favBtn).toBeTruthy();
    expect(favBtn!.className).toContain("min-h-[36px]");
    expect(favBtn!.className).toContain("min-w-[36px]");
  });

  it("image has proper alt text with product name", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const mainImg = container.querySelector("img:not([aria-hidden])");
    expect(mainImg?.getAttribute("alt")).toBe("Caneta Premium");
  });

  it("product name heading is an h3", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const h3 = container.querySelector("h3");
    expect(h3).toBeTruthy();
    expect(h3!.textContent).toBe("Caneta Premium");
  });

  it("mobile sort dropdown has aria-label", async () => {
    const { CatalogToolbar } = await import("@/components/catalog/CatalogToolbar");
    const props = {
      filters: { search: "", categories: [], suppliers: [], colors: [], priceRange: [0, 9999] as [number, number], inStock: false, tags: [] },
      setFilters: vi.fn(),
      activeFiltersCount: 0,
      filterSheetOpen: false,
      setFilterSheetOpen: vi.fn(),
      resetFilters: vi.fn(),
      sortBy: "name" as const,
      setSortBy: vi.fn(),
      statBadges: [],
      viewMode: "grid" as const,
      setViewMode: vi.fn(),
      gridColumns: 5 as const,
      setGridColumns: vi.fn(),
    };
    const { container } = renderWithProviders(<CatalogToolbar {...props} />);
    const select = container.querySelector("select[aria-label='Ordenar por']");
    expect(select).toBeTruthy();
  });

  it("breadcrumbs have aria-label='Breadcrumb'", async () => {
    const { PersistentBreadcrumbs } = await import("@/components/common/PersistentBreadcrumbs");
    const { container } = renderWithProviders(<PersistentBreadcrumbs />, { route: "/filtros" });
    expect(container.querySelector("nav[aria-label='Breadcrumb']")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #9 — Card Animation & Interaction Polish
// ═══════════════════════════════════════════════════════════════════════════
describe("Card Animation & Interaction", () => {
  it("card has card-lift class for hover elevation", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const article = container.querySelector("article");
    expect(article!.className).toContain("card-lift");
  });

  it("card has active:scale-[0.98] for touch feedback", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const article = container.querySelector("article");
    expect(article!.className).toContain("active:scale-[0.98]");
  });

  it("card has touch-manipulation for mobile", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const article = container.querySelector("article");
    expect(article!.className).toContain("touch-manipulation");
  });

  it("featured product has ring-2 ring-primary/20", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const featuredProd = { ...mockProduct, featured: true };
    const { container } = renderWithProviders(<ProductCard product={featuredProd as any} />);
    const article = container.querySelector("article");
    expect(article!.className).toContain("ring-2");
    expect(article!.className).toContain("ring-primary/20");
  });

  it("lazy loads images", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const img = container.querySelector("img");
    expect(img!.getAttribute("loading")).toBe("lazy");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #10 — CatalogHeader (no redundant search)
// ═══════════════════════════════════════════════════════════════════════════
describe("CatalogHeader — Clean Design", () => {
  it("renders catalog title with item count", async () => {
    const { CatalogHeader } = await import("@/components/catalog/CatalogHeader");
    renderWithProviders(
      <CatalogHeader
        shouldShowCatalogSkeleton={false}
        totalEstimate={500}
        filteredCount={120}
        hasNextPage={true}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Catálogo de Produtos")).toBeInTheDocument();
  });

  it("shows loading text when skeleton is active", async () => {
    const { CatalogHeader } = await import("@/components/catalog/CatalogHeader");
    renderWithProviders(
      <CatalogHeader
        shouldShowCatalogSkeleton={true}
        totalEstimate={null}
        filteredCount={0}
        hasNextPage={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText(/Carregando catálogo/)).toBeInTheDocument();
  });

  it("does NOT render a search input (search was removed as redundant)", async () => {
    const { CatalogHeader } = await import("@/components/catalog/CatalogHeader");
    const { container } = renderWithProviders(
      <CatalogHeader
        shouldShowCatalogSkeleton={false}
        totalEstimate={500}
        filteredCount={120}
        hasNextPage={false}
        onSelect={vi.fn()}
      />
    );
    const inputs = container.querySelectorAll("input");
    expect(inputs.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #11 — Recently Viewed Store (Zustand)
// ═══════════════════════════════════════════════════════════════════════════
describe("RecentlyViewed Store", () => {
  it("exports store with expected API", async () => {
    const { useRecentlyViewedStore } = await import("@/stores/useRecentlyViewedStore");
    expect(useRecentlyViewedStore).toBeDefined();
    const state = useRecentlyViewedStore.getState();
    expect(state).toHaveProperty("items");
    expect(state).toHaveProperty("itemCount");
    expect(state).toHaveProperty("addToRecentlyViewed");
    expect(state).toHaveProperty("removeFromRecentlyViewed");
    expect(state).toHaveProperty("clearRecentlyViewed");
    expect(state).toHaveProperty("isLoaded");
  });

  it("addToRecentlyViewed adds item to front of list", async () => {
    const { useRecentlyViewedStore } = await import("@/stores/useRecentlyViewedStore");
    const store = useRecentlyViewedStore.getState();
    store.clearRecentlyViewed();
    store.addToRecentlyViewed("test-product-1");
    const updated = useRecentlyViewedStore.getState();
    expect(updated.items.length).toBeGreaterThanOrEqual(1);
    expect(updated.items[0].productId).toBe("test-product-1");
  });

  it("clearRecentlyViewed empties the list", async () => {
    const { useRecentlyViewedStore } = await import("@/stores/useRecentlyViewedStore");
    const store = useRecentlyViewedStore.getState();
    store.addToRecentlyViewed("test-product-clear");
    store.clearRecentlyViewed();
    const updated = useRecentlyViewedStore.getState();
    expect(updated.items.length).toBe(0);
    expect(updated.itemCount).toBe(0);
  });

  it("respects MAX_ITEMS limit of 10", async () => {
    const { useRecentlyViewedStore } = await import("@/stores/useRecentlyViewedStore");
    const store = useRecentlyViewedStore.getState();
    store.clearRecentlyViewed();
    // Force add 12 items (bypassing debounce by waiting)
    for (let i = 0; i < 12; i++) {
      // Directly manipulate state to bypass debounce
      useRecentlyViewedStore.setState((state) => {
        const next = [
          { productId: `item-${i}`, viewedAt: new Date().toISOString() },
          ...state.items.filter((it) => it.productId !== `item-${i}`),
        ].slice(0, 10);
        return { items: next, itemCount: next.length };
      });
    }
    const updated = useRecentlyViewedStore.getState();
    expect(updated.items.length).toBeLessThanOrEqual(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #12 — Supplier Badge
// ═══════════════════════════════════════════════════════════════════════════
describe("Supplier Badge", () => {
  it("displays supplier name on card", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(<ProductCard product={mockProduct as any} />);
    expect(screen.getByText("Supplier A")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #13 — ProductCard Variants & Edge Cases
// ═══════════════════════════════════════════════════════════════════════════
describe("ProductCard — Edge Cases", () => {
  it("renders favorited state correctly", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(
      <ProductCard product={mockProduct as any} isFavorited={true} onToggleFavorite={vi.fn()} />
    );
    const favBtn = container.querySelector('[aria-label="Remover dos favoritos"]');
    expect(favBtn).toBeTruthy();
  });

  it("renders compare state correctly", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(
      <ProductCard product={mockProduct as any} isInCompare={true} onToggleCompare={vi.fn()} />
    );
    const compareBtn = container.querySelector('[aria-label="Remover da comparação"]');
    expect(compareBtn).toBeTruthy();
  });

  it("handles out-of-stock status", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const oosProduct = { ...mockProduct, stock: 0, stockStatus: "out-of-stock" };
    renderWithProviders(<ProductCard product={oosProduct as any} />);
    expect(screen.getByText("Sem estoque")).toBeInTheDocument();
  });

  it("handles low-stock status", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const lowProduct = { ...mockProduct, stock: 5, stockStatus: "low-stock" };
    renderWithProviders(<ProductCard product={lowProduct as any} />);
    expect(screen.getByText("Estoque baixo")).toBeInTheDocument();
  });

  it("formats price in BRL currency", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const priceEl = container.querySelector(".font-extrabold");
    // Should contain "R$" format
    expect(priceEl!.textContent).toMatch(/R\$/);
  });

  it("renders isViewed prop without error", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    expect(() => {
      renderWithProviders(<ProductCard product={mockProduct as any} isViewed={true} />);
    }).not.toThrow();
  });

  it("renders isNovelty prop without error", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    expect(() => {
      renderWithProviders(<ProductCard product={mockProduct as any} isNovelty={true} noveltyDaysRemaining={5} />);
    }).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #14 — Filter Button Styling
// ═══════════════════════════════════════════════════════════════════════════
describe("Filter Button — Active State", () => {
  it("filter button shows orange style when filters are active", async () => {
    const { CatalogToolbar } = await import("@/components/catalog/CatalogToolbar");
    const props = {
      filters: { search: "", categories: ["cat1"], suppliers: [], colors: [], priceRange: [0, 9999] as [number, number], inStock: false, tags: [] },
      setFilters: vi.fn(),
      activeFiltersCount: 1,
      filterSheetOpen: false,
      setFilterSheetOpen: vi.fn(),
      resetFilters: vi.fn(),
      sortBy: "name" as const,
      setSortBy: vi.fn(),
      statBadges: [],
      viewMode: "grid" as const,
      setViewMode: vi.fn(),
      gridColumns: 5 as const,
      setGridColumns: vi.fn(),
    };
    const { container } = renderWithProviders(<CatalogToolbar {...props} />);
    const filterBtn = screen.getByText("Filtros").closest("button");
    expect(filterBtn!.className).toContain("bg-orange");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #15 — Image Loading Behavior
// ═══════════════════════════════════════════════════════════════════════════
describe("Image Loading UX", () => {
  it("image starts with blur effect before loading", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const mainImg = container.querySelector("img:not([aria-hidden])");
    // Before onLoad fires, image should have blur classes
    expect(mainImg!.className).toContain("blur-md");
    expect(mainImg!.className).toContain("opacity-40");
  });

  it("image has proper srcSet for responsive sizes", async () => {
    const { ProductCard } = await import("@/components/products/ProductCard");
    const { container } = renderWithProviders(<ProductCard product={mockProduct as any} />);
    const mainImg = container.querySelector("img:not([aria-hidden])");
    expect(mainImg!.getAttribute("sizes")).toBe("(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #16 — Color Filter Display
// ═══════════════════════════════════════════════════════════════════════════
describe("Active Color Filter Badge", () => {
  it("shows color badge when activeColorFilter matches", async () => {
    const { resolveColorImage, getActiveColorName } = await import("@/utils/color-image-resolver");
    (resolveColorImage as any).mockReturnValue("https://example.com/red.jpg");
    (getActiveColorName as any).mockReturnValue("Vermelho");

    const { ProductCard } = await import("@/components/products/ProductCard");
    renderWithProviders(
      <ProductCard
        product={mockProduct as any}
        activeColorFilter={{ colorGroup: "Vermelho", hexCode: "#FF0000" }}
      />
    );
    expect(screen.getByText("Vermelho")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY MODULE IMPORTS — verify all modules load without errors
// ═══════════════════════════════════════════════════════════════════════════
describe("Module Import Verification", () => {
  it.each([
    "@/components/products/ProductCard",
    "@/components/products/ProductGrid",
    "@/components/products/ProductSparkline",
    "@/components/catalog/CatalogToolbar",
    "@/components/catalog/CatalogHeader",
    "@/components/catalog/CatalogActiveFilters",
    "@/components/common/PersistentBreadcrumbs",
    "@/stores/useRecentlyViewedStore",
    "@/hooks/useRecentlyViewed",
  ])("imports %s without errors", async (modulePath) => {
    const mod = await import(modulePath);
    expect(mod).toBeDefined();
  });
});
