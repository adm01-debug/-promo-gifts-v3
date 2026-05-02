import { forwardRef, useState, useEffect } from "react";
import { Gift, Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarBrandHeaderProps {
  isCollapsed: boolean;
}

export const SidebarBrandHeader = forwardRef<HTMLDivElement, SidebarBrandHeaderProps>(
  ({ isCollapsed }, ref) => {
    const [themeType, setThemeType] = useState<"standard" | "ultra">("standard");

    useEffect(() => {
      if (themeType === "ultra") {
        document.documentElement.style.setProperty("--bg-override", "24 40% 1%");
      } else {
        document.documentElement.style.removeProperty("--bg-override");
      }
    }, [themeType]);

    if (isCollapsed) {
      return (
        <div ref={ref} className="flex flex-col items-center justify-center gap-4 py-4 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-foreground tracking-tight">PG</span>
          </div>
          <button 
            onClick={() => setThemeType(t => t === "standard" ? "ultra" : "standard")}
            className="p-1.5 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/40"
            title={themeType === "standard" ? "Alternar para Ultra Dark" : "Alternar para Dark Padrão"}
          >
            {themeType === "standard" ? <Moon className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5 text-orange" />}
          </button>
        </div>
      );
    }

    return (
      <div ref={ref} className="px-4 py-3 mb-2 space-y-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
            <Gift className="h-4.5 w-4.5 text-primary-foreground" />
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

        <div className="flex items-center gap-1 p-1 bg-sidebar-background/50 rounded-lg border border-sidebar-border/50">
          <button
            onClick={() => setThemeType("standard")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-medium rounded-md transition-all",
              themeType === "standard" ? "bg-sidebar-background text-orange shadow-sm" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
            )}
          >
            <Moon className="h-3 w-3" />
            <span>Dark</span>
          </button>
          <button
            onClick={() => setThemeType("ultra")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-medium rounded-md transition-all",
              themeType === "ultra" ? "bg-sidebar-background text-orange shadow-sm" : "text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
            )}
          >
            <Monitor className="h-3 w-3" />
            <span>Ultra</span>
          </button>
        </div>
      </div>
    );
  }
);

SidebarBrandHeader.displayName = "SidebarBrandHeader";
