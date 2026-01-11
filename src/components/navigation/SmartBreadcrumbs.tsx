import { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Route configuration for readable names and icons
const routeConfig: Record<string, { label: string; icon?: React.ComponentType<{ className?: string }> }> = {
  "": { label: "Início", icon: Home },
  "dashboard": { label: "Dashboard" },
  "produtos": { label: "Catálogo de Produtos" },
  "produto": { label: "Produto" },
  "clientes": { label: "Clientes" },
  "cliente": { label: "Cliente" },
  "orcamentos": { label: "Orçamentos" },
  "orcamento": { label: "Orçamento" },
  "novo": { label: "Novo" },
  "editar": { label: "Editar" },
  "pedidos": { label: "Pedidos" },
  "pedido": { label: "Pedido" },
  "configuracoes": { label: "Configurações" },
  "perfil": { label: "Meu Perfil" },
  "seguranca": { label: "Segurança" },
  "usuarios": { label: "Usuários" },
  "empresas": { label: "Empresas" },
  "empresa": { label: "Empresa" },
  "mockup": { label: "Gerador de Mockup" },
  "simulador": { label: "Simulador de Preços" },
  "relatorios": { label: "Relatórios" },
  "expert": { label: "Especialista IA" },
  "admin": { label: "Administração" },
  "novidades": { label: "Novidades" },
  "tecnicas": { label: "Técnicas" },
  "grupos": { label: "Grupos de Produtos" },
  "cores": { label: "Cores" },
};

interface SmartBreadcrumbsProps {
  className?: string;
  maxItems?: number;
  showHome?: boolean;
}

export function SmartBreadcrumbs({ 
  className, 
  maxItems = 4,
  showHome = true 
}: SmartBreadcrumbsProps) {
  const location = useLocation();
  
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    
    const items = pathSegments.map((segment, index) => {
      const path = "/" + pathSegments.slice(0, index + 1).join("/");
      const config = routeConfig[segment.toLowerCase()] || { label: segment };
      
      // Check if it's a UUID (for dynamic routes)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      
      return {
        label: isUuid ? "Detalhes" : config.label,
        path,
        isLast: index === pathSegments.length - 1,
        icon: config.icon,
      };
    });
    
    // Add home if needed
    if (showHome && items.length > 0) {
      items.unshift({
        label: "Início",
        path: "/",
        isLast: false,
        icon: Home,
      });
    }
    
    return items;
  }, [location.pathname, showHome]);
  
  // If only home or empty, don't show breadcrumbs
  if (breadcrumbs.length <= 1) {
    return null;
  }
  
  // Truncate if too many items
  const displayItems = useMemo(() => {
    if (breadcrumbs.length <= maxItems) {
      return breadcrumbs;
    }
    
    // Show first, ellipsis, and last items
    return [
      breadcrumbs[0],
      { label: "...", path: "", isLast: false, isEllipsis: true },
      ...breadcrumbs.slice(-2),
    ];
  }, [breadcrumbs, maxItems]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Breadcrumb>
        <BreadcrumbList>
          {displayItems.map((item, index) => (
            <BreadcrumbItem key={item.path || index}>
              {index > 0 && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                </BreadcrumbSeparator>
              )}
              
              {"isEllipsis" in item && item.isEllipsis ? (
                <span className="text-muted-foreground px-1">...</span>
              ) : item.isLast ? (
                <BreadcrumbPage className="flex items-center gap-1.5 font-medium text-foreground">
                  {item.icon && <item.icon className="h-3.5 w-3.5" />}
                  <span className="max-w-[150px] truncate">{item.label}</span>
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link 
                    to={item.path} 
                    className={cn(
                      "flex items-center gap-1.5 text-muted-foreground",
                      "hover:text-foreground transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                    )}
                  >
                    {item.icon && <item.icon className="h-3.5 w-3.5" />}
                    <span className="max-w-[120px] truncate">{item.label}</span>
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </motion.div>
  );
}

/**
 * Hook to get current page info for "You are here" indicator
 */
export function useCurrentPageInfo() {
  const location = useLocation();
  
  return useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || "";
    const config = routeConfig[lastSegment.toLowerCase()];
    
    // Check if it's a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastSegment);
    
    return {
      label: isUuid ? "Detalhes" : (config?.label || lastSegment || "Início"),
      path: location.pathname,
      isHome: location.pathname === "/",
    };
  }, [location.pathname]);
}

/**
 * You Are Here indicator component
 */
interface YouAreHereProps {
  className?: string;
}

export function YouAreHere({ className }: YouAreHereProps) {
  const { label } = useCurrentPageInfo();
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-primary/10 text-primary text-sm font-medium",
        "border border-primary/20",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
      </span>
      <span>Você está em: {label}</span>
    </motion.div>
  );
}
