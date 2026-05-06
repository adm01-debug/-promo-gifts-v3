import { forwardRef } from 'react';
import { Gift } from 'lucide-react';

interface SidebarBrandHeaderProps {
  isCollapsed: boolean;
}

export const SidebarBrandHeader = forwardRef<HTMLDivElement, SidebarBrandHeaderProps>(
  ({ isCollapsed }, ref) => {
    if (isCollapsed) {
      return (
        <div ref={ref} className="mb-2 flex flex-col items-center justify-center gap-4 py-4" data-testid="sidebar-brand-header">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3B82F6] shadow-lg shadow-primary/20">
            <span className="text-[10px] font-bold tracking-tight text-white">PG</span>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="mb-2 px-4 py-3" data-testid="sidebar-brand-header">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6] shadow-lg shadow-primary/20">
            <Gift className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              Promo Gifts
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">
              Plataforma de Vendas
            </span>
          </div>
        </div>
      </div>
    );
  },
);

SidebarBrandHeader.displayName = 'SidebarBrandHeader';

SidebarBrandHeader.displayName = 'SidebarBrandHeader';
