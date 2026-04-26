import { describe, it, expect } from "vitest";
import {
  filterDevOnlyItems,
  isItemVisibleForRoles,
} from "@/lib/navigation/filter-dev-only-items";

interface Item {
  label: string;
  href: string;
  devOnly?: boolean;
  adminOnly?: boolean;
}

const items: Item[] = [
  { label: "Início", href: "/" },
  { label: "Orçamentos", href: "/orcamentos" },
  { label: "Usuários", href: "/admin/usuarios", adminOnly: true },
  { label: "Telemetria", href: "/admin/telemetria", devOnly: true },
  { label: "Conexões", href: "/admin/conexoes", devOnly: true },
  { label: "Auditoria RBAC", href: "/admin/rbac-rotas", devOnly: true },
  { label: "Workflows IA", href: "/admin/workflows", devOnly: true },
];

const VENDEDOR = { isDev: false, isAdmin: false };
const ADMIN = { isDev: false, isAdmin: true };
const DEV = { isDev: true, isAdmin: true };

describe("filterDevOnlyItems — visibilidade por papel", () => {
  it("vendedor (não-dev, não-admin) NÃO vê nenhum item devOnly", () => {
    const visible = filterDevOnlyItems(items, VENDEDOR);
    const labels = visible.map((i) => i.label);

    // Nenhum item devOnly aparece
    expect(labels).not.toContain("Telemetria");
    expect(labels).not.toContain("Conexões");
    expect(labels).not.toContain("Auditoria RBAC");
    expect(labels).not.toContain("Workflows IA");

    // Itens devOnly não aparecem na lista
    expect(visible.every((i) => !i.devOnly)).toBe(true);

    // Itens adminOnly também não aparecem para vendedor
    expect(labels).not.toContain("Usuários");

    // Itens públicos/autenticados continuam visíveis
    expect(labels).toContain("Início");
    expect(labels).toContain("Orçamentos");
  });

  it("admin (não-dev) NÃO vê itens devOnly, mas vê adminOnly", () => {
    const visible = filterDevOnlyItems(items, ADMIN);
    const labels = visible.map((i) => i.label);

    expect(labels).toContain("Usuários");
    expect(labels).not.toContain("Telemetria");
    expect(labels).not.toContain("Conexões");
    expect(labels).not.toContain("Auditoria RBAC");
    expect(visible.every((i) => !i.devOnly)).toBe(true);
  });

  it("dev vê TODOS os itens, inclusive devOnly", () => {
    const visible = filterDevOnlyItems(items, DEV);
    expect(visible).toHaveLength(items.length);
    const labels = visible.map((i) => i.label);
    expect(labels).toContain("Telemetria");
    expect(labels).toContain("Conexões");
    expect(labels).toContain("Auditoria RBAC");
    expect(labels).toContain("Workflows IA");
  });
});

describe("isItemVisibleForRoles — regras unitárias", () => {
  it("item devOnly só é visível para dev", () => {
    const item = { devOnly: true };
    expect(isItemVisibleForRoles(item, VENDEDOR)).toBe(false);
    expect(isItemVisibleForRoles(item, ADMIN)).toBe(false);
    expect(isItemVisibleForRoles(item, DEV)).toBe(true);
  });

  it("item adminOnly é visível para admin e dev", () => {
    const item = { adminOnly: true };
    expect(isItemVisibleForRoles(item, VENDEDOR)).toBe(false);
    expect(isItemVisibleForRoles(item, ADMIN)).toBe(true);
    expect(isItemVisibleForRoles(item, DEV)).toBe(true);
  });

  it("item sem flags é sempre visível", () => {
    const item = {};
    expect(isItemVisibleForRoles(item, VENDEDOR)).toBe(true);
    expect(isItemVisibleForRoles(item, ADMIN)).toBe(true);
    expect(isItemVisibleForRoles(item, DEV)).toBe(true);
  });

  it("devOnly tem precedência: mesmo admin não vê", () => {
    const item = { devOnly: true, adminOnly: true };
    expect(isItemVisibleForRoles(item, ADMIN)).toBe(false);
    expect(isItemVisibleForRoles(item, DEV)).toBe(true);
  });
});

describe("Regressão: itens reais da Sidebar marcados devOnly", () => {
  // Espelha as entradas com devOnly em SidebarReorganized.tsx
  const sidebarDevOnlyHrefs = [
    "/admin/seguranca",
    "/admin/seguranca-acesso",
    "/admin/conexoes",
    "/admin/prompts-ia",
    "/admin/workflows",
    "/admin/telemetria",
    "/admin/validade-precos",
    "/admin/rbac-rotas",
  ];

  const sidebarItems = sidebarDevOnlyHrefs.map((href) => ({
    label: href,
    href,
    devOnly: true,
  }));

  it("vendedor não vê NENHUMA rota técnica da sidebar", () => {
    const visible = filterDevOnlyItems(sidebarItems, VENDEDOR);
    expect(visible).toHaveLength(0);
  });

  it("dev vê TODAS as rotas técnicas da sidebar", () => {
    const visible = filterDevOnlyItems(sidebarItems, DEV);
    expect(visible).toHaveLength(sidebarDevOnlyHrefs.length);
  });
});
