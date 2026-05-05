import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PersistentBreadcrumbs } from "@/components/common/PersistentBreadcrumbs";
import { AuthProvider } from "@/contexts/AuthContext";
import React from "react";

describe("PersistentBreadcrumbs Accessibility and Interaction", () => {
  it("renderiza links clicáveis para profundidades intermediárias", () => {
    render(
      <MemoryRouter initialEntries={["/admin/usuarios"]}>
        <AuthProvider>
          <PersistentBreadcrumbs showHome={true} />
        </AuthProvider>
      </MemoryRouter>
    );

    // Deve ter link para "Início" e "Administração"
    const inicioLink = screen.getByLabelText("Página inicial");
    expect(inicioLink).toBeDefined();
    expect(inicioLink.closest("a")?.getAttribute("href")).toBe("/");

    const adminLink = screen.getByText("Administração");
    expect(adminLink.closest("a")).not.toBeNull();
    expect(adminLink.closest("a")?.getAttribute("href")).toBe("/admin");
  });

  it("exibe o estado ativo (bold/primary) para a página atual", () => {
    render(
      <MemoryRouter initialEntries={["/admin/usuarios"]}>
        <AuthProvider>
          <PersistentBreadcrumbs />
        </AuthProvider>
      </MemoryRouter>
    );

    const usuariosPage = screen.getByText("Usuários");
    // Verifica se tem a classe de fonte negrito ou cor primária
    expect(usuariosPage.className).toContain("text-primary");
    expect(usuariosPage.className).toContain("font-bold");
  });
});
