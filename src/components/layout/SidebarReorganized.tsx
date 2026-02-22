import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Package, 
  Users, 
  Filter, 
  Heart, 
  GitCompare,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsDownUp,
  ShieldCheck,
  User,
  Cloud,
  Palette,
  Calculator,
  Wand2,
  Sparkles,
  FileText,
  ShoppingCart,
  Star,
  Wrench,
  Lock,
  Zap,
  PackagePlus,
  DollarSign,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/hooks/useRBAC";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavGroup {
  id: string;
  label: string;
  icon: typeof Package;
  items: NavItem[];
  defaultOpen?: boolean;
  adminOnly?: boolean;
}

interface NavItem {
  icon: typeof Package;
  label: string;
  href: string;
  tourId?: string;
  adminOnly?: boolean;
  requiredPermission?: { action: string; resource: string };
  badge?: string | number;
  isCta?: boolean;
  exact?: boolean;
}

// Reorganized navigation in 4 logical groups
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
      { icon: Package, label: "Dashboard Estoque", href: "/estoque" },
    ],
  },
  {
    id: "tools",
    label: "Ferramentas",
    icon: Wrench,
    defaultOpen: false,
    items: [
      { icon: Wand2, label: "Mockups", href: "/mockup-generator" },
      { icon: Sparkles, label: "Magic Up", href: "/magic-up" },
      { icon: Calculator, label: "Simulador", href: "/simulador" },
      { icon: Calculator, label: "Preços por Tiragem", href: "/simulador-precos" },
      { icon: DollarSign, label: "Busca por Preço", href: "/busca-preco" },
      { icon: Package, label: "Montador de Kits", href: "/montar-kit" },
    ],
  },
  {
    id: "quotes",
    label: "Orçamentos",
    icon: FileText,
    defaultOpen: true,
    items: [
      { icon: Plus, label: "Novo Orçamento", href: "/orcamentos/novo" },
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
      { icon: FolderOpen, label: "Cadastros", href: "/admin/cadastros", adminOnly: true },
      { icon: Sparkles, label: "Prompts IA", href: "/admin/prompts-ia", adminOnly: true },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { icon: User, label: "Meu Perfil", href: "/perfil" },
  { icon: Lock, label: "Segurança", href: "/seguranca" },
  { icon: Settings, label: "Configurações", href: "/configuracoes" },
];

export function SidebarReorganized({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      initial[group.id] = group.defaultOpen ?? false;
    });
    return initial;
  });
  const { isAdmin } = useAuth();
  const { hasPermission } = useRBAC();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const collapseAllGroups = () => {
    setOpenGroups((prev) => {
      const collapsed: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => { collapsed[key] = false; });
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

  const isItemActive = (href: string, exact?: boolean) => {
    if (href === "/" || exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const renderNavLink = (item: NavItem) => {
    // Ocultar itens admin se usuário não for admin/manager
    if (item.adminOnly && !isAdmin) return null;
    // Ocultar itens baseado em permissão específica
    if (item.requiredPermission && !hasPermission(item.requiredPermission.action, item.requiredPermission.resource)) return null;
    
    const isActive = isItemActive(item.href, item.exact);
    const Icon = item.icon;

    const linkContent = (
      <NavLink
        to={item.href}
        data-tour={item.tourId}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
          "hover:text-orange",
          isActive ? "text-orange font-medium" : "text-sidebar-foreground/70"
        )}
        onClick={() => isOpen && onToggle()}
      >
        <Icon className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "text-orange" : "group-hover:text-orange"
        )} />
        {!isCollapsed && (
          <span className="truncate">{item.label}</span>
        )}
        {!isCollapsed && item.badge && (
          <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>
            <div>{linkContent}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-card border-border">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  };

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
        data-tour="sidebar"
        role="navigation"
        aria-label="Menu principal"
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out",
          "lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex flex-col h-full pt-16 lg:pt-4">
          {/* Collapse toggle (desktop only) */}
          <div className="hidden lg:flex items-center justify-between px-2 mb-4">
            {!isCollapsed && hasAnyGroupOpen && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs border-sidebar-border hover:bg-orange/10 hover:text-orange hover:border-orange/30"
                onClick={collapseAllGroups}
              >
                <ChevronsDownUp className="h-3.5 w-3.5" />
                Closer
              </Button>
            )}
            {!isCollapsed && !hasAnyGroupOpen && <div />}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-orange/10 hover:text-orange ml-auto"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Main navigation with groups */}
          <nav className="flex-1 px-2 space-y-1 overflow-y-auto scrollbar-thin">
            {navGroups.map((group) => {
              // Hide admin-only groups for non-admins
              if (group.adminOnly && !isAdmin) return null;
              const GroupIcon = group.icon;
              const isGroupOpen = openGroups[group.id];
              const hasActiveItem = group.items.some((item) => isItemActive(item.href, item.exact));

              if (isCollapsed) {
                // When collapsed, just show the group items as flat list with tooltips
                return (
                  <div key={group.id} className="space-y-0.5">
                    {group.items.map(renderNavLink)}
                  </div>
                );
              }

              return (
                <Collapsible
                  key={group.id}
                  open={isGroupOpen}
                  onOpenChange={() => toggleGroup(group.id)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors",
                        "hover:bg-muted/50 text-sidebar-foreground/70",
                        hasActiveItem && "text-primary font-medium"
                      )}
                    >
                      <GroupIcon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left text-sm font-medium">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isGroupOpen && "rotate-180"
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
                    {group.items.map(renderNavLink)}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>

          {/* Bottom navigation */}
          <div className="px-2 py-4 border-t border-sidebar-border space-y-0.5">
            {bottomNavItems
              .filter((item) => !item.adminOnly || isAdmin)
              .map(renderNavLink)}
          </div>
        </div>
      </aside>
    </>
  );
}
