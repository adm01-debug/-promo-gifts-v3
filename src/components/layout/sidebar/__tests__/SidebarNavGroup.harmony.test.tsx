/**
 * Garante que os três itens do grupo "Orçamentos" — Novo Orçamento, Orçamentos
 * e Carrinhos — compartilham EXATAMENTE o mesmo padrão de classes base e o
 * mesmo comportamento de destaque ativo. Previne regressão da harmonização
 * (remoção do tratamento CTA do "Novo Orçamento").
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Plus, FileText, ShoppingCart } from "lucide-react";
import type { NavGroup } from "../SidebarNavGroup";

// Mocks dos contextos usados pelo componente
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAdmin: true, isDev: true, user: { id: "u1" } }),
}));
vi.mock("@/hooks/useRBAC", () => ({
  useRBAC: () => ({ hasPermission: () => true }),
}));
vi.mock("@/lib/routePrefetch", () => ({
  getPrefetchHandlers: () => ({ onMouseEnter: () => {}, onTouchStart: () => {} }),
}));
vi.mock("@/lib/navigation/restricted-routes", () => ({
  isDevOnlyPath: () => false,
  isAdminOnlyPath: () => false,
}));

// Importa DEPOIS dos mocks
import { SidebarNavGroup } from "../SidebarNavGroup";

const group: NavGroup = {
  id: "quotes",
  label: "Orçamentos",
  icon: FileText,
  defaultOpen: true,
  items: [
    { icon: Plus, label: "Novo Orçamento", href: "/orcamentos/novo", shortcut: "Alt+N" },
    { icon: FileText, label: "Orçamentos", href: "/orcamentos", exact: true, shortcut: "Alt+O" },
    { icon: ShoppingCart, label: "Carrinhos", href: "/carrinhos" },
  ],
};

function renderAt(pathname: string) {
  const utils = render(
    <MemoryRouter initialEntries={[pathname]}>
      <SidebarNavGroup
        group={group}
        isOpen={true}
        isCollapsed={false}
        onToggle={() => {}}
        onMobileClose={() => {}}
        isMobileSidebarOpen={false}
      />
    </MemoryRouter>
  );
  const rerenderAt = (next: string) =>
    utils.rerender(
      <MemoryRouter initialEntries={[next]}>
        <SidebarNavGroup
          group={group}
          isOpen={true}
          isCollapsed={false}
          onToggle={() => {}}
          onMobileClose={() => {}}
          isMobileSidebarOpen={false}
        />
      </MemoryRouter>
    );
  return { ...utils, rerenderAt };
}

/** Classes BASE compartilhadas — devem estar presentes em todos os 3 itens. */
const BASE_CLASSES = [
  "flex",
  "items-center",
  "gap-3",
  "px-3",
  "py-2",
  "rounded-lg",
  "transition-all",
  "duration-200",
  "group",
  "relative",
  "hover:bg-sidebar-accent/50",
];

/** Classes que NÃO devem aparecer em nenhum item (resíduo do antigo CTA). */
const FORBIDDEN_CTA_CLASSES = [
  "bg-gradient-to-r",
  "from-orange/15",
  "from-orange/5",
  "border-orange/30",
  "hover:shadow-orange/10",
];

function getLink(label: string): HTMLAnchorElement {
  return screen.getByRole("link", { name: new RegExp(label, "i") }) as HTMLAnchorElement;
}

describe("SidebarNavGroup — harmonia visual de Novo Orçamento / Orçamentos / Carrinhos", () => {
  beforeEach(() => {
    renderAt("/dashboard"); // rota neutra: nenhum item ativo
  });

  it("renderiza os três itens", () => {
    expect(getLink("Novo Orçamento")).toBeInTheDocument();
    expect(getLink("Orçamentos")).toBeInTheDocument();
    expect(getLink("Carrinhos")).toBeInTheDocument();
  });

  it.each([
    ["Novo Orçamento"],
    ["Orçamentos"],
    ["Carrinhos"],
  ])("o item %s tem todas as classes BASE compartilhadas", (label) => {
    const link = getLink(label);
    for (const cls of BASE_CLASSES) {
      expect(link.className).toContain(cls);
    }
  });

  it.each([
    ["Novo Orçamento"],
    ["Orçamentos"],
    ["Carrinhos"],
  ])("o item %s NÃO contém classes do antigo estilo CTA", (label) => {
    const link = getLink(label);
    for (const cls of FORBIDDEN_CTA_CLASSES) {
      expect(link.className).not.toContain(cls);
    }
  });

  it("o conjunto de classes de Novo Orçamento (estado idle) é IGUAL ao de Carrinhos", () => {
    const novo = getLink("Novo Orçamento").className.split(/\s+/).sort().join(" ");
    const carrinhos = getLink("Carrinhos").className.split(/\s+/).sort().join(" ");
    expect(novo).toBe(carrinhos);
  });
});

describe("SidebarNavGroup — comportamento de destaque ativo", () => {
  /** Classes aplicadas quando o item está ativo. */
  const ACTIVE_MARKERS = ["bg-orange/10", "text-orange", "font-medium"];
  /** Classes aplicadas quando o item está idle (não ativo). */
  const IDLE_MARKERS = ["text-sidebar-foreground/60"];

  it.each([
    ["/orcamentos/novo", "Novo Orçamento"],
    ["/orcamentos", "Orçamentos"],
    ["/carrinhos", "Carrinhos"],
    ["/carrinhos/abc-123", "Carrinhos"], // rota filha mantém destaque
  ])("em %s, o item %s recebe as classes de ativo", (path, label) => {
    renderAt(path);
    const link = getLink(label);
    for (const cls of ACTIVE_MARKERS) {
      expect(link.className).toContain(cls);
    }
  });

  it("em /dashboard nenhum dos três itens fica ativo (todos em estado idle)", () => {
    renderAt("/dashboard");
    for (const label of ["Novo Orçamento", "Orçamentos", "Carrinhos"]) {
      const link = getLink(label);
      for (const cls of IDLE_MARKERS) {
        expect(link.className).toContain(cls);
      }
      expect(link.className).not.toContain("bg-orange/10");
    }
  });

  it("em /orcamentos-publicos o item /orcamentos NÃO fica ativo (sem falso prefixo)", () => {
    renderAt("/orcamentos-publicos");
    const link = getLink("Orçamentos");
    expect(link.className).not.toContain("bg-orange/10");
  });
});
