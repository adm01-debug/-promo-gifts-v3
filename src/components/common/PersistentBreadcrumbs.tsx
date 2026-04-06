import { forwardRef, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ChevronRight, Home, ArrowLeft } from "lucide-react";
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
  "/admin/temas": "Skins",
};

interface PersistentBreadcrumbsProps {
  className?: string;
  showHome?: boolean;
  showBackButton?: boolean;
  customItems?: BreadcrumbItem[];
}

export const PersistentBreadcrumbs = forwardRef<HTMLElement, PersistentBreadcrumbsProps>(function PersistentBreadcrumbs({ 
  className, 
  showHome = true,
  showBackButton = false,
  customItems 
}, ref) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleBack = useCallback(() => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);
  
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

  const isNotHome = location.pathname !== "/";
  
  return (
    <nav 
      ref={ref}
      aria-label="Breadcrumb" 
      className={cn(
        "flex items-center text-sm overflow-x-auto scrollbar-hide",
        "max-w-full gap-2",
        className
      )}
    >
      {showBackButton && isNotHome && (
        <button
          onClick={handleBack}
          aria-label="Voltar"
          className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
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