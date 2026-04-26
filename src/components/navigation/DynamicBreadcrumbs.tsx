import { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { canNavigateTo, isDevOnlyPath } from "@/lib/navigation/restricted-routes";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface DynamicBreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  className?: string;
}

// Route label mappings
const routeLabels: Record<string, string> = {
  "": "Início",
  "dashboard": "Dashboard",
  "catalogo": "Catálogo",
  "produto": "Detalhe do Produto",
  "produtos": "Produtos",
  "orcamentos": "Orçamentos",
  "novo": "Novo",
  "editar": "Editar",
  "detalhes": "Detalhes",
  "pedidos": "Pedidos",
  "clientes": "Clientes",
  "empresas": "Empresas",
  "contatos": "Contatos",
  "simulador": "Simulador",
  "mockup": "Mockup",
  "personalizacao": "Personalização",
  "colecoes": "Coleções",
  "favoritos": "Favoritos",
  "carrinhos": "Carrinhos",
  "configuracoes": "Configurações",
  "perfil": "Perfil",
  "seguranca": "Segurança",
  "relatorios": "Relatórios",
  "analytics": "Analytics",
  
  "admin": "Administração",
  "usuarios": "Usuários",
  "permissoes": "Permissões",
  "tecnicas": "Técnicas",
  "historico": "Histórico",
  "templates": "Templates",
  "aprovar": "Aprovar",
  "login": "Login",
  "registro": "Registro",
};

export function DynamicBreadcrumbs({ customItems, className }: DynamicBreadcrumbsProps) {
  const location = useLocation();
  const params = useParams();
  const { isDev, isAdmin } = useAuth();

  const breadcrumbs = useMemo(() => {
    if (customItems) return customItems;
    
    const pathSegments = location.pathname.split("/").filter(Boolean);
    
    // Always start with Home
    const items: BreadcrumbItem[] = [
      { label: "Início", href: "/", icon: <Home className="h-4 w-4" /> }
    ];
    
    let currentPath = "";
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Check if segment is a dynamic param (UUID or ID)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      const isNumericId = /^\d+$/.test(segment);
      
      if (isUuid || isNumericId) {
        const prevSegment = pathSegments[index - 1];
        
        // Para rotas de detalhe de produto (/produto/:id), o UUID é redundante
        // pois o segmento "produto" já mostra "Detalhe do Produto"
        if (prevSegment === "produto" || prevSegment === "produtos") {
          return; // Pular — não adicionar UUID ao breadcrumb
        }
        
        let label = "Detalhes";
        if (prevSegment === "orcamentos") label = `#${segment.slice(0, 8)}...`;
        else if (prevSegment === "pedidos") label = `Pedido`;
        else if (prevSegment === "clientes" || prevSegment === "empresas") label = `Cliente`;
        
        items.push({ label, href: currentPath });
      } else {
        // Use mapping or capitalize
        const label = routeLabels[segment] || 
          segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
        
        // Verificar se o próximo segmento é um UUID/ID que será omitido (ex: /produto/:id)
        const nextSegment = pathSegments[index + 1];
        const nextIsSkippedId = nextSegment && (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nextSegment) ||
          /^\d+$/.test(nextSegment)
        ) && (segment === "produto" || segment === "produtos");
        
        const isLastVisible = index >= pathSegments.length - 1 || nextIsSkippedId;
        
        items.push({ 
          label, 
          href: isLastVisible ? undefined : currentPath 
        });
      }
    });
    
    return items;
  }, [location.pathname, customItems]);
  
  // Don't show breadcrumbs on home or login pages
  if (location.pathname === "/" || location.pathname === "/login") {
    return null;
  }
  
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-1">
        {breadcrumbs.map((item, index) => (
          <motion.li 
            key={index}
            className="flex items-center gap-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            
            {item.href ? (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-muted/50 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50"
                )}
              >
                {item.icon}
                <span className="max-w-[150px] truncate">{item.label}</span>
              </Link>
            ) : (
              <span 
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1",
                  "text-foreground font-medium"
                )}
                aria-current="page"
              >
                {item.icon}
                <span className="max-w-[200px] truncate">{item.label}</span>
              </span>
            )}
          </motion.li>
        ))}
      </ol>
    </nav>
  );
}

// Compact version for mobile
export function CompactBreadcrumbs({ className }: { className?: string }) {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  
  if (pathSegments.length <= 1) return null;
  
  const parentPath = "/" + pathSegments.slice(0, -1).join("/");
  const parentLabel = routeLabels[pathSegments[pathSegments.length - 2]] || 
    pathSegments[pathSegments.length - 2];
  
  return (
    <Link
      to={parentPath}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-muted-foreground",
        "hover:text-foreground transition-colors",
        className
      )}
    >
      <ChevronRight className="h-4 w-4 rotate-180" />
      <span>Voltar para {parentLabel}</span>
    </Link>
  );
}
