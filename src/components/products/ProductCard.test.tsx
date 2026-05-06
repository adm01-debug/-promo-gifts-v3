import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProductCard } from "./ProductCard";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client for the provider
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock des hooks e stores
vi.mock("@/stores/useFavoritesStore", () => ({
  useFavoritesStore: () => ({
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorited: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock("@/stores/useComparisonStore", () => ({
  useComparisonStore: () => ({
    addToCompare: vi.fn(),
    removeFromCompare: vi.fn(),
    isInCompare: vi.fn().mockReturnValue(false),
  }),
}));

// Mock dos contextos que faltavam
vi.mock("@/contexts/SellerCartContext", () => ({
  useSellerCartContext: () => ({
    addToCart: vi.fn(),
  }),
}));

vi.mock("@/contexts/CollectionsContext", () => ({
  useCollectionsContext: () => ({
    collections: [],
    addPendingProduct: vi.fn(),
    defaultColors: ["#000000"],
    defaultIcons: ["folder"],
    isProductInCollection: vi.fn().mockReturnValue(false),
  }),
}));

const mockProduct = {
  id: "1",
  name: "Produto Teste",
  sku: "TEST-001",
  price: 100,
  images: ["test.jpg"],
  og_image_url: "test.jpg",
  colors: [], // Adicionado para evitar erro de undefined.length
  stock: 10,
  stockStatus: "in-stock",
  category: "Teste",
  groups: [],
  supplier: { name: "Fornecedor Teste" },
  gender: "unisex",
  materials: ["Algodão"],
  priceUpdatedAt: new Date().toISOString(),
  priceFreshnessThresholdDays: 30,
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          {ui}
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe("ProductCard UI Classes", () => {
  it("applies expected hover classes and layout structure", () => {
    renderWithProviders(<ProductCard product={mockProduct as any} />);
    
    const card = screen.getByTestId("product-card");
    const infoSection = card.querySelector(".relative.p-2\\.5.sm\\:p-4");

    // Verifica se a seção de info tem as classes de clipping solicitadas
    expect(infoSection).toHaveClass("rounded-b-xl");
    expect(infoSection).toHaveClass("overflow-hidden");
    
    // Simula hover
    fireEvent.mouseEnter(card);
    
    // Verifica se as classes de hover (transparência/blur) são aplicadas na seção de info
    expect(infoSection).toHaveClass("bg-card/95");
    expect(infoSection).toHaveClass("backdrop-blur-md");
    
    // Verifica se o card em si tem transição e sombra premium
    expect(card).toHaveClass("transition-all");
    expect(card).toHaveClass("hover:shadow-premium");
  });
});
