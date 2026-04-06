import React, { forwardRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/hooks/useRBAC";
import { getPrefetchHandlers } from "@/lib/routePrefetch";

export interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  tourId?: string;
  adminOnly?: boolean;
  requiredPermission?: { action: string; resource: string };
  badge?: string | number;
  isCta?: boolean;
  exact?: boolean;
  children?: NavItem[];
  /** Keyboard shortcut hint (e.g. "Alt+P") */
  shortcut?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
  adminOnly?: boolean;
}

interface SidebarNavGroupProps {
  group: NavGroup;
  isOpen: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
  isMobileSidebarOpen: boolean;
}

export const SidebarNavGroup = forwardRef<HTMLDivElement, SidebarNavGroupProps>(function SidebarNavGroup({
  group,
  isOpen,
  isCollapsed,
  onToggle,
  onMobileClose,
  isMobileSidebarOpen,
}, _ref) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { hasPermission } = useRBAC();

  const isItemActive = (href: string, exact?: boolean) => {
    // Handle hrefs with query params (e.g. /admin/cadastros?tab=products)
    if (href.includes('?')) {
      const [path, search] = href.split('?');
      return location.pathname === path && location.search === `?${search}`;
    }
    if (href === "/" || exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const hasActiveItem = group.items.some((item) => isItemActive(item.href, item.exact));
  const GroupIcon = group.icon;
  const groupToggleLabel = `${isOpen ? 'Recolher' : 'Expandir'} grupo ${group.label}`;

  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

  const toggleSubMenu = useCallback((label: string) => {
    setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);

  // Auto-open sub-menus that contain active items
  React.useEffect(() => {
    group.items.forEach(item => {
      if (item.children?.some(child => isItemActive(child.href, child.exact))) {
        setOpenSubMenus(prev => ({ ...prev, [item.label]: true }));
      }
    });
  }, [location.pathname]);

  const renderNavLink = (item: NavItem, depth = 0): React.ReactNode => {
    if (item.adminOnly && !isAdmin) return null;
    if (item.requiredPermission && !hasPermission(item.requiredPermission.action, item.requiredPermission.resource)) return null;

    // If item has children, render as expandable sub-menu
    if (item.children && item.children.length > 0) {
      const hasActiveChild = item.children.some(child => isItemActive(child.href, child.exact));
      const isSubOpen = openSubMenus[item.label] ?? hasActiveChild;
      const Icon = item.icon;

      return (
        <div key={item.label}>
          <button
            aria-expanded={openSubMenus[item.label]}
            aria-label={`Expandir ${item.label}`}
            onClick={() => toggleSubMenu(item.label)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200 group",
              "hover:bg-sidebar-accent/50",
              hasActiveChild
                ? "text-orange font-medium"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                hasActiveChild ? "text-orange" : "group-hover:text-orange/70"
              )}
            />
            {!isCollapsed && (
              <>
                <span className="truncate text-sm flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200 text-sidebar-foreground/30",
                    isSubOpen && "rotate-180"
                  )}
                />
              </>
            )}
          </button>
          {isSubOpen && !isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pl-4 mt-0.5 space-y-0.5">
                {item.children.map(child => renderNavLink(child, depth + 1))}
              </div>
            </motion.div>
          )}
        </div>
      );
    }

    const isActive = isItemActive(item.href, item.exact);
    const Icon = item.icon;
    const isCta = item.isCta || item.href.includes("/novo");

    const prefetch = getPrefetchHandlers(item.href);

    const linkContent = (
      <NavLink
        to={item.href}
        data-tour={item.tourId}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
          isCta && !isActive && "bg-gradient-to-r from-orange/15 to-orange/5 border border-orange/30 hover:from-orange/25 hover:to-orange/10 hover:border-orange/50 hover:shadow-sm hover:shadow-orange/10",
          !isCta && "hover:bg-sidebar-accent/50",
          isActive
            ? "bg-orange/10 text-orange font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-orange"
            : !isCta && "text-sidebar-foreground/60 hover:text-sidebar-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-0 before:w-[2px] before:rounded-r-full before:bg-orange/50 before:transition-all before:duration-200 hover:before:h-4"
        )}
        onClick={() => isMobileSidebarOpen && onMobileClose()}
        onMouseEnter={prefetch.onMouseEnter}
        onTouchStart={prefetch.onTouchStart}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isActive ? "text-orange" : isCta ? "text-orange/70" : "group-hover:text-orange/70"
          )}
        />
        {!isCollapsed && (
          <span className={cn("truncate text-sm", isCta && !isActive && "text-orange/80 font-medium")}>
            {item.label}
          </span>
        )}
        {!isCollapsed && item.badge != null && (
          <span className="ml-auto bg-orange/15 text-orange text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
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
          <TooltipContent side="right" className="bg-card border-border z-[100]">
            <span>{item.label}</span>
            {item.badge != null && (
              <span className="ml-2 bg-orange/15 text-orange text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  };

  // Collapsed mode: flat list with tooltips
  if (isCollapsed) {
    return (
      <div className="space-y-0.5 py-1">
        {group.items.map(renderNavLink)}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          aria-expanded={isOpen}
          aria-label={groupToggleLabel}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200",
            "hover:bg-sidebar-accent/40 text-sidebar-foreground/50",
            hasActiveItem && "text-orange bg-orange/8 border border-orange/15"
          )}
        >
          <GroupIcon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              hasActiveItem ? "text-orange" : "text-sidebar-foreground/40"
            )}
          />
          <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wider">
            {group.label}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300 text-sidebar-foreground/30",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>

      {isOpen && (
        <CollapsibleContent forceMount>
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-3 mt-1 space-y-0.5 pb-1">
              {group.items.map(renderNavLink)}
            </div>
          </motion.div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
});

SidebarNavGroup.displayName = "SidebarNavGroup";
