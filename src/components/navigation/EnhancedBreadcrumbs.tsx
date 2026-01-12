import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  Home,
  Package,
  Palette,
  FileText,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  children?: { label: string; href: string }[];
}

interface EnhancedBreadcrumbsProps {
  items?: BreadcrumbItem[];
  maxVisible?: number;
  showHomeIcon?: boolean;
  className?: string;
}

const routeConfig: Record<string, { label: string; icon?: React.ReactNode; parent?: string }> = {
  "/": { label: "Início", icon: <Home className="h-4 w-4" /> },
  "/mockup": { label: "Mockups", icon: <Palette className="h-4 w-4" />, parent: "/" },
  "/simulador-precos": { label: "Simulador", icon: <Package className="h-4 w-4" />, parent: "/" },
  "/orcamentos": { label: "Orçamentos", icon: <FileText className="h-4 w-4" />, parent: "/" },
  "/orcamentos/novo": { label: "Novo Orçamento", parent: "/orcamentos" },
  "/pedidos": { label: "Pedidos", icon: <Package className="h-4 w-4" />, parent: "/" },
  "/empresas": { label: "Empresas", parent: "/" },
  "/favoritos": { label: "Favoritos", parent: "/" },
  "/configuracoes": { label: "Configurações", icon: <Settings className="h-4 w-4" />, parent: "/" },
};

export function EnhancedBreadcrumbs({
  items: customItems,
  maxVisible = 4,
  showHomeIcon = true,
  className,
}: EnhancedBreadcrumbsProps) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const items = useMemo(() => {
    if (customItems) return customItems;

    const pathItems: BreadcrumbItem[] = [];
    let currentPath = location.pathname;

    // Build breadcrumb chain from current path up to root
    while (currentPath && currentPath !== "") {
      const config = routeConfig[currentPath];
      if (config) {
        pathItems.unshift({
          label: config.label,
          href: currentPath === location.pathname ? undefined : currentPath,
          icon: config.icon,
        });
        currentPath = config.parent || "";
      } else {
        // Handle dynamic routes
        const segments = currentPath.split("/").filter(Boolean);
        if (segments.length > 0) {
          pathItems.unshift({
            label: segments[segments.length - 1],
            href: currentPath === location.pathname ? undefined : currentPath,
          });
        }
        currentPath = "/" + segments.slice(0, -1).join("/");
        if (currentPath === "/") currentPath = "";
      }
    }

    // Always start with home if not already there
    if (pathItems.length === 0 || pathItems[0].href !== "/") {
      pathItems.unshift({
        label: "Início",
        href: location.pathname === "/" ? undefined : "/",
        icon: showHomeIcon ? <Home className="h-4 w-4" /> : undefined,
      });
    }

    return pathItems;
  }, [location.pathname, customItems, showHomeIcon]);

  // Don't show on home page
  if (location.pathname === "/" || location.pathname === "/login") {
    return null;
  }

  // Determine which items to show
  const shouldCollapse = items.length > maxVisible;
  const visibleItems = shouldCollapse && !isExpanded
    ? [items[0], ...items.slice(-2)]
    : items;
  const collapsedItems = shouldCollapse && !isExpanded
    ? items.slice(1, -2)
    : [];

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {visibleItems.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === visibleItems.length - 1;
          const showCollapsedTrigger = isFirst && collapsedItems.length > 0;

          return (
            <motion.li
              key={item.label + index}
              className="flex items-center gap-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {!isFirst && (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}

              {/* Collapsed items dropdown */}
              {showCollapsedTrigger && (
                <>
                  <BreadcrumbLink item={item} isLast={false} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">
                          {collapsedItems.length} more items
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {collapsedItems.map((collapsed, i) => (
                        <DropdownMenuItem key={i} asChild>
                          <Link to={collapsed.href || "#"}>
                            {collapsed.icon}
                            <span className="ml-2">{collapsed.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {/* Regular breadcrumb item */}
              {!showCollapsedTrigger && (
                <BreadcrumbLink item={item} isLast={isLast} />
              )}
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
}

function BreadcrumbLink({
  item,
  isLast,
}: {
  item: BreadcrumbItem;
  isLast: boolean;
}) {
  // Item with children - show dropdown
  if (item.children && item.children.length > 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1",
              isLast ? "font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.icon}
            <span className="max-w-[150px] truncate">{item.label}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {item.children.map((child, i) => (
            <DropdownMenuItem key={i} asChild>
              <Link to={child.href}>{child.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Regular link
  if (item.href) {
    return (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-muted/50 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary/50"
        )}
      >
        {item.icon}
        <span className="max-w-[150px] truncate">{item.label}</span>
      </Link>
    );
  }

  // Current page (no link)
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 px-2 py-1",
        "text-foreground font-medium"
      )}
      aria-current="page"
    >
      {item.icon}
      <span className="max-w-[200px] truncate">{item.label}</span>
    </span>
  );
}

// Mobile-friendly breadcrumb (just shows back button)
export function MobileBreadcrumb({ className }: { className?: string }) {
  const location = useLocation();
  const config = routeConfig[location.pathname];

  if (!config?.parent) return null;

  const parentConfig = routeConfig[config.parent];

  return (
    <Link
      to={config.parent}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
    >
      <ChevronRight className="h-4 w-4 rotate-180" />
      <span>Voltar para {parentConfig?.label || "página anterior"}</span>
    </Link>
  );
}
