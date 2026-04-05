import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Gift } from "lucide-react";

interface SidebarBrandHeaderProps {
  isCollapsed: boolean;
}

export const SidebarBrandHeader = forwardRef<HTMLDivElement, SidebarBrandHeaderProps>(
  ({ isCollapsed }, ref) => {
    if (isCollapsed) {
      return (
        <div ref={ref} className="flex items-center justify-center px-2 py-3 mb-2">
          <span className="text-sm font-bold text-sidebar-foreground">PG</span>
        </div>
      );
    }

    return (
      <div ref={ref} className="px-4 py-3 mb-2">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
            Promo Gifts
          </span>
          <span className="text-[10px] text-sidebar-foreground/40 font-medium uppercase tracking-widest">
            Plataforma de Vendas
          </span>
        </div>
      </div>
    );
  }
);

SidebarBrandHeader.displayName = "SidebarBrandHeader";
