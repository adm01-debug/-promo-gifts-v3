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
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange to-orange-hover flex items-center justify-center shadow-lg shadow-orange/20">
            <Gift className="h-5 w-5 text-orange-foreground" />
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="px-4 py-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange to-orange-hover flex items-center justify-center shadow-lg shadow-orange/20 shrink-0">
            <Gift className="h-5 w-5 text-orange-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
              Gift Store
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
