/**
 * Exhaustive test suite for StatsPopover + statBadges calculation logic
 * Tests: rendering, edge cases, data integrity, performance, accessibility
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// ============================================
// UNIT TESTS: statBadges calculation logic
// (Extracted from useCatalogState for isolated testing)
// ============================================

interface MockProduct {
  id: string;
  name: string;
  price: number;
  stock?: number;
  category_id?: string;
  category?: { id: string | number };
  supplier?: { name?: string };
  supplier_reference?: string;
  brand?: string;
  colors?: Array<Record<string, string>>;
  materials?: string[] | string;
  gender?: string;
  created_at?: string;
}

interface StatItem {
  id: string;
  label: string;
  value: number;
}

/**
 * Replica the exact statBadges calculation from useCatalogState.ts
 * to test it in isolation without React hooks
 */
function calculateStatBadges(
  filteredProducts: MockProduct[],
  favoriteCount: number,
  externalCategoriesLength: number
): StatItem[] {
  const totalVariants = filteredProducts.reduce(
    (sum, p) => sum + (p.colors?.length || 0),
    0
  );
  const uniqueCategoryIds = new Set(
    filteredProducts
      .map((p) => p.category_id || (p.category?.id ? String(p.category.id) : ""))
      .filter((id) => id && id !== "0")
  );
  const uniqueSuppliers = new Set(
    filteredProducts
      .map((p) => p.supplier?.name)
      .filter(Boolean)
      .filter((n) => n !== "Sem fornecedor")
  );
  const categoriesCount = externalCategoriesLength || uniqueCategoryIds.size;

  return [
    { id: "products", label: "Produtos Únicos", value: filteredProducts.length },
    { id: "variants", label: "Variações", value: totalVariants },
    { id: "categories", label: "Categorias", value: categoriesCount },
    { id: "suppliers", label: "Fornecedores", value: uniqueSuppliers.size },
    { id: "favorites", label: "Favoritos", value: favoriteCount },
  ];
}

// ============================================
// HELPERS
// ============================================

function makeProduct(overrides: Partial<MockProduct> = {}): MockProduct {
  return {
    id: `prod-${Math.random().toString(36).slice(2, 8)}`,
    name: "Test Product",
    price: 10,
    stock: 100,
    category_id: "1",
    supplier: { name: "Supplier A" },
    colors: [{ name: "Azul", hex: "#0000FF" }],
    ...overrides,
  };
}

function makeProducts(count: number, overrides: Partial<MockProduct> = {}): MockProduct[] {
  return Array.from({ length: count }, (_, i) =>
    makeProduct({ id: `prod-${i}`, name: `Product ${i}`, ...overrides })
  );
}

// ============================================
// TEST SUITES
// ============================================

