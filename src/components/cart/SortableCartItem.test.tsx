import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SortableCartItem } from "./SortableCartItem";
import { BrowserRouter } from "react-router-dom";

// Mock dnd-kit since it depends on layout measurements
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

const mockItem = {
  id: "item-1",
  cart_id: "cart-1",
  product_id: "prod-1",
  product_name: "Caneta Premium Azul",
  product_sku: "CAN-001",
  product_image_url: null,
  product_price: 15.50,
  quantity: 10,
  color_name: "Azul",
  color_hex: "#0000FF",
  notes: "Personalizar com logo",
  sort_order: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const renderComponent = (item = mockItem) => {
  return render(
    <BrowserRouter>
      <SortableCartItem
        item={item}
        index={0}
        otherCarts={[]}
        stockMap={new Map()}
        onRemove={vi.fn()}
        onUpdateQuantity={vi.fn()}
        onUpdateNotes={vi.fn()}
        onMoveToCart={vi.fn()}
        onDuplicateToCart={vi.fn()}
        onNavigate={vi.fn()}
      />
    </BrowserRouter>
  );
};

describe("SortableCartItem Rendering", () => {
  it("renders SKU correctly", () => {
    renderComponent();
    expect(screen.getByTestId("cart-item-sku")).toHaveTextContent("CAN-001");
  });

  it("renders product name correctly", () => {
    renderComponent();
    expect(screen.getByTestId("cart-item-name")).toHaveTextContent("Caneta Premium Azul");
  });

  it("renders unit price with correct formatting", () => {
    renderComponent();
    // BRL formatting: R$ 15,50
    expect(screen.getByTestId("cart-item-unit-price")).toHaveTextContent(/15,50/);
  });

  it("renders subtotal correctly (price * quantity)", () => {
    renderComponent();
    // 15.50 * 10 = 155.00
    expect(screen.getByTestId("cart-item-total")).toHaveTextContent(/155,00/);
  });

  it("renders labels for 'Unitário' and 'Subtotal'", () => {
    renderComponent();
    expect(screen.getByText("Unitário")).toBeDefined();
    expect(screen.getByText("Subtotal")).toBeDefined();
  });
});
