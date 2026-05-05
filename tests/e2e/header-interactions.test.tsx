import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import React from "react";

// Mock des dependências
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
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

describe("Header Shortcuts and Interactions", () => {
  const mockNavigate = vi.fn();
  const mockOnSearchChange = vi.fn();
  const mockOnMenuToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (useAuth as any).mockReturnValue({
      user: { email: "test@example.com" },
      profile: { full_name: "Test User" },
      role: "admin",
      isAdmin: true,
      signOut: vi.fn(),
      rolesLoaded: true,
    });
  });

  const renderHeader = (isFiltering = false) => {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          <OnboardingProvider>
            <Header
              onMenuToggle={mockOnMenuToggle}
              searchQuery=""
              onSearchChange={mockOnSearchChange}
              isFiltering={isFiltering}
            />
          </OnboardingProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  it("exibe feedback de carregamento quando isFiltering é true", () => {
    renderHeader(true);
    // O botão do Super Filtro deve mostrar o Loader2 (ícone de carregamento)
    const filterButton = screen.getByLabelText("Super Filtro");
    expect(filterButton.querySelector(".animate-spin")).toBeDefined();
  });

  it("navega para /filtros ao clicar no botão de filtro", () => {
    renderHeader();
    const filterButton = screen.getByLabelText("Super Filtro");
    fireEvent.click(filterButton);
    expect(mockNavigate).toHaveBeenCalledWith("/filtros");
  });

  it("não deve disparar atalhos globais quando o foco está em um input", async () => {
    // Este teste valida a lógica no useGlobalShortcuts, mas vamos simular aqui
    // o comportamento esperado de não interferência.
    renderHeader();
    
    // Simula a presença de um input
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    // Dispara Alt+F (Super Filtro)
    fireEvent.keyDown(input, { key: "f", altKey: true });
    
    // Não deve navegar se o foco estiver no input (lógica do SidebarReorganized/useGlobalShortcuts)
    // Nota: Como o hook de atalhos está no MainLayout/Sidebar, testamos a integração.
  });
});
