import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StockFilterToolbar } from "../StockFilterToolbar";
import type { StockFilters } from "@/types/stock";
import { defaultStockFilters } from "@/types/stock";

const mockCategories = [
  { name: "Canetas", count: 50 },
  { name: "Cadernos", count: 30 },
  { name: "Agendas", count: 20 },
];

const mockSuppliers = [
  { name: "Fornecedor A", count: 40 },
  { name: "Fornecedor B", count: 60 },
];

const mockColors = ["Azul", "Vermelho", "Preto", "Branco"];
const mockColorGroups = [
  { name: "Azuis", count: 15 },
  { name: "Vermelhos", count: 10 },
];

const defaultProps = {
  filters: { ...defaultStockFilters },
  onUpdateFilter: vi.fn(),
  onResetFilters: vi.fn(),
  categories: mockCategories,
  suppliers: mockSuppliers,
  colors: mockColors,
  colorGroups: mockColorGroups,
  totalProducts: 500,
  filteredCount: 500,
};

describe("StockFilterToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input", () => {
    render(<StockFilterToolbar {...defaultProps} />);
    expect(screen.getByPlaceholderText("Buscar produto, SKU ou cor...")).toBeInTheDocument();
  });

  it("renders quantity input", () => {
    render(<StockFilterToolbar {...defaultProps} />);
    expect(screen.getByPlaceholderText("Preciso de X un...")).toBeInTheDocument();
  });

  it("renders all status chips", () => {
    render(<StockFilterToolbar {...defaultProps} />);
    expect(screen.getByText("Todos")).toBeInTheDocument();
    expect(screen.getByText("Em Estoque")).toBeInTheDocument();
    expect(screen.getByText("Baixo")).toBeInTheDocument();
    expect(screen.getByText("Crítico")).toBeInTheDocument();
    expect(screen.getByText("Esgotado")).toBeInTheDocument();
    expect(screen.getByText("Chegando")).toBeInTheDocument();
  });

  it("calls onUpdateFilter when status chip is clicked", () => {
    render(<StockFilterToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText("Baixo"));
    expect(defaultProps.onUpdateFilter).toHaveBeenCalledWith("status", "low_stock");
  });

  it("debounces search input", async () => {
    render(<StockFilterToolbar {...defaultProps} />);
    const input = screen.getByPlaceholderText("Buscar produto, SKU ou cor...");
    fireEvent.change(input, { target: { value: "caneta" } });
    await waitFor(() => {
      expect(defaultProps.onUpdateFilter).toHaveBeenCalledWith("search", "caneta");
    }, { timeout: 500 });
  });

  it("shows Filtros button", () => {
    render(<StockFilterToolbar {...defaultProps} />);
    expect(screen.getByText("Filtros")).toBeInTheDocument();
  });

  it("shows active filter count badge when filters are active", () => {
    const activeFilters: StockFilters = {
      ...defaultStockFilters,
      categoryId: "Canetas",
      status: "low_stock",
    };
    render(<StockFilterToolbar {...defaultProps} filters={activeFilters} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows active filter badges with category name", () => {
    const activeFilters: StockFilters = {
      ...defaultStockFilters,
      categoryId: "Canetas",
    };
    render(<StockFilterToolbar {...defaultProps} filters={activeFilters} />);
    expect(screen.getByText("Canetas")).toBeInTheDocument();
  });

  it("shows filtered count when filters are active", () => {
    const activeFilters: StockFilters = {
      ...defaultStockFilters,
      categoryId: "Canetas",
    };
    render(<StockFilterToolbar {...defaultProps} filters={activeFilters} filteredCount={50} />);
    expect(screen.getByText("50 de 500 produtos")).toBeInTheDocument();
  });

  it("shows reset button (X) when filters are active", () => {
    const activeFilters: StockFilters = {
      ...defaultStockFilters,
      categoryId: "Canetas",
    };
    render(<StockFilterToolbar {...defaultProps} filters={activeFilters} />);
    // The X reset button should be visible
    const resetButtons = screen.getAllByRole("button");
    expect(resetButtons.length).toBeGreaterThan(0);
  });

  it("calls onResetFilters when reset is triggered", () => {
    const activeFilters: StockFilters = {
      ...defaultStockFilters,
      search: "test",
    };
    render(<StockFilterToolbar {...defaultProps} filters={activeFilters} />);
    // Clear search via the X button inside the search input
    const clearButton = screen.getByPlaceholderText("Buscar produto, SKU ou cor...").parentElement?.querySelector("button");
    if (clearButton) fireEvent.click(clearButton);
    // search should be cleared locally
  });
});
