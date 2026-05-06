import React, { forwardRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { getPrefetchHandlers } from '@/lib/routePrefetch';
import { isDevOnlyPath, isAdminOnlyPath } from '@/lib/navigation/restricted-routes';
import { isNavItemActive } from '@/lib/navigation/active-match';

export interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  tourId?: string;
  adminOnly?: boolean;
  /** Restrito ao papel `dev` — rotas técnicas/infra. */
  devOnly?: boolean;
  requiredPermission?: { action: string; resource: string };
  badge?: string | number;

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
  /** Grupo inteiro restrito a `dev`. */
  devOnly?: boolean;
}

interface SidebarNavGroupProps {
  group: NavGroup;
  isOpen: boolean;
  isCollapsed: boolean;
  /** Receives the next open state from Radix Collapsible. */
  onToggle: (next: boolean) => void;
  onMobileClose: () => void;
  isMobileSidebarOpen: boolean;
}

export const SidebarNavGroup = forwardRef<HTMLDivElement, SidebarNavGroupProps>(
  function SidebarNavGroup(
    { group, isOpen, isCollapsed, onToggle, onMobileClose, isMobileSidebarOpen },
    _ref,
  ) {
    const location = useLocation();
    const { isAdmin, isDev } = useAuth();
    const { hasPermission } = useRBAC();

    const isItemActive = (href: string, exact?: boolean) => {
      // Hrefs with query params (e.g. /admin/cadastros?tab=products): match
      // both pathname and search exactly — query items are leaf navigation.
      if (href.includes('?')) {
        const [path, search] = href.split('?');
        return location.pathname === path && location.search === `?${search}`;
      }
      // Delegate to SSOT: prefix-aware matching that avoids false positives
      // like "/orcamentos" matching "/orcamentos-publicos".
      return isNavItemActive(location.pathname, href, exact);
    };

    const hasActiveItem = group.items.some((item) => isItemActive(item.href, item.exact));
    const GroupIcon = group.icon;
    const groupToggleLabel = `${isOpen ? 'Recolher' : 'Expandir'} grupo ${group.label}`;

    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

    const toggleSubMenu = useCallback((label: string) => {
      setOpenSubMenus((prev) => ({ ...prev, [label]: !prev[label] }));
    }, []);

    // Auto-open sub-menus that contain active items
    React.useEffect(() => {
      group.items.forEach((item) => {
        if (item.children?.some((child) => isItemActive(child.href, child.exact))) {
          setOpenSubMenus((prev) => ({ ...prev, [item.label]: true }));
        }
      });
    }, [location.pathname]);

    const renderNavLink = (item: NavItem, depth = 0): React.ReactNode => {
      // 1) Flags declarativas
      if (item.devOnly && !isDev) return null;
      if (item.adminOnly && !isAdmin) return null;
      // 2) Defense-in-depth: SSOT por path. Garante que mesmo um item sem flag
      //    devOnly/adminOnly seja escondido se sua rota for técnica/admin e o
      //    usuário não tiver o papel — supervisor sem dev nunca enxerga rotas dev.
      if (item.href && isDevOnlyPath(item.href) && !isDev) return null;
      if (item.href && isAdminOnlyPath(item.href) && !isAdmin) return null;
      if (
        item.requiredPermission &&
        !hasPermission(item.requiredPermission.action, item.requiredPermission.resource)
      )
        return null;

      // If item has children, render as expandable sub-menu
      if (item.children && item.children.length > 0) {
        const hasActiveChild = item.children.some((child) => isItemActive(child.href, child.exact));
        const isSubOpen = openSubMenus[item.label] ?? hasActiveChild;
        const Icon = item.icon;

        return (
          <div key={item.label}>
            <button
              aria-expanded={openSubMenus[item.label]}
              aria-label={`Expandir ${item.label}`}
              onClick={() => toggleSubMenu(item.label)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 transition-all duration-150',
                'hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange/20 active:scale-[0.995]',
                hasActiveChild
                  ? 'bg-orange/[0.03] font-semibold text-orange before:absolute before:bottom-[20%] before:left-0 before:top-[20%] before:w-[1.5px] before:rounded-r-full before:bg-orange'
                  : 'text-sidebar-foreground/75 hover:text-sidebar-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  hasActiveChild ? 'text-orange' : 'group-hover:text-orange/70',
                )}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate text-left text-sm">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200',
                      isSubOpen && 'rotate-180',
                    )}
                  />
                </>
              )}
            </button>
            {isSubOpen && !isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-0.5 space-y-0.5 pl-4">
                  {item.children.map((child) => renderNavLink(child, depth + 1))}
                </div>
              </motion.div>
            )}
          </div>
        );
      }

      const isActive = isItemActive(item.href, item.exact);
      const Icon = item.icon;

      const prefetch = getPrefetchHandlers(item.href);

      const linkContent = (
        <NavLink
          to={item.href}
          data-tour={item.tourId}
          aria-label={`${item.label}${item.shortcut ? ` (atalho ${item.shortcut.replace('Alt+', 'Alt mais ')})` : ''}`}
          className={cn(
            'group relative flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange/20 active:scale-[0.995]',
            'hover:bg-sidebar-accent/50',
            isActive
              ? 'bg-orange/[0.03] font-bold text-orange before:absolute before:bottom-[20%] before:left-0 before:top-[20%] before:w-[1.5px] before:rounded-r-full before:bg-orange'
              : 'text-sidebar-foreground/75 before:absolute before:left-0 before:top-1/2 before:h-0 before:w-[1.5px] before:-translate-y-1/2 before:rounded-r-full before:bg-orange/50 before:transition-all before:duration-150 hover:text-sidebar-foreground hover:before:h-3',
          )}
          onClick={() => isMobileSidebarOpen && onMobileClose()}
          onMouseEnter={prefetch.onMouseEnter}
          onTouchStart={prefetch.onTouchStart}
        >
          <Icon
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive ? 'text-orange' : 'group-hover:text-orange/70',
            )}
          />
          {!isCollapsed && <span className="flex-1 truncate text-sm">{item.label}</span>}
          {!isCollapsed && item.shortcut && (
            <kbd
              className="ml-auto hidden rounded bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-muted-foreground/40 lg:inline-block"
              aria-hidden="true"
            >
              {item.shortcut}
            </kbd>
          )}
          {!isCollapsed && item.badge != null && (
            <span className="ml-auto min-w-[20px] rounded-full bg-orange/15 px-1.5 py-0.5 text-center text-[10px] font-semibold text-orange">
              {item.badge}
            </span>
          )}
        </NavLink>
      );

      if (isCollapsed) {
        return (
          <TooltipProvider key={item.href}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>{linkContent}</div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="z-[100] border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <kbd
                      className="rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[9px] text-primary-foreground"
                      aria-hidden="true"
                    >
                      {item.shortcut}
                    </kbd>
                  )}
                  {item.badge != null && (
                    <span className="rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-bold text-orange-foreground">
                      {item.badge}
                    </span>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return <div key={item.href}>{linkContent}</div>;
    };

    // Collapsed mode: flat list with tooltips
    if (isCollapsed) {
      return <div className="space-y-0.5 py-1">{group.items.map(renderNavLink)}</div>;
    }

    return (
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button
            aria-expanded={isOpen}
            aria-label={groupToggleLabel}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange/15 active:scale-[0.995]',
              'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              hasActiveItem && 'bg-orange/[0.02] text-orange',
            )}
          >
            <GroupIcon
              className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                hasActiveItem ? 'text-orange' : 'text-sidebar-foreground/40',
              )}
            />
            <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wider">
              {group.label}
            </span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-sidebar-foreground/30 transition-transform duration-300',
                isOpen && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>

        {isOpen && (
          <CollapsibleContent forceMount>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-0.5 pb-1 pl-3">{group.items.map(renderNavLink)}</div>
            </motion.div>
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  },
);

SidebarNavGroup.displayName = 'SidebarNavGroup';
