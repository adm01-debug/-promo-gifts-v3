import React from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarQuickSearchProps {
  isCollapsed: boolean;
}

export const SidebarQuickSearch = React.forwardRef<HTMLDivElement, SidebarQuickSearchProps>(
  function SidebarQuickSearch({ isCollapsed }, ref) {
    const handleClick = () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
    };

    if (isCollapsed) {
      return (
        <div ref={ref} className="px-2 mb-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button aria-label="Buscar"
                onClick={handleClick}
                className="w-full flex items-center justify-center h-9 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
               aria-label="Buscar">
                <Search className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card border-border z-[100]">
              Busca rápida (⌘K)
            </TooltipContent>
          </Tooltip>
        </div>
      );
    }

    return (
      <div ref={ref} className="px-3 mb-3">
        <button
          onClick={handleClick}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg",
            "bg-sidebar-accent/40 hover:bg-sidebar-accent/70 transition-all duration-200",
            "text-sidebar-foreground/40 hover:text-sidebar-foreground/60",
            "border border-sidebar-border/30 hover:border-sidebar-border/60",
            "text-sm"
          )}
         aria-label="Buscar">
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium bg-sidebar-accent/80 px-1.5 py-0.5 rounded text-sidebar-foreground/30">
            ⌘K
          </kbd>
        </button>
      </div>
    );
  }
);
