import { forwardRef } from "react";
import { Gift } from "lucide-react";

interface SidebarBrandHeaderProps {
  isCollapsed: boolean;
}

export const SidebarBrandHeader = forwardRef<HTMLDivElement, SidebarBrandHeaderProps>(
  ({ isCollapsed }, ref) => {
    if (isCollapsed) {
      return (
        <div ref={ref} className="flex flex-col items-center justify-center gap-4 py-4 mb-2">
          <div className="w-8 h-8 rounded-xl bg-[#3B82F6] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-[10px] font-bold text-white tracking-tight">PG</span>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="px-4 py-3 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <Gift className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
              Promo Gifts
            </span>
            <span className="text-[10px] text-sidebar-foreground/40 font-medium uppercase tracking-widest">
              Plataforma de Vendas
            </span>
          </div>
        </div>
      </div>
    );
  }
);

SidebarBrandHeader.displayName = "SidebarBrandHeader";

SidebarBrandHeader.displayName = "SidebarBrandHeader";
