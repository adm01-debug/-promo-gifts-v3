import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PersistentBreadcrumbs } from "@/components/common/PersistentBreadcrumbs";
import { TooltipProvider } from "@/components/ui/tooltip";
import React from "react";

// Mock do Auth para simplificar
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAdmin: true,
    isDev: true,
  }),
}));

describe("PersistentBreadcrumbs UX", () => {
  it("renderiza links clicáveis para profundidades intermediárias", () => {
    render(
      <MemoryRouter initialEntries={["/admin/usuarios"]}>
        <TooltipProvider>
          <PersistentBreadcrumbs showHome={true} />
        </TooltipProvider>
      </MemoryRouter>
    );

    // No PersistentBreadcrumbs, o link de início tem o texto "Início" ao lado do ícone ou dentro do span
    const inicioLink = screen.getByText("Início");
    expect(inicioLink.closest("a")?.getAttribute("href")).toBe("/");

    const adminLink = screen.getByText("Administração");
    expect(adminLink.closest("a")?.getAttribute("href")).toBe("/admin");
  });

  it("exibe o estado ativo (bold/primary) para a página atual", () => {
    render(
      <MemoryRouter initialEntries={["/admin/usuarios"]}>
        <TooltipProvider>
          <PersistentBreadcrumbs />
        </TooltipProvider>
      </MemoryRouter>
    );

    const usuariosPage = screen.getByText("Usuários").closest(".text-primary");
    expect(usuariosPage).not.toBeNull();
    expect(usuariosPage?.className).toContain("font-bold");
  });
});

