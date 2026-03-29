import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Package,
  Users,
  Filter,
  Heart,
  GitCompare,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ShieldCheck,
  Calculator,
  Wand2,
  Sparkles,
  FileText,
  ShoppingCart,
  Star,
  Wrench,
  Zap,
  DollarSign,
  Plus,
  Activity,
  Truck,
  Palette,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarBrandHeader } from "./sidebar/SidebarBrandHeader";
import { SidebarUserFooter } from "./sidebar/SidebarUserFooter";
import { SidebarQuickSearch } from "./sidebar/SidebarQuickSearch";
import { SidebarNavGroup, type NavGroup } from "./sidebar/SidebarNavGroup";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navGroups: NavGroup[] = [
  {
    id: "catalog",
    label: "Catálogo",
    icon: Package,
    defaultOpen: true,
    items: [
      { icon: Package, label: "Produtos", href: "/", tourId: "products" },
      { icon: Filter, label: "Super Filtro", href: "/filtros" },
      { icon: Zap, label: "Novidades", href: "/novidades" },
      { icon: FolderOpen, label: "Coleções", href: "/colecoes" },
      { icon: Package, label: "Estoque", href: "/estoque" },
    ],
  },
  {
    id: "tools",
    label: "Ferramentas",
    icon: Wrench,
    defaultOpen: false,
    items: [
      { icon: Wand2, label: "Mockup", href: "/mockup-generator" },
      { icon: Sparkles, label: "Magic Up", href: "/magic-up" },
      { icon: Calculator, label: "Simulador", href: "/simulador" },
      { icon: Calculator, label: "Preços por Tiragem", href: "/simulador-precos" },
      { icon: DollarSign, label: "Busca por Preço", href: "/busca-preco" },
      { icon: Package, label: "Montador de Kits", href: "/montar-kit" },
    ],
  },
  {
    id: "carts",
    label: "Carrinhos",
    icon: ShoppingCart,
    defaultOpen: true,
    items: [
      { icon: Plus, label: "Novo Carrinho", href: "/carrinhos/novo", isCta: true },
      { icon: ShoppingCart, label: "Carrinhos", href: "/carrinhos", exact: true },
    ],
  },
  {
    id: "quotes",
    label: "Orçamentos",
    icon: FileText,
    defaultOpen: true,
    items: [
      { icon: Plus, label: "Novo Orçamento", href: "/orcamentos/novo", isCta: true },
      { icon: FileText, label: "Orçamentos", href: "/orcamentos", tourId: "quotes", exact: true },
    ],
  },
  {
    id: "my-items",
    label: "Meus Itens",
    icon: Star,
    defaultOpen: false,
    items: [
      { icon: Heart, label: "Favoritos", href: "/favoritos" },
      { icon: GitCompare, label: "Comparar", href: "/comparar" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    adminOnly: true,
    defaultOpen: false,
    items: [
      { icon: Users, label: "Usuários", href: "/admin/usuarios", adminOnly: true },
      { icon: ShieldCheck, label: "Segurança", href: "/admin/seguranca", adminOnly: true },
      { icon: FolderOpen, label: "Cadastros", href: "/admin/cadastros", adminOnly: true, children: [
        { icon: Package, label: "Produtos", href: "/admin/cadastros?tab=products" },
        { icon: Truck, label: "Fornecedores", href: "/admin/cadastros?tab=suppliers" },
        { icon: Palette, label: "Gravação", href: "/admin/cadastros?tab=personalizacao" },
      ]},
      { icon: Sparkles, label: "Prompts IA", href: "/admin/prompts-ia", adminOnly: true },
      { icon: Activity, label: "Telemetria", href: "/admin/telemetria", adminOnly: true },
    ],
  },
];

export const SidebarReorganized = React.forwardRef<HTMLElement, SidebarProps>(
  function SidebarReorganized({ isOpen, onToggle }, ref) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isItemActive = (href: string, exact?: boolean) => {
    if (href === "/" || exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      const hasActive = group.items.some((item) => isItemActive(item.href, item.exact));
      initial[group.id] = hasActive || (group.defaultOpen ?? false);
    });
    return initial;
  });
  const { isAdmin } = useAuth();

  // Auto-open only the group containing the active route, collapse others
  useEffect(() => {
    const newState: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      const hasActive = group.items.some((item) => isItemActive(item.href, item.exact));
      newState[group.id] = hasActive;
    });
    setOpenGroups(newState);
  }, [location.pathname]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const collapseAllGroups = () => {
    setOpenGroups((prev) => {
      const collapsed: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => {
        collapsed[key] = false;
      });
      return collapsed;
    });
  };

  const hasAnyGroupOpen = Object.values(openGroups).some(Boolean);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const filteredGroups = useMemo(
    () => navGroups.filter((g) => !g.adminOnly || isAdmin),
    [isAdmin]
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={ref}
        data-tour="sidebar"
        role="navigation"
        aria-label="Menu principal"
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out",
          isCollapsed ? "overflow-visible" : "overflow-hidden",
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn("flex flex-col h-full pt-16 lg:pt-0 min-h-0", isCollapsed && "overflow-visible")}>
          {/* Brand Header */}
          <SidebarBrandHeader isCollapsed={isCollapsed} />

          {/* Quick Search */}
          <SidebarQuickSearch isCollapsed={isCollapsed} />

          {/* Collapse controls (desktop) */}
          <div className="hidden lg:flex items-center justify-between px-2 mb-1">
            {!isCollapsed && hasAnyGroupOpen && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-[10px] border-sidebar-border/50 hover:bg-orange/10 hover:text-orange hover:border-orange/30 text-sidebar-foreground/40"
                onClick={collapseAllGroups}
              >
                <ChevronsDownUp className="h-3 w-3" />
                Fechar
              </Button>
            )}
            {!isCollapsed && !hasAnyGroupOpen && <div />}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-sidebar-accent/50 hover:text-orange ml-auto text-sidebar-foreground/30"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {/* Navigation Groups */}
          <nav
            className={cn(
              "flex-1 min-h-0 px-2 scrollbar-thin",
              isCollapsed ? "overflow-visible" : "overflow-y-auto",
              isCollapsed ? "space-y-0" : "space-y-0.5"
            )}
          >
            {filteredGroups.map((group, index) => (
              <div key={group.id}>
                {/* Separator between groups */}
                {index > 0 && !isCollapsed && (
                  <div className="my-2 mx-3 h-px bg-gradient-to-r from-transparent via-sidebar-border/50 to-transparent" />
                )}
                {index > 0 && isCollapsed && (
                  <div className="my-1 mx-auto w-1 h-1 rounded-full bg-sidebar-border/40" />
                )}
                <SidebarNavGroup
                  group={group}
                  isOpen={openGroups[group.id] ?? false}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleGroup(group.id)}
                  onMobileClose={onToggle}
                  isMobileSidebarOpen={isOpen}
                />
              </div>
            ))}
          </nav>

          {/* User Profile Footer */}
          <SidebarUserFooter isCollapsed={isCollapsed} />
        </div>
      </aside>
    </>
  );
  }
);
