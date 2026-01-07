import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Package, 
  FileText, 
  Users, 
  MoreHorizontal,
  Heart,
  Wand2,
  BarChart3,
  ShoppingCart,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/a11y/VisuallyHidden";

interface NavItem {
  icon: typeof Home;
  label: string;
  href: string;
  ariaLabel?: string;
}

const mainNavItems: NavItem[] = [
  { icon: Home, label: "Início", href: "/", ariaLabel: "Ir para página inicial" },
  { icon: Package, label: "Produtos", href: "/filtros", ariaLabel: "Ver catálogo de produtos" },
  { icon: FileText, label: "Orçamentos", href: "/orcamentos", ariaLabel: "Gerenciar orçamentos" },
  { icon: Users, label: "Clientes", href: "/clientes", ariaLabel: "Ver lista de clientes" },
];

const moreNavItems: NavItem[] = [
  { icon: Heart, label: "Favoritos", href: "/favoritos" },
  { icon: Wand2, label: "Mockups", href: "/mockup-generator" },
  { icon: BarChart3, label: "Dashboard BI", href: "/bi" },
  { icon: ShoppingCart, label: "Pedidos", href: "/pedidos" },
  { icon: Settings, label: "Configurações", href: "/configuracoes" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border lg:hidden"
      role="navigation"
      aria-label="Navegação principal mobile"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      <div className="flex items-center justify-around h-14 sm:h-16 px-1 sm:px-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] sm:min-w-[64px] min-h-[44px] sm:min-h-[48px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all",
                "touch-manipulation tap-highlight-transparent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                "active:scale-95",
                active 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              aria-label={item.ariaLabel || item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5 sm:mb-1", active && "text-primary")} aria-hidden="true" />
              <span className="text-[9px] sm:text-[10px] font-medium leading-tight truncate max-w-[56px]">{item.label}</span>
            </NavLink>
          );
        })}

        {/* More menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] sm:min-w-[64px] min-h-[44px] sm:min-h-[48px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all",
                "touch-manipulation tap-highlight-transparent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                "active:scale-95",
                "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              aria-label="Mais opções"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
            >
              <MoreHorizontal className="h-5 w-5 sm:mb-1" aria-hidden="true" />
              <span className="text-[9px] sm:text-[10px] font-medium leading-tight">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
            <SheetTitle>
              <VisuallyHidden>Menu de navegação adicional</VisuallyHidden>
            </SheetTitle>
            <div className="py-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl transition-all",
                        "min-h-[80px] touch-manipulation",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        active 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-6 w-6 mb-2" aria-hidden="true" />
                      <span className="text-xs font-medium text-center">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
