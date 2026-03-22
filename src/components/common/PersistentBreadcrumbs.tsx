import { forwardRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: typeof Home;
}

const routeLabels: Record<string, string> = {
  "/": "Início",
  "/produtos": "Produtos",
  "/produto": "Detalhe do Produto",
  "/filtros": "Super Filtro",
  "/novidades": "Novidades",
  "/colecoes": "Coleções",
  
  "/orcamentos": "Orçamentos",
  "/pedidos": "Pedidos",
  "/simulador": "Simulador",
  "/simulador-precos": "Preços por Tiragem",
  "/mockup-generator": "Gerador de Mockups",
  "/magic-up": "Magic Up",
  "/favoritos": "Favoritos",
  "/comparar": "Comparar",
  "/perfil": "Meu Perfil",
  "/configuracoes": "Configurações",
  "/admin": "Administração",
  "/seguranca": "Segurança",
  "/estoque": "Dashboard de Estoque",
};

interface PersistentBreadcrumbsProps {
  className?: string;
  showHome?: boolean;
  customItems?: BreadcrumbItem[];
}

export const PersistentBreadcrumbs = forwardRef<HTMLElement, PersistentBreadcrumbsProps>(function PersistentBreadcrumbs({ 
  className, 
  showHome = true,
  customItems 
}, ref) {
  const location = useLocation();
  
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) return customItems;
    
    const items: BreadcrumbItem[] = [];
    const pathParts = location.pathname.split("/").filter(Boolean);
    
    if (location.pathname === "/" && showHome) {
      return [{ label: "Catálogo de Produtos", icon: Home }];
    }
    
    if (showHome && location.pathname !== "/") {
      items.push({ label: "Início", href: "/", icon: Home });
    }
    
    let currentPath = "";
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part);
      const isNumericId = /^\d+$/.test(part);
      
      if (isUuid || isNumericId) {
        const prevPart = pathParts[index - 1];
        if (prevPart === "produto" || prevPart === "produtos" || prevPart === "orcamentos") {
          return;
        }
        items.push({ label: `#${part.slice(0, 8)}...` });
      } else {
        const label = routeLabels[currentPath] || part.charAt(0).toUpperCase() + part.slice(1);
        const nextPart = pathParts[index + 1];
        const nextIsSkippedId = nextPart && (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nextPart) ||
          /^\d+$/.test(nextPart)
        ) && (part === "produto" || part === "produtos" || part === "orcamentos");
        
        const isLastVisible = index >= pathParts.length - 1 || nextIsSkippedId;
        items.push(isLastVisible ? { label } : { label, href: currentPath });
      }
    });
    
    return items;
  };
  
  const breadcrumbs = buildBreadcrumbs();
  if (breadcrumbs.length === 0) return null;
  
  return (
    <nav 
      ref={ref}
      aria-label="Breadcrumb" 
      className={cn(
        "flex items-center text-sm overflow-x-auto scrollbar-hide",
        "max-w-full",
        className
      )}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        {breadcrumbs.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <li key={`${item.href ?? item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
              
              {item.href ? (
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors",
                    "hover:underline underline-offset-4"
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span 
                  className={cn(
                    "flex items-center gap-1.5",
                    isLast ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
