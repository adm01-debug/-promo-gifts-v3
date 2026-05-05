import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SellerCartProvider } from "@/contexts/SellerCartContext";
import React from "react";

// Mock des dependências
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { email: "test@example.com" },
    profile: { full_name: "Test User" },
    role: "admin",
    isAdmin: true,
    signOut: vi.fn(),
    rolesLoaded: true,
  })),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock("@/hooks/useCurrentSection", () => ({
  useCurrentSection: () => "Dashboard",
}));

// Mock do CartHeaderButton para evitar contexto de Carrinho complexo
vi.mock("@/components/cart/CartHeaderButton", () => ({
  CartHeaderButton: () => <div data-testid="mock-cart" />
}));

// Mock do NotificationBell
vi.mock("@/components/notifications/NotificationDrawer", () => ({
  NotificationBell: () => <div data-testid="mock-notifications" />
}));

// Mock do StockAlertsIndicator
vi.mock("@/components/inventory/StockAlertsIndicator", () => ({
  StockAlertsIndicator: () => <div data-testid="mock-stock-alerts" />
}));

// Mock do DiscountApprovalHeaderBadge
vi.mock("@/components/admin/DiscountApprovalHeaderBadge", () => ({
  DiscountApprovalHeaderBadge: () => <div data-testid="mock-discount-badge" />
}));

describe("Header Interactions", () => {
  const mockNavigate = vi.fn();
  const mockOnSearchChange = vi.fn();
  const mockOnMenuToggle = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

  const renderHeader = (isFiltering = false) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThemeProvider>
            <TooltipProvider>
              <OnboardingProvider>
                <SellerCartProvider>
                  <Header
                    onMenuToggle={mockOnMenuToggle}
                    searchQuery=""
                    onSearchChange={mockOnSearchChange}
                    isFiltering={isFiltering}
                  />
                </SellerCartProvider>
              </OnboardingProvider>
            </TooltipProvider>
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it("exibe feedback de carregamento quando isFiltering é true", () => {
    renderHeader(true);
    const filterButton = screen.getByLabelText("Super Filtro");
    const loader = filterButton.querySelector(".animate-spin");
    expect(loader).not.toBeNull();
  });

  it("navega para /filtros ao clicar no botão de filtro", () => {
    renderHeader();
    const filterButton = screen.getByLabelText("Super Filtro");
    fireEvent.click(filterButton);
    expect(mockNavigate).toHaveBeenCalledWith("/filtros");
  });
});