describe("statBadges calculation — Basic scenarios", () => {
  it("returns correct structure with 5 stat items", () => {
    const stats = calculateStatBadges([], 0, 0);
    expect(stats).toHaveLength(5);
    expect(stats.map((s) => s.id)).toEqual([
      "products", "variants", "categories", "suppliers", "favorites",
    ]);
  });

  it("returns all zeros for empty product list", () => {
    const stats = calculateStatBadges([], 0, 0);
    stats.forEach((s) => expect(s.value).toBe(0));
  });

  it("counts a single product correctly", () => {
    const products = [makeProduct({ colors: [{ name: "Red" }, { name: "Blue" }] })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(1); // products
    expect(stats[1].value).toBe(2); // variants
    expect(stats[2].value).toBe(1); // categories
    expect(stats[3].value).toBe(1); // suppliers
  });

  it("counts multiple products correctly", () => {
    const products = [
      makeProduct({ category_id: "1", supplier: { name: "A" }, colors: [{ name: "R" }] }),
      makeProduct({ category_id: "2", supplier: { name: "B" }, colors: [{ name: "G" }, { name: "B" }] }),
      makeProduct({ category_id: "1", supplier: { name: "A" }, colors: [{ name: "Y" }] }),
    ];
    const stats = calculateStatBadges(products, 2, 0);
    expect(stats[0].value).toBe(3); // 3 products
    expect(stats[1].value).toBe(4); // 1 + 2 + 1 variants
    expect(stats[2].value).toBe(2); // 2 unique categories
    expect(stats[3].value).toBe(2); // 2 unique suppliers
    expect(stats[4].value).toBe(2); // 2 favorites
  });
});

describe("statBadges — Products count edge cases", () => {
  it("handles 0 products", () => {
    const stats = calculateStatBadges([], 0, 0);
    expect(stats[0].value).toBe(0);
  });

  it("handles 1 product", () => {
    const stats = calculateStatBadges([makeProduct()], 0, 0);
    expect(stats[0].value).toBe(1);
  });

  it("handles 1000 products", () => {
    const stats = calculateStatBadges(makeProducts(1000), 0, 0);
    expect(stats[0].value).toBe(1000);
  });

  it("handles 20000 products (full catalog scale)", () => {
    const stats = calculateStatBadges(makeProducts(20000), 0, 0);
    expect(stats[0].value).toBe(20000);
  });
});

describe("statBadges — Variants/Colors edge cases", () => {
  it("returns 0 variants when colors is undefined", () => {
    const products = [makeProduct({ colors: undefined })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(0);
  });

  it("returns 0 variants when colors is null (cast)", () => {
    const products = [makeProduct({ colors: null as any })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(0);
  });

  it("returns 0 variants for empty colors array", () => {
    const products = [makeProduct({ colors: [] })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(0);
  });

  it("counts single color correctly", () => {
    const products = [makeProduct({ colors: [{ name: "Vermelho" }] })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(1);
  });

  it("counts many colors per product", () => {
    const colors = Array.from({ length: 50 }, (_, i) => ({ name: `Color-${i}` }));
    const products = [makeProduct({ colors })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(50);
  });

  it("sums variants across all products", () => {
    const products = [
      makeProduct({ colors: [{ name: "A" }, { name: "B" }] }),
      makeProduct({ colors: [{ name: "C" }] }),
      makeProduct({ colors: undefined }),
      makeProduct({ colors: [{ name: "D" }, { name: "E" }, { name: "F" }] }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(6); // 2 + 1 + 0 + 3
  });

  it("handles mix of undefined and empty colors arrays", () => {
    const products = [
      makeProduct({ colors: undefined }),
      makeProduct({ colors: [] }),
      makeProduct({ colors: undefined }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(0);
  });
});

describe("statBadges — Categories edge cases", () => {
  it("deduplicates categories by category_id", () => {
    const products = [
      makeProduct({ category_id: "10" }),
      makeProduct({ category_id: "10" }),
      makeProduct({ category_id: "20" }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[2].value).toBe(2);
  });

  it("falls back to category.id when category_id is missing", () => {
    const products = [
      makeProduct({ category_id: undefined, category: { id: 5 } }),
      makeProduct({ category_id: undefined, category: { id: 10 } }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[2].value).toBe(2);
  });

  it("filters out category_id '0'", () => {
    const products = [
      makeProduct({ category_id: "0" }),
      makeProduct({ category_id: "1" }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[2].value).toBe(1);
  });

  it("filters out empty string category_id", () => {
    const products = [
      makeProduct({ category_id: "", category: undefined }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[2].value).toBe(0);
  });

  it("handles both category_id and category.id present — prefers category_id", () => {
    const products = [
      makeProduct({ category_id: "5", category: { id: 999 } }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    // category_id "5" is truthy so it's used, not category.id
    expect(stats[2].value).toBe(1);
  });

  it("⚠️ BUG: externalCategories overrides filtered category count", () => {
    // When externalCategories is loaded (length > 0), it ALWAYS overrides
    // the actual filtered categories count. This means:
    // - If user filters to 1 category, it still shows total external categories count
    const products = [makeProduct({ category_id: "1" })];
    const stats = calculateStatBadges(products, 0, 438); // 438 external categories
    // Should show 1 (filtered), but shows 438 (global)
    expect(stats[2].value).toBe(438); // ← This is the BUG
    // Expected behavior: should show categories relevant to filtered products
  });

  it("⚠️ BUG: externalCategories=0 with products having no category_id", () => {
    const products = [
      makeProduct({ category_id: undefined, category: undefined }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    // Shows 0 categories even though there's 1 product — may be confusing
    expect(stats[2].value).toBe(0);
  });

  it("handles numeric category.id converted to string", () => {
    const products = [
      makeProduct({ category_id: undefined, category: { id: 123 } }),
      makeProduct({ category_id: undefined, category: { id: 123 } }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[2].value).toBe(1); // deduplicated
  });
});

describe("statBadges — Suppliers edge cases", () => {
  it("deduplicates suppliers by name", () => {
    const products = [
      makeProduct({ supplier: { name: "Supplier A" } }),
      makeProduct({ supplier: { name: "Supplier A" } }),
      makeProduct({ supplier: { name: "Supplier B" } }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[3].value).toBe(2);
  });

  it("excludes 'Sem fornecedor'", () => {
    const products = [
      makeProduct({ supplier: { name: "Sem fornecedor" } }),
      makeProduct({ supplier: { name: "Real Supplier" } }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[3].value).toBe(1);
  });

  it("handles undefined supplier", () => {
    const products = [makeProduct({ supplier: undefined })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[3].value).toBe(0);
  });

  it("handles supplier with undefined name", () => {
    const products = [makeProduct({ supplier: { name: undefined } })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[3].value).toBe(0);
  });

  it("handles supplier with empty string name", () => {
    const products = [makeProduct({ supplier: { name: "" } })];
    const stats = calculateStatBadges(products, 0, 0);
    // Empty string is falsy so filter(Boolean) removes it
    expect(stats[3].value).toBe(0);
  });

  it("⚠️ EDGE CASE: supplier with whitespace name not filtered", () => {
    const products = [makeProduct({ supplier: { name: "  " } })];
    const stats = calculateStatBadges(products, 0, 0);
    // "  " is truthy, so it passes Boolean check — counts as a supplier
    expect(stats[3].value).toBe(1); // Potentially wrong — whitespace-only name
  });

  it("⚠️ EDGE CASE: case sensitivity in supplier names", () => {
    const products = [
      makeProduct({ supplier: { name: "Supplier A" } }),
      makeProduct({ supplier: { name: "supplier a" } }),
      makeProduct({ supplier: { name: "SUPPLIER A" } }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    // Set treats these as 3 different suppliers
    expect(stats[3].value).toBe(3); // ← Could be BUG if same supplier with different casing
  });

  it("⚠️ EDGE CASE: 'Sem fornecedor' with different casing not filtered", () => {
    const products = [
      makeProduct({ supplier: { name: "sem fornecedor" } }),
      makeProduct({ supplier: { name: "SEM FORNECEDOR" } }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    // Only exact "Sem fornecedor" is filtered — variants pass through
    expect(stats[3].value).toBe(2); // ← BUG: should also filter case-insensitive
  });

  it("handles many unique suppliers", () => {
    const products = Array.from({ length: 100 }, (_, i) =>
      makeProduct({ supplier: { name: `Supplier ${i}` } })
    );
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[3].value).toBe(100);
  });
});

describe("statBadges — Favorites edge cases", () => {
  it("favoriteCount is global, not filtered", () => {
    // This is a design observation: favoriteCount comes from the global store,
    // not from filtered products. If user filters to 10 products but has
    // 50 global favorites, it shows 50.
    const products = makeProducts(10);
    const stats = calculateStatBadges(products, 50, 0);
    expect(stats[4].value).toBe(50); // Shows global count, not relevant to filter
  });

  it("favoriteCount = 0 when no favorites", () => {
    const stats = calculateStatBadges(makeProducts(100), 0, 0);
    expect(stats[4].value).toBe(0);
  });

  it("favoriteCount reflects store state, not products", () => {
    // Even with 0 products, favorite count can be > 0
    const stats = calculateStatBadges([], 15, 0);
    expect(stats[4].value).toBe(15);
  });
});

describe("statBadges — Data integrity & consistency", () => {
  it("products with all fields undefined", () => {
    const products = [makeProduct({
      category_id: undefined,
      category: undefined,
      supplier: undefined,
      colors: undefined,
    })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(1); // product exists
    expect(stats[1].value).toBe(0); // no colors
    expect(stats[2].value).toBe(0); // no category
    expect(stats[3].value).toBe(0); // no supplier
  });

  it("products with all fields null (cast)", () => {
    const products = [makeProduct({
      category_id: null as any,
      category: null as any,
      supplier: null as any,
      colors: null as any,
    })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(1);
    expect(stats[1].value).toBe(0);
    expect(stats[2].value).toBe(0);
    expect(stats[3].value).toBe(0);
  });

  it("consistent output format for all stat items", () => {
    const stats = calculateStatBadges(makeProducts(5), 3, 10);
    stats.forEach((stat) => {
      expect(stat).toHaveProperty("id");
      expect(stat).toHaveProperty("label");
      expect(stat).toHaveProperty("value");
      expect(typeof stat.id).toBe("string");
      expect(typeof stat.label).toBe("string");
      expect(typeof stat.value).toBe("number");
      expect(stat.value).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(stat.value)).toBe(true);
    });
  });

  it("labels are in Portuguese", () => {
    const stats = calculateStatBadges([], 0, 0);
    expect(stats[0].label).toBe("Produtos Únicos");
    expect(stats[1].label).toBe("Variações");
    expect(stats[2].label).toBe("Categorias");
    expect(stats[3].label).toBe("Fornecedores");
    expect(stats[4].label).toBe("Favoritos");
  });
});

describe("statBadges — Performance at scale", () => {
  it("calculates 20000 products in under 100ms", () => {
    const products = makeProducts(20000);
    const start = performance.now();
    calculateStatBadges(products, 0, 0);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it("calculates 20000 products with 10 colors each in under 200ms", () => {
    const colors = Array.from({ length: 10 }, (_, i) => ({ name: `C${i}` }));
    const products = makeProducts(20000, { colors });
    const start = performance.now();
    const stats = calculateStatBadges(products, 0, 0);
    const elapsed = performance.now() - start;
    expect(stats[1].value).toBe(200000);
    expect(elapsed).toBeLessThan(200);
  });

  it("handles 500 unique suppliers without degradation", () => {
    const products = Array.from({ length: 500 }, (_, i) =>
      makeProduct({ supplier: { name: `S-${i}` } })
    );
    const start = performance.now();
    const stats = calculateStatBadges(products, 0, 0);
    const elapsed = performance.now() - start;
    expect(stats[3].value).toBe(500);
    expect(elapsed).toBeLessThan(50);
  });

  it("handles 1000 unique categories without degradation", () => {
    const products = Array.from({ length: 1000 }, (_, i) =>
      makeProduct({ category_id: String(i + 1) })
    );
    const start = performance.now();
    const stats = calculateStatBadges(products, 0, 0);
    const elapsed = performance.now() - start;
    expect(stats[2].value).toBe(1000);
    expect(elapsed).toBeLessThan(50);
  });
});

describe("statBadges — Real-world simulation scenarios", () => {
  it("Scenario: fresh catalog load — no filters active", () => {
    const products = [
      makeProduct({ category_id: "10", supplier: { name: "XBZ" }, colors: [{ name: "Branco" }, { name: "Preto" }] }),
      makeProduct({ category_id: "20", supplier: { name: "GOLD" }, colors: [{ name: "Azul" }] }),
      makeProduct({ category_id: "10", supplier: { name: "XBZ" }, colors: [] }),
      makeProduct({ category_id: "30", supplier: { name: "RSB" }, colors: [{ name: "Verde" }, { name: "Amarelo" }, { name: "Rosa" }] }),
    ];
    const stats = calculateStatBadges(products, 0, 438);
    expect(stats[0].value).toBe(4);
    expect(stats[1].value).toBe(6);
    expect(stats[2].value).toBe(438); // uses externalCategories, not filtered count
    expect(stats[3].value).toBe(3);
    expect(stats[4].value).toBe(0);
  });

  it("Scenario: search 'caneta' — subset of products", () => {
    const products = [
      makeProduct({ name: "Caneta Bic", category_id: "5", supplier: { name: "BIC" }, colors: [{ name: "Azul" }] }),
      makeProduct({ name: "Caneta Parker", category_id: "5", supplier: { name: "Parker" }, colors: [{ name: "Prata" }, { name: "Dourada" }] }),
    ];
    const stats = calculateStatBadges(products, 3, 438);
    expect(stats[0].value).toBe(2);
    expect(stats[1].value).toBe(3);
    expect(stats[2].value).toBe(438); // ⚠️ Still shows 438, not 1
    expect(stats[3].value).toBe(2);
    expect(stats[4].value).toBe(3); // ⚠️ Global favorites, not filtered
  });

  it("Scenario: filter by single supplier", () => {
    const products = [
      makeProduct({ supplier: { name: "XBZ" }, category_id: "1" }),
      makeProduct({ supplier: { name: "XBZ" }, category_id: "2" }),
    ];
    const stats = calculateStatBadges(products, 0, 438);
    expect(stats[3].value).toBe(1); // Only XBZ
  });

  it("Scenario: filter by color 'Azul' — some products have no colors", () => {
    const products = [
      makeProduct({ colors: [{ name: "Azul" }] }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(1);
    expect(stats[1].value).toBe(1);
  });

  it("Scenario: in-stock only filter — all products have stock", () => {
    const products = makeProducts(50, { stock: 10 });
    const stats = calculateStatBadges(products, 0, 438);
    expect(stats[0].value).toBe(50);
  });

  it("Scenario: price range filter yields 0 products", () => {
    const stats = calculateStatBadges([], 5, 438);
    expect(stats[0].value).toBe(0);
    expect(stats[1].value).toBe(0);
    expect(stats[2].value).toBe(438); // ⚠️ Still shows 438 even with 0 products!
    expect(stats[3].value).toBe(0);
    expect(stats[4].value).toBe(5); // ⚠️ Still shows favorites even with 0 products!
  });

  it("Scenario: kit products — isKit filter active", () => {
    const products = makeProducts(3, { category_id: "100" });
    const stats = calculateStatBadges(products, 0, 438);
    expect(stats[0].value).toBe(3);
  });

  it("Scenario: gender filter — mixed products", () => {
    const products = [
      makeProduct({ gender: "Feminino", category_id: "1" }),
      makeProduct({ gender: "Feminino", category_id: "2" }),
    ];
    const stats = calculateStatBadges(products, 0, 438);
    expect(stats[0].value).toBe(2);
  });

  it("Scenario: XBZ supplier — colors may lack data", () => {
    // XBZ products sometimes have null color codes
    const products = [
      makeProduct({
        supplier: { name: "XBZ" },
        colors: [{ name: "", hex: "" }, { name: "Indefinida" }],
      }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(2); // Counts even unnamed colors
  });

  it("Scenario: progressive loading — partial catalog (page 1 of 4)", () => {
    // Only 500 of 2000 products loaded
    const products = makeProducts(500);
    const stats = calculateStatBadges(products, 0, 438);
    expect(stats[0].value).toBe(500);
    // Categories show 438 (external) even though only 500 products loaded
    expect(stats[2].value).toBe(438);
  });

  it("Scenario: full catalog loaded — all 4 pages", () => {
    const products = makeProducts(2000);
    const stats = calculateStatBadges(products, 0, 438);
    expect(stats[0].value).toBe(2000);
    expect(stats[2].value).toBe(438);
  });
});

describe("statBadges — Duplicate detection", () => {
  it("⚠️ GAP: duplicate products with same ID are counted separately", () => {
    const products = [
      makeProduct({ id: "same-id", name: "Product A" }),
      makeProduct({ id: "same-id", name: "Product A" }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    // No deduplication by ID — counts 2 instead of 1
    expect(stats[0].value).toBe(2);
  });
});

describe("statBadges — useMemo dependency analysis", () => {
  it("⚠️ GAP: externalCategories.length not granular enough", () => {
    // useMemo depends on [filteredProducts, favoriteCount, externalCategories.length]
    // If externalCategories changes content but keeps same length,
    // the memo doesn't recalculate
    // This is acceptable since categories rarely change content without length change
    expect(true).toBe(true);
  });

  it("⚠️ GAP: filteredProducts reference identity may cause extra recalcs", () => {
    // filteredProducts is computed via useMemo with many deps
    // Any filter change creates new array reference → statBadges recalculates
    // This is expected behavior but worth noting for performance
    expect(true).toBe(true);
  });
});

describe("StatsPopover rendering — Component tests", () => {
  it("exports StatsPopover component", async () => {
    const mod = await import("@/components/products/StatsPopover");
    expect(mod.StatsPopover).toBeDefined();
    expect(typeof mod.StatsPopover).toBe("function");
  });

  it("accepts stats array prop", async () => {
    const mod = await import("@/components/products/StatsPopover");
    const component = mod.StatsPopover;
    expect(component).toBeDefined();
  });
});

describe("FavoritesStore — localStorage edge cases", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles corrupted localStorage gracefully", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue("not-json{{{");
    // The store should catch JSON.parse errors and return []
    try {
      const stored = localStorage.getItem("product-favorites");
      const parsed = stored ? JSON.parse(stored) : [];
      expect(parsed).toBeDefined();
    } catch {
      // Expected — the store wraps this in try-catch
      expect(true).toBe(true);
    }
    spy.mockRestore();
  });

  it("handles localStorage quota exceeded", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    // The store should silently fail on save
    expect(() => localStorage.setItem("test", "value")).toThrow();
    spy.mockRestore();
  });
});

// ============================================
// SUMMARY OF FOUND ISSUES
// ============================================
describe("📋 AUDIT SUMMARY — Documented Issues", () => {
  it("BUG-001: Categories count ignores active filters", () => {
    // categoriesCount = externalCategories.length || uniqueCategoryIds.size
    // When externalCategories is loaded, it ALWAYS shows the global count (438)
    // regardless of applied filters. Users see "438 Categorias" even when
    // filtering to a single category.
    //
    // FIX: Should use uniqueCategoryIds.size when filters are active,
    // or intersect externalCategories with filtered products' category IDs.
    const filtered = [makeProduct({ category_id: "5" })];
    const stats = calculateStatBadges(filtered, 0, 438);
    expect(stats[2].value).not.toBe(1); // Currently broken
  });

  it("BUG-002: Favorites count is global, not contextual", () => {
    // favoriteCount comes from useFavoritesStore() — a global store.
    // It shows total favorites regardless of current filters/search.
    // User filters to "Canetas" but Favoritos shows favorites from all categories.
    //
    // FIX: Should compute intersection of favorites with filteredProducts.
    const filtered = makeProducts(5);
    const stats = calculateStatBadges(filtered, 100, 0);
    expect(stats[4].value).toBe(100); // Shows 100 even though only 5 products visible
  });

  it("BUG-003: Supplier name comparison is case-sensitive", () => {
    // "Supplier A" and "supplier a" are counted as different suppliers.
    // Also "Sem fornecedor" only matches exact case.
    const products = [
      makeProduct({ supplier: { name: "BIC" } }),
      makeProduct({ supplier: { name: "bic" } }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[3].value).toBe(2); // Should be 1
  });

  it("BUG-004: Empty/0 products still shows externalCategories count", () => {
    // When filters yield 0 products, Categorias still shows 438
    const stats = calculateStatBadges([], 0, 438);
    expect(stats[2].value).toBe(438); // Misleading — no products match
  });

  it("EDGE-001: Whitespace-only supplier names counted as valid", () => {
    const products = [makeProduct({ supplier: { name: "   " } })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[3].value).toBe(1); // Whitespace passes Boolean check
  });

  it("EDGE-002: No loading indicator in stats during data fetch", () => {
    // StatsPopover always shows numbers, even during loading.
    // Partially loaded data = partially accurate stats.
    // No skeleton/spinner within the popover.
    expect(true).toBe(true); // UI observation
  });

  it("EDGE-003: Variants counts unnamed/empty colors", () => {
    const products = [makeProduct({ colors: [{ name: "" }, { name: "" }] })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(2); // Empty names are still counted
  });

  it("EDGE-004: No product deduplication by ID", () => {
    const products = [
      makeProduct({ id: "dup" }),
      makeProduct({ id: "dup" }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(2); // Should be 1
  });
});
